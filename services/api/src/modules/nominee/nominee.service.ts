import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertNomineeDto } from './nominee.dto';

/**
 * Nominations - Cybrilla compliance point 4.
 *
 * The screen this backs previously displayed a hardcoded nominee ("Aarav Sharma", 100%,
 * a masked PAN) to every user, with no persistence of any kind. That is worse than an
 * empty state: it presents a fabricated instruction about who inherits the units as
 * though it were the investor's own record.
 *
 * Nothing here is pushed to the gateway yet. Cybrilla exposes no nominee resource -
 * /v2/nominees is a 404 and folio_defaults.nominee1..3 rejects every object shape with
 * a 500 on the UAT tenant - so each row carries fpSyncStatus and callers are told
 * plainly that the nomination is recorded with TechArtha and not yet with the AMC.
 */
@Injectable()
export class NomineeService {
  private readonly logger = new Logger(NomineeService.name);

  /** folio_defaults has exactly three nominee slots, so three is the ceiling. */
  static readonly MAX_NOMINEES = 3;

  constructor(private readonly prisma: PrismaService) {}

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
      registeredWithAmc: false,
      message:
        nominees.length === 0
          ? 'No nominee has been added yet.'
          : allocated === 100
            ? 'Your nomination is recorded with TechArtha. It is submitted to the AMC when your folio is created.'
            : `Your nominees account for ${allocated}% of your holding. Allocate the remaining ${100 - allocated}% to complete your nomination.`,
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
        // NOT_SUPPORTED rather than PENDING: there is no endpoint to retry against, so
        // a queue would spin forever. It flips to PENDING once the shape is known.
        fpSyncStatus: 'NOT_SUPPORTED',
      },
    });

    await this.audit(userId, 'NOMINEE_ADDED', nominee.id);
    return this.present(nominee);
  }

  async update(userId: string, nomineeId: string, dto: UpsertNomineeDto) {
    const nominee = await this.prisma.nominee.findFirst({ where: { id: nomineeId, userId } });
    if (!nominee) throw new NotFoundException('Nominee not found.');

    const dateOfBirth = this.parseDateOfBirth(dto.dateOfBirth);
    const guardian = this.resolveGuardian(dateOfBirth, dto);

    const others = await this.prisma.nominee.findMany({ where: { userId, NOT: { id: nomineeId } } });
    this.assertAllocationFits(others.reduce((s, n) => s + n.allocationPercentage, 0), dto.allocationPercentage);

    const updated = await this.prisma.nominee.update({
      where: { id: nomineeId },
      data: {
        fullName: dto.fullName.trim(),
        relationship: dto.relationship,
        dateOfBirth,
        allocationPercentage: dto.allocationPercentage,
        identityProofType: dto.identityProofType ?? null,
        identityProofNumber: this.normalizeProofNumber(dto),
        guardianName: guardian.guardianName,
        guardianRelationship: guardian.guardianRelationship,
      },
    });

    await this.audit(userId, 'NOMINEE_UPDATED', nomineeId);
    return this.present(updated);
  }

  async remove(userId: string, nomineeId: string) {
    const nominee = await this.prisma.nominee.findFirst({ where: { id: nomineeId, userId } });
    if (!nominee) throw new NotFoundException('Nominee not found.');

    await this.prisma.nominee.delete({ where: { id: nomineeId } });
    await this.audit(userId, 'NOMINEE_REMOVED', nomineeId);
    return { removed: true, id: nomineeId };
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
  private resolveGuardian(dateOfBirth: Date, dto: UpsertNomineeDto) {
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
      return digits;
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
