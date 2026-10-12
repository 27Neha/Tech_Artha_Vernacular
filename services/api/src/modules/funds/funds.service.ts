import { Injectable } from '@nestjs/common';
import { MFAPIProvider, FundSearchResult, FundDetails } from './mfapi.provider';

// MFAPI's search returns scheme names only, including schemes that stopped reporting NAVs
// (e.g. "UTI Large Cap Fund-Income Option", last NAV 0.00000 on 13-04-2007). Look up enough
// candidates to still fill a full page after the dead ones are dropped.
const SEARCH_CANDIDATE_POOL = 40;
const SEARCH_PAGE_SIZE = 20;

// Search results now carry the NAV that was used to vet them, so callers can render it
// without a second round-trip per row.
export type VettedFundSearchResult = FundSearchResult & { nav: string | null; navDate: string | null };

@Injectable()
export class FundsService {
  constructor(private readonly mfapiProvider: MFAPIProvider) {}

  async searchFunds(query: string): Promise<VettedFundSearchResult[]> {
    const results = await this.mfapiProvider.searchFunds(query);

    const candidates = await Promise.all(
      results.slice(0, SEARCH_CANDIDATE_POOL).map(async (fund) => {
        try {
          const nav = await this.mfapiProvider.getLatestNAV(fund.schemeCode);
          // A missing NAV record means the scheme has no NAV history at all - as dead as a 0.00000.
          return { ...fund, nav: nav?.nav ?? null, navDate: nav?.date ?? null, navKnown: true };
        } catch {
          // MFAPI was unreachable for this scheme. Keep it rather than silently hiding a live
          // fund behind a transient outage; only a NAV we actually read can condemn a fund.
          return { ...fund, nav: null, navDate: null, navKnown: false };
        }
      }),
    );

    return candidates
      .filter(({ nav, navKnown }) => (navKnown ? nav !== null && parseFloat(nav) > 0 : true))
      .slice(0, SEARCH_PAGE_SIZE)
      .map(({ navKnown, ...fund }) => fund);
  }

  async getFundDetails(schemeCode: string | number): Promise<FundDetails> {
    return this.mfapiProvider.getFundDetails(schemeCode);
  }

  async getLatestNAV(schemeCode: string | number): Promise<{ date: string; nav: string } | null> {
    return this.mfapiProvider.getLatestNAV(schemeCode);
  }
}
