import { Injectable } from '@nestjs/common';
import { MFAPIProvider, FundSearchResult, FundDetails } from './mfapi.provider';

@Injectable()
export class FundsService {
  constructor(private readonly mfapiProvider: MFAPIProvider) {}

  async searchFunds(query: string): Promise<FundSearchResult[]> {
    const results = await this.mfapiProvider.searchFunds(query);
    return results.slice(0, 20);
  }

  async getFundDetails(schemeCode: string | number): Promise<FundDetails> {
    return this.mfapiProvider.getFundDetails(schemeCode);
  }

  async getLatestNAV(schemeCode: string | number): Promise<{ date: string; nav: string } | null> {
    return this.mfapiProvider.getLatestNAV(schemeCode);
  }
}
