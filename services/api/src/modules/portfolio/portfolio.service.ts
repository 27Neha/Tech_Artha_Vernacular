import { Injectable } from '@nestjs/common';
import { HOLDINGS_METHOD, HoldingsService } from '../holdings/holdings.service';

/**
 * The investor's holdings and their value - Cybrilla compliance point 10.
 *
 * Every figure comes from Cybrilla's holdings report; nothing is computed from our own
 * order records or estimated. The method is returned with the figures so the screen can
 * say how they were arrived at.
 */
@Injectable()
export class PortfolioService {
  constructor(private readonly holdingsService: HoldingsService) {}

  async getPortfolio(userId: string) {
    const account = await this.holdingsService.accountFor(userId);
    if (!account) {
      return {
        status: 'NO_ACCOUNT',
        holdings: [],
        totals: { invested: 0, current: 0, gain: 0 },
        asOn: null,
        method: HOLDINGS_METHOD,
        message: 'You have not invested yet. Your holdings will appear here after your first purchase is allotted.',
      };
    }

    const holdings = await this.holdingsService.forAccount(account);
    if (holdings === null) {
      // Not zero: we do not know. Showing an empty portfolio for a failed read would
      // tell an investor their money is gone.
      return {
        status: 'UNAVAILABLE',
        holdings: [],
        totals: null,
        asOn: null,
        method: HOLDINGS_METHOD,
        message: 'We could not read your holdings just now. Please try again in a moment.',
      };
    }

    const asOn = holdings.map((h) => h.asOn).filter(Boolean).sort().pop() ?? null;
    return {
      status: 'OK',
      holdings,
      totals: HoldingsService.totals(holdings),
      asOn,
      method: HOLDINGS_METHOD,
      message:
        holdings.length > 0
          ? null
          : 'No units have been allotted yet. A purchase shows here once the fund house allots units, usually a day after payment.',
    };
  }
}
