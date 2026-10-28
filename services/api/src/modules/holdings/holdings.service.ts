import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CybrillaService } from '../cybrilla/cybrilla.service';

/** One scheme held in one folio, as shown on the portfolio and redemption screens. */
export type Holding = {
  folioNumber: string;
  schemeIsin: string;
  schemeName: string | null;
  units: number;
  redeemableUnits: number;
  nav: number | null;
  navDate: string | null;
  /** units x nav. Null when the gateway has not reported a NAV for the scheme yet. */
  marketValue: number | null;
  redeemableValue: number | null;
  investedValue: number | null;
  asOn: string | null;
};

/**
 * Shown with the figures so the investor knows where they come from (Cybrilla compliance
 * point 10). Nothing is estimated or projected: every number is the gateway's.
 */
export const HOLDINGS_METHOD =
  "Units are the balance recorded by the fund's registrar for each folio. Current value is units multiplied by the latest NAV published by the fund house. Invested amount is the total you have put in, less any withdrawals. Gain is current value minus invested amount. All figures come from Cybrilla's holdings report, as of the date shown.";

const num = (v: unknown) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

/**
 * The investor's holdings, from Cybrilla's holdings report - the single source for both
 * the portfolio and the redemption screen, so the two can never disagree.
 *
 * GET /v2/mf_folios carries no units at all, so it cannot be used for balances.
 */
@Injectable()
export class HoldingsService {
  private readonly logger = new Logger(HoldingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cybrilla: CybrillaService,
  ) {}

  /** The investment account, or null when the investor has not opened one yet. */
  async accountFor(userId: string) {
    const investorProfile = await this.prisma.fpInvestorProfile.findUnique({ where: { userId } });
    if (!investorProfile) return null;
    return this.prisma.fpMfInvestmentAccount.findFirst({ where: { investorProfileId: investorProfile.id } });
  }

  /**
   * Holdings for an account. Null means they could not be read - deliberately distinct
   * from an empty list, which means the investor holds nothing.
   */
  async forAccount(account: { id: string; fpAccountId: string; fpAccountOldId: number | null }): Promise<Holding[] | null> {
    try {
      const oldId = await this.accountOldId(account);
      if (oldId === null) return null;
      const report = await this.cybrilla.fetchHoldingsReport(oldId);
      return HoldingsService.normalise(report);
    } catch (e) {
      this.logger.warn(`Could not read holdings for ${account.fpAccountId}: ${(e as Error).message}`);
      return null;
    }
  }

  /** Flattens the report's folios[].schemes[] into one row per folio and scheme. */
  static normalise(report: any): Holding[] {
    const folios: any[] = Array.isArray(report?.folios) ? report.folios : [];
    return folios.flatMap((folio) =>
      (Array.isArray(folio?.schemes) ? folio.schemes : []).map((scheme: any) => ({
        folioNumber: String(folio.folio_number ?? ''),
        schemeIsin: scheme.isin,
        schemeName: scheme.name ?? null,
        units: num(scheme.holdings?.units) ?? 0,
        redeemableUnits: num(scheme.holdings?.redeemable_units) ?? 0,
        nav: num(scheme.nav?.value),
        navDate: scheme.nav?.as_on ?? null,
        marketValue: num(scheme.market_value?.amount),
        redeemableValue: num(scheme.market_value?.redeemable_amount),
        investedValue: num(scheme.invested_value?.amount),
        asOn: scheme.holdings?.as_on ?? scheme.market_value?.as_on ?? null,
      })),
    );
  }

  /** Totals across holdings. Null when any holding is missing the figure, rather than a partial sum. */
  static totals(holdings: Holding[]) {
    const sum = (pick: (h: Holding) => number | null) =>
      holdings.every((h) => pick(h) !== null) ? holdings.reduce((t, h) => t + (pick(h) as number), 0) : null;
    const invested = sum((h) => h.investedValue);
    const current = sum((h) => h.marketValue);
    return { invested, current, gain: invested !== null && current !== null ? current - invested : null };
  }

  /** The account's numeric id, stored when the account was opened or looked up once. */
  private async accountOldId(account: { id: string; fpAccountId: string; fpAccountOldId: number | null }) {
    if (account.fpAccountOldId != null) return account.fpAccountOldId;
    const remote = await this.cybrilla.fetchInvestmentAccount(account.fpAccountId);
    const oldId = Number(remote?.old_id);
    if (!Number.isInteger(oldId)) return null;
    await this.prisma.fpMfInvestmentAccount.update({ where: { id: account.id }, data: { fpAccountOldId: oldId } });
    return oldId;
  }
}
