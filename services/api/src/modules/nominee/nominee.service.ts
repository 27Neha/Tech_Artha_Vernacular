import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CybrillaService } from '../cybrilla/cybrilla.service';
import { UpsertNomineeDto } from './nominee.dto';

/** Our relationship values -> Cybrilla's related_party relationship enum. */
const GATEWAY_RELATIONSHIP: Record<string, string> = {
  spouse: 'spouse',
  son: 'son',
  daughter: 'daughter',
  father: 'father',
  mother: 'mother',
  brother: 'brother',
  sister: 'sister',
  grandson: 'grand_son',
  granddaughter: 'grand_daughter',
  grandfather: 'grand_father',
  grandmother: 'grand_mother',
  other: 'others',
};

/**
 * Nominations - Cybrilla compliance point 4.
 *
 * The screen this backs previously displayed a hardcoded nominee ("Aarav Sharma", 100%,
 * a masked PAN) to every user, with no persistence of any kind. That is worse than an
 * empty state: it presents a fabricated instruction about who inherits the units as
 * though it were the investor's own record.
 *
 * Nominations are registered with the gateway as Cybrilla documents it: each nominee is
 * a related_party, and the investment account's folio_defaults.nominee1..3 reference
 * those ids with an allocation and identity proof type each. (Earlier attempts sent the
 * nominee's details inline in folio_defaults, which the gateway rejected.)
 *
 * Registration needs an investment account and a nomination totalling 100%. Until both
 * exist the rows stay PENDING and the investor is told the nomination is recorded with
 * TechArtha and will be registered with the fund house.
 */
@Injectable()
export class NomineeService {
  private readonly logger = new Logger(NomineeService.name);

  /** folio_defaults has exactly three nominee slots, so three is the ceiling. */
  static readonly MAX_NOMINEES = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cybrilla: CybrillaService,
  ) {}

  async list(userId: string) {
    const nominees = await this.prisma.nominee.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    const allocated = nominees.reduce((sum, n) => sum + n.allocationPercentage, 0);

    return {
      nominees: nominees.map((n) => this.present(n)),
      allocatedPercentage: allocated,
      /**
       * A nomination is only a valid instruction when it accounts for the whole holding,
       * so this stays false at 40% and the UI can say what is missing.
       */
      isComplete: nominees.length > 0 && allocated === 100,
      remainingPercentage: Math.max(0, 100 - allocated),
      maxNominees: NomineeService.MAX_NOMINEES,
      registeredWithAmc: nominees.length > 0 && nominees.every((n) => n.fpSyncStatus === 'SYNCED'),
      message:
        nominees.length === 0
          ? 'No nominee has been added yet.'
          : allocated !== 100
            ? `Your nominees account for ${allocated}% of your holding. Allocate the remaining ${100 - allocated}% to complete your nomination.`
            : nominees.every((n) => n.fpSyncStatus === 'SYNCED')
              ? 'Your nomination is registered with the fund house.'
              : nominees.find((n) => n.fpSyncStatus === 'FAILED')?.fpSyncError
                ? `Your nomination could not be registered with the fund house: ${nominees.find((n) => n.fpSyncStatus === 'FAILED')!.fpSyncError}`
                : 'Your nomination is recorded with TechArtha. It is registered with the fund house when your investment account is opened.',
    };
  }

  async create(userId: string, dto: UpsertNomineeDto) {
    const existing = await this.prisma.nominee.findMany({ where: { userId } });
    if (existing.length >= NomineeService.MAX_NOMINEES) {
      throw new BadRequestException(
        `You can add up to ${NomineeService.MAX_NOMINEES} nominees. Remove one before adding another.`,
      );
    }

    const dateOfBirth = this.parseDateOfBirth(dto.dateOfBirth);
    const guardian = this.resolveGuardian(dateOfBirth, dto);
    this.assertAllocationFits(existing.reduce((s, n) => s + n.allocationPercentage, 0), dto.allocationPercentage);

    const nominee = await this.prisma.nominee.create({
      data: {
        userId,
        fullName: dto.fullName.trim(),
        relationship: dto.relationship,
        dateOfBirth,
        allocationPercentage: dto.allocationPercentage,
        identityProofType: dto.identityProofType ?? null,
        identityProofNumber: this.normalizeProofNumber(dto),
        guardianName: guardian.guardianName,
        guardianRelationship: guardian.guardianRelationship,
        fpSyncStatus: 'PENDING',
      },
    });

    await this.audit(userId, 'NOMINEE_ADDED', nominee.id);
    await this.syncToGateway(userId);
    return this.present((await this.prisma.nominee.findUnique({ where: { id: nominee.id } })) ?? nominee);
  }

  async update(userId: string, nomineeId: string, dto: UpsertNomineeDto) {
    const nominee = await this.prisma.nominee.findFirst({ where: { id: nomineeId, userId } });
    if (!nominee) throw new NotFoundException('Nominee not found.');

    const dateOfBirth = this.parseDateOfBirth(dto.dateOfBirth);
    // An edit that does not resend the identity proof (changing only the share, say)
    // keeps the one on record rather than clearing it.
    const keepsProof = !dto.identityProofNumber?.trim();
    const guardian = this.resolveGuardian(dateOfBirth, dto, keepsProof ? nominee.identityProofNumber : null);

    const others = await this.prisma.nominee.findMany({ where: { userId, NOT: { id: nomineeId } } });
    this.assertAllocationFits(others.reduce((s, n) => s + n.allocationPercentage, 0), dto.allocationPercentage);

    const updated = await this.prisma.nominee.update({
      where: { id: nomineeId },
      data: {
        fullName: dto.fullName.trim(),
        relationship: dto.relationship,
        dateOfBirth,
        allocationPercentage: dto.allocationPercentage,
        identityProofType: keepsProof ? nominee.identityProofType : (dto.identityProofType ?? null),
        identityProofNumber: keepsProof ? nominee.identityProofNumber : this.normalizeProofNumber(dto),
        guardianName: guardian.guardianName,
        guardianRelationship: guardian.guardianRelationship,
        // The registered related party describes the old details, so a new one is made.
        fpNomineeRef: null,
        fpSyncStatus: 'PENDING',
        fpSyncError: null,
      },
    });

    await this.audit(userId, 'NOMINEE_UPDATED', nomineeId);
    await this.syncToGateway(userId);
    return this.present((await this.prisma.nominee.findUnique({ where: { id: nomineeId } })) ?? updated);
  }

  async remove(userId: string, nomineeId: string) {
    const nominee = await this.prisma.nominee.findFirst({ where: { id: nomineeId, userId } });
    if (!nominee) throw new NotFoundException('Nominee not found.');

    await this.prisma.nominee.delete({ where: { id: nomineeId } });
    await this.audit(userId, 'NOMINEE_REMOVED', nomineeId);
    await this.syncToGateway(userId);
    return { removed: true, id: nomineeId };
  }

  /**
   * Registers the current nomination on the investor's investment account.
   *
   * Runs after every change and when the account is opened. It never throws: the
   * nomination is recorded with TechArtha either way, and a gateway refusal is stored on
   * the rows (fpSyncError) and shown to the investor rather than failing their edit.
   */
  async syncToGateway(userId: string): Promise<{ status: 'SYNCED' | 'PENDING' | 'FAILED'; message?: string }> {
    const nominees = await this.prisma.nominee.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    const investor = await this.prisma.fpInvestorProfile.findUnique({ where: { userId }, include: { mfAccounts: true } });
    const account = investor?.mfAccounts[0];
    const allocated = nominees.reduce((sum, n) => sum + n.allocationPercentage, 0);
    if (!investor?.fpProfileId || !account || nominees.length === 0 || allocated !== 100) {
      return { status: 'PENDING' };
    }

    try {
      const changes: Record<string, unknown> = {};
      for (const [index, nominee] of nominees.entries()) {
        let ref = nominee.fpNomineeRef;
        if (!ref) {
          const party = await this.cybrilla.createRelatedParty(this.relatedPartyBody(investor.fpProfileId, nominee));
          ref = party.id as string;
          await this.prisma.nominee.update({ where: { id: nominee.id }, data: { fpNomineeRef: ref } });
        }
        const slot = `nominee${index + 1}`;
        changes[slot] = ref;
        changes[`${slot}_allocation_percentage`] = nominee.allocationPercentage;
        // Mandatory for an adult nominee; a minor is identified through the guardian.
        if (!this.isMinor(nominee.dateOfBirth) && nominee.identityProofType) {
          changes[`${slot}_identity_proof_type`] = nominee.identityProofType;
        }
      }
      // Empty the slots no longer used, so a removed nominee is not left registered.
      for (let i = nominees.length + 1; i <= NomineeService.MAX_NOMINEES; i++) {
        changes[`nominee${i}`] = null;
        changes[`nominee${i}_allocation_percentage`] = null;
      }

      await this.cybrilla.updateFolioDefaults(account.fpAccountId, changes);
      await this.prisma.nominee.updateMany({ where: { userId }, data: { fpSyncStatus: 'SYNCED', fpSyncError: null } });
      await this.audit(userId, 'NOMINATION_REGISTERED', account.fpAccountId);
      return { status: 'SYNCED' };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'The nomination could not be registered.';
      this.logger.warn(`Nomination for ${userId} not registered: ${message}`);
      await this.prisma.nominee.updateMany({ where: { userId }, data: { fpSyncStatus: 'FAILED', fpSyncError: message } });
      return { status: 'FAILED', message };
    }
  }

  /** The related_party for one nominee, in the fields Cybrilla documents. */
  private relatedPartyBody(
    profileId: string,
    nominee: { fullName: string; relationship: string; dateOfBirth: Date; identityProofType: string | null; identityProofNumber: string | null; guardianName: string | null },
  ) {
    const minor = this.isMinor(nominee.dateOfBirth);
    return {
      profile: profileId,
      name: nominee.fullName,
      relationship: GATEWAY_RELATIONSHIP[nominee.relationship] ?? 'others',
      date_of_birth: nominee.dateOfBirth.toISOString().slice(0, 10),
      // PAN is accepted only for an adult; Aadhaar as its last four digits.
      ...(!minor && nominee.identityProofType === 'pan' && nominee.identityProofNumber ? { pan: nominee.identityProofNumber } : {}),
      ...(nominee.identityProofType === 'aadhaar' && nominee.identityProofNumber
        ? { aadhaar_number: nominee.identityProofNumber.slice(-4) }
        : {}),
      ...(minor && nominee.guardianName ? { guardian_name: nominee.guardianName } : {}),
    };
  }

  /**
   * A nomination that totals more than 100% is not a rounding problem, it is an
   * instruction the registrar cannot execute, so it is refused at the point of entry
   * rather than left for someone to discover at the folio stage.
   */
  private assertAllocationFits(allocatedByOthers: number, requested: number) {
    const total = allocatedByOthers + requested;
    if (total > 100) {
      const remaining = 100 - allocatedByOthers;
      throw new BadRequestException(
        remaining === 0
          ? 'Your nominees already account for 100%. Reduce an existing allocation first.'
          : `That would total ${total}%. You have ${remaining}% left to allocate.`,
      );
    }
  }

  /** A minor nominee cannot receive units directly, so a guardian is mandatory. */
  private resolveGuardian(dateOfBirth: Date, dto: UpsertNomineeDto, proofOnRecord: string | null = null) {
    if (!this.isMinor(dateOfBirth) && !dto.identityProofNumber?.trim() && !proofOnRecord) {
      // The gateway requires an identity proof type for every adult nominee.
      throw new BadRequestException("Add the nominee's PAN or Aadhaar number. It is required for a nominee who is 18 or older.");
    }
    if (!this.isMinor(dateOfBirth)) {
      // Cleared deliberately: a nominee who has since turned 18 must not keep a
      // guardian attached to the record.
      return { guardianName: null, guardianRelationship: null };
    }
    if (!dto.guardianName?.trim() || !dto.guardianRelationship) {
      throw new BadRequestException(
        'This nominee is under 18, so a guardian name and relationship are required.',
      );
    }
    return {
      guardianName: dto.guardianName.trim(),
      guardianRelationship: dto.guardianRelationship,
    };
  }

  private parseDateOfBirth(value: string) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Enter a valid date of birth.');
    if (parsed.getTime() > Date.now()) throw new BadRequestException('A date of birth cannot be in the future.');
    return parsed;
  }

  private isMinor(dateOfBirth: Date, now = new Date()) {
    // Whole years only: comparing month and day avoids the 365.25 drift that makes
    // someone born on 29 February a minor for an extra day.
    let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
    const monthDelta = now.getUTCMonth() - dateOfBirth.getUTCMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) age -= 1;
    return age < 18;
  }

  private normalizeProofNumber(dto: UpsertNomineeDto) {
    const raw = dto.identityProofNumber?.trim();
    if (!raw) return null;
    if (dto.identityProofType === 'pan') {
      const pan = raw.toUpperCase();
      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) throw new BadRequestException("Enter a valid PAN, for example ABCDE1234F.");
      return pan;
    }
    if (dto.identityProofType === 'aadhaar') {
      const digits = raw.replace(/\s/g, '');
      if (!/^\d{12}$/.test(digits)) throw new BadRequestException('Enter a valid 12-digit Aadhaar number.');
      // Only the last four digits are kept: that is all the gateway takes, and a third
      // party's full Aadhaar number is not something to hold.
      return digits.slice(-4);
    }
    throw new BadRequestException('Choose whether the identification is a PAN or an Aadhaar number.');
  }

  /**
   * Never returns a full PAN or Aadhaar. The client only needs enough to recognise which
   * document was given, and an identifier belonging to a third party who is not the one
   * using the app should not be re-sent to the device in full.
   */
  private present(nominee: {
    id: string;
    fullName: string;
    relationship: string;
    dateOfBirth: Date;
    allocationPercentage: number;
    identityProofType: string | null;
    identityProofNumber: string | null;
    guardianName: string | null;
    guardianRelationship: string | null;
    fpSyncStatus: string;
  }) {
    return {
      id: nominee.id,
      fullName: nominee.fullName,
      relationship: nominee.relationship,
      dateOfBirth: nominee.dateOfBirth.toISOString().slice(0, 10),
      allocationPercentage: nominee.allocationPercentage,
      identityProofType: nominee.identityProofType,
      identityProofMasked: nominee.identityProofNumber
        ? `${'•'.repeat(Math.max(0, nominee.identityProofNumber.length - 4))}${nominee.identityProofNumber.slice(-4)}`
        : null,
      isMinor: this.isMinor(nominee.dateOfBirth),
      guardianName: nominee.guardianName,
      guardianRelationship: nominee.guardianRelationship,
      registeredWithAmc: nominee.fpSyncStatus === 'SYNCED',
    };
  }

  private async audit(userId: string, action: string, nomineeId: string) {
    await this.prisma.auditLog.create({
      data: { userId, action, details: JSON.stringify({ nomineeId }) },
    });
  }
}
