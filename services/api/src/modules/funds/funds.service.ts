import { BadGatewayException, Injectable } from '@nestjs/common';

type Fund = { schemeCode: number; schemeName: string };

@Injectable()
export class FundsService {
  private readonly mfApiBaseUrl = process.env.MFAPI_BASE_URL ?? 'https://api.mfapi.in';
  private readonly cache = new Map<string, { expiresAt: number; items: Fund[] }>();

  async searchFunds(query: string): Promise<Fund[]> {
    const cacheKey = query.trim().toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.items;
    try { 
      const response = await fetch(`${this.mfApiBaseUrl}/mf/search?q=${encodeURIComponent(query)}`); 
      if (!response.ok) throw new Error(); 
      const items = ((await response.json()) as Fund[]).slice(0, 20);
      this.cache.set(cacheKey, { items, expiresAt: Date.now() + 5 * 60 * 1000 });
      return items;
    } catch { 
      throw new BadGatewayException('Fund data is temporarily unavailable.'); 
    }
  }
}
