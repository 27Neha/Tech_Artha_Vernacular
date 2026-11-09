import { Injectable } from '@nestjs/common';

export enum DataQualityStatus {
  VALID_FRESH = 'VALID_FRESH',
  VALID_STALE = 'VALID_STALE',
  NAV_ZERO = 'NAV_ZERO',
  NAV_MISSING = 'NAV_MISSING',
  INSUFFICIENT_HISTORY = 'INSUFFICIENT_HISTORY',
  INVALID_DATA = 'INVALID_DATA'
}

@Injectable()
export class FundDataQualityService {
  normalizeNavs(navHistory: {date: string, nav: string}[]): {date: string, nav: string, parsedDate: Date}[] {
    if (!navHistory || !Array.isArray(navHistory)) return [];
    const valid = navHistory
      .map(item => ({ ...item, parsedDate: this.parseDate(item.date) }))
      .filter(item => !Number.isNaN(item.parsedDate.getTime()) && !Number.isNaN(parseFloat(item.nav)));
    
    // Sort descending (latest first)
    return valid.sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());
  }

  evaluate(normalizedNavs: {date: string, nav: string, parsedDate: Date}[]): { status: DataQualityStatus, freshnessDays: number, historyYears: number, confidence: number } {
    if (normalizedNavs.length === 0) {
      return { status: DataQualityStatus.NAV_MISSING, freshnessDays: 999, historyYears: 0, confidence: 0 };
    }

    const latest = normalizedNavs[0];
    if (parseFloat(latest.nav) <= 0) {
      return { status: DataQualityStatus.NAV_ZERO, freshnessDays: 0, historyYears: 0, confidence: 0 };
    }

    const freshnessDays = (Date.now() - latest.parsedDate.getTime()) / (1000 * 60 * 60 * 24);

    const oldest = normalizedNavs[normalizedNavs.length - 1];
    const historyYears = (latest.parsedDate.getTime() - oldest.parsedDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    let status = DataQualityStatus.VALID_FRESH;
    let confidence = 100;

    const staleThreshold = parseInt(process.env.FUND_NAV_STALE_DAYS || '45');

    if (freshnessDays > staleThreshold) {
      status = DataQualityStatus.VALID_STALE;
      confidence = 40;
    } else if (historyYears < 1.0) {
      status = DataQualityStatus.INSUFFICIENT_HISTORY;
      confidence = 60;
    }

    return { status, freshnessDays, historyYears, confidence };
  }

  private parseDate(dateStr: string): Date {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(dateStr);
  }
}
