import { BadGatewayException, Injectable } from '@nestjs/common';

export type FundSearchResult = { schemeCode: number; schemeName: string };
export type FundDetails = { meta: any; data: { date: string; nav: string }[]; status: string };

@Injectable()
export class MFAPIProvider {
  private readonly baseUrl = 'https://api.mfapi.in';
  
  private searchCache = new Map<string, { expiresAt: number; data: FundSearchResult[] }>();
  private detailsCache = new Map<string, { expiresAt: number; data: FundDetails }>();
  private navCache = new Map<string, { expiresAt: number; data: { date: string; nav: string } }>();

  async searchFunds(query: string): Promise<FundSearchResult[]> {
    const cacheKey = query.trim().toLowerCase();
    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    try {
      const response = await fetch(`${this.baseUrl}/mf/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error();
      const items = (await response.json()) as FundSearchResult[];
      this.searchCache.set(cacheKey, { data: items, expiresAt: Date.now() + 5 * 60 * 1000 });
      return items;
    } catch {
      throw new BadGatewayException('MFAPI Search unavailable');
    }
  }

  async getFundDetails(schemeCode: string | number): Promise<FundDetails> {
    const cacheKey = String(schemeCode);
    const cached = this.detailsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    try {
      const response = await fetch(`${this.baseUrl}/mf/${schemeCode}`);
      if (!response.ok) throw new Error();
      const data = (await response.json()) as FundDetails;
      this.detailsCache.set(cacheKey, { data, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
      return data;
    } catch {
      throw new BadGatewayException('MFAPI Details unavailable');
    }
  }

  async getLatestNAV(schemeCode: string | number): Promise<{ date: string; nav: string } | null> {
    const cacheKey = String(schemeCode);
    const cached = this.navCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    try {
      const details = await this.getFundDetails(schemeCode);
      const latestNav = details.data?.[0] ?? null;
      if (latestNav) {
          this.navCache.set(cacheKey, { data: latestNav, expiresAt: Date.now() + 60 * 60 * 1000 });
      }
      return latestNav;
    } catch {
      throw new BadGatewayException('MFAPI NAV unavailable');
    }
  }
}
