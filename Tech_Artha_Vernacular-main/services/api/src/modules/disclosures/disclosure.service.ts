import { Injectable } from '@nestjs/common';

const MARKET_RISK = 'Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing.';

@Injectable()
export class DisclosureService {
  marketRisk(locale = 'en') {
    return {
      key: 'MUTUAL_FUND_MARKET_RISK',
      version: '2026.08',
      locale,
      content: MARKET_RISK,
      status: 'PUBLISHED',
      note: 'Scheme Risk-o-Meter, charges, exit load and taxation must be sourced from authorised scheme documents before any proposal is displayed.',
    };
  }
}
