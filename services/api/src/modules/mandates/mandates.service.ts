import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CybrillaService } from '../cybrilla/cybrilla.service';
import { resolveBankAccountOldId } from '../cybrilla/account-ids';

export const MANDATE_TYPES = ['UPI', 'E_MANDATE'] as const;
export type MandateType = (typeof MANDATE_TYPES)[number];

/** Gateway states after which a mandate will never become usable. */
const FINAL_STATES = new Set(['APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'FAILED']);

/**
 * Auto-debit mandates (UPI Autopay and e-NACH), which SIP instalments are collected
 * through. Cybrilla's purchase plan flow requires an APPROVED mandate as the plan's
 * payment_source before the plan can be confirmed.
 *
 * A mandate is set up against the bank account registered on the investment account,
 * so it needs the account to exist: the investor's first purchase is what opens it.
 */
@Injectable()
export class MandatesService {
  private readonly logger = new Logger(MandatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cybrilla: CybrillaService,
  ) {}

  private postbackUrl() {
    return process.env.MANDATE_POSTBACK_URL || 'techartha://mandate-complete';
  }

  private async accountFor(userId: string) {
    const investor = await this.prisma.fpInvestorProfile.findUnique({ where: { userId }, include: { mfAccounts: true } });
    return investor?.mfAccounts[0] ?? null;
  }

  /** The investor's mandates, with any that are still in progress refreshed from the gateway. */
  async list(userId: string) {
    const account = await this.accountFor(userId);
    if (!account) {
      return {
        canCreate: false,
        mandates: [],
        message: 'Make your first investment to open your investment account. You can then set up auto-debit for SIPs.',
      };
    }
    const rows = await this.prisma.fpMandate.findMany({ where: { accountId: account.id }, orderBy: { createdAt: 'desc' } });
    const mandates = await Promise.all(rows.map((m) => this.refresh(m)));
    return { canCreate: true, mandates: mandates.map((m) => this.present(m)), message: null };
  }

  /**
   * Creates a mandate and returns the page where the investor approves it with their
   * bank. The type and limit are the investor's choice; neither has a default.
   */
  async create(userId: string, input: { mandateType?: string; mandateLimit?: number }) {
    if (!input.mandateType || !(MANDATE_TYPES as readonly string[]).includes(input.mandateType)) {
      throw new BadRequestException('Choose UPI Autopay or e-NACH.');
    }
    const limit = Number(input.mandateLimit);
    if (!Number.isFinite(limit) || limit < 100) {
      throw new BadRequestException('Enter the most that may be debited per instalment (at least ₹100).');
    }
    const account = await this.accountFor(userId);
    if (!account) {
      throw new BadRequestException('Make your first investment to open your investment account, then set up auto-debit.');
    }
    const bankAccountId = await resolveBankAccountOldId(this.prisma, this.cybrilla, account, this.logger);
    if (bankAccountId === null) {
      throw new BadRequestException('Your bank account could not be found at the fund house. Please contact support.');
    }

    const created = await this.cybrilla.createMandate({ bankAccountId, mandateType: input.mandateType as MandateType, mandateLimit: limit });
    const fpMandateId = Number(created?.id);
    if (!Number.isInteger(fpMandateId)) throw new BadRequestException('The auto-debit mandate could not be created.');

    const auth = await this.cybrilla.authorizeMandate(fpMandateId, this.postbackUrl());
    const mandate = await this.prisma.fpMandate.create({
      data: {
        accountId: account.id,
        fpMandateId,
        mandateType: input.mandateType,
        mandateLimit: limit,
        status: 'CREATED',
        authorizationUrl: auth?.token_url ?? null,
      },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'MANDATE_CREATED', details: JSON.stringify({ fpMandateId, mandateType: input.mandateType, mandateLimit: limit }) },
    });
    return this.present(mandate);
  }

  /** A fresh authorisation page for a mandate the investor has not finished approving. */
  async reauthorize(userId: string, mandateId: string) {
    const account = await this.accountFor(userId);
    const mandate = account ? await this.prisma.fpMandate.findFirst({ where: { id: mandateId, accountId: account.id } }) : null;
    if (!mandate) throw new NotFoundException('Mandate not found.');
    const current = await this.refresh(mandate);
    if (FINAL_STATES.has(current.status)) {
      throw new BadRequestException(`This mandate is ${current.status.toLowerCase()} and cannot be authorised again.`);
    }
    const auth = await this.cybrilla.authorizeMandate(mandate.fpMandateId, this.postbackUrl());
    const updated = await this.prisma.fpMandate.update({ where: { id: mandate.id }, data: { authorizationUrl: auth?.token_url ?? null } });
    return this.present(updated);
  }

  /**
   * The approved mandate a SIP of this amount can collect through, or null. Used before
   * the SIP's code is consumed, so an investor without one is told before authorising.
   */
  async approvedFor(userId: string, amount: number) {
    const account = await this.accountFor(userId);
    if (!account) return null;
    const rows = await this.prisma.fpMandate.findMany({ where: { accountId: account.id }, orderBy: { createdAt: 'desc' } });
    for (const row of rows) {
      const m = await this.refresh(row);
      if (m.status === 'APPROVED' && m.mandateLimit >= amount) return m;
    }
    return null;
  }

  private async refresh<T extends { id: string; fpMandateId: number; status: string; umrn: string | null }>(mandate: T): Promise<T> {
    if (FINAL_STATES.has(mandate.status)) return mandate;
    try {
      const remote = await this.cybrilla.fetchMandate(mandate.fpMandateId);
      const status = String(remote?.mandate_status ?? mandate.status).toUpperCase();
      const umrn = remote?.umrn ?? mandate.umrn;
      if (status === mandate.status && umrn === mandate.umrn) return mandate;
      return (await this.prisma.fpMandate.update({ where: { id: mandate.id }, data: { status, umrn } })) as unknown as T;
    } catch {
      return mandate; // Gateway unreachable: show the last known state.
    }
  }

  private present(m: { id: string; mandateType: string; mandateLimit: number; status: string; umrn: string | null; authorizationUrl: string | null; createdAt: Date }) {
    return {
      id: m.id,
      mandateType: m.mandateType,
      mandateLimit: m.mandateLimit,
      status: m.status,
      umrn: m.umrn,
      // Offered only while it can still be completed.
      authorizationUrl: FINAL_STATES.has(m.status) ? null : m.authorizationUrl,
      createdAt: m.createdAt,
    };
  }
}
