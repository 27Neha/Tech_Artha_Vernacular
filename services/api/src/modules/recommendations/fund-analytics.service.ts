import { Injectable } from '@nestjs/common';

export interface FundAnalytics {
  return1Y: number | null;
  cagr3Y: number | null;
  cagr5Y: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
  consistency: number | null; // % of positive rolling 1Y periods
  sharpeRatio: number | null;
  historyYears: number;
}

@Injectable()
export class FundAnalyticsService {
  calculate(normalizedNavs: {date: string, nav: string, parsedDate: Date}[]): FundAnalytics | null {
    if (normalizedNavs.length < 2) return null;

    const latest = normalizedNavs[0];
    const oldest = normalizedNavs[normalizedNavs.length - 1];
    const historyYears = (latest.parsedDate.getTime() - oldest.parsedDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    const getNavAtYearsAgo = (years: number) => {
      const targetDate = new Date(latest.parsedDate);
      targetDate.setFullYear(targetDate.getFullYear() - years);
      
      let closest = null;
      let minDiff = 30 * 24 * 60 * 60 * 1000;
      for (const item of normalizedNavs) {
        const diff = Math.abs(item.parsedDate.getTime() - targetDate.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          closest = parseFloat(item.nav);
        }
      }
      return closest;
    };

    const navLatest = parseFloat(latest.nav);
    const nav1Y = getNavAtYearsAgo(1);
    const nav3Y = getNavAtYearsAgo(3);
    const nav5Y = getNavAtYearsAgo(5);

    const return1Y = nav1Y ? ((navLatest - nav1Y) / nav1Y) * 100 : null;
    const cagr3Y = nav3Y ? (Math.pow(navLatest / nav3Y, 1/3) - 1) * 100 : null;
    const cagr5Y = nav5Y ? (Math.pow(navLatest / nav5Y, 1/5) - 1) * 100 : null;

    // Chronological processing
    const chronological = [...normalizedNavs].reverse();
    
    // Drawdown
    let maxDrawdown = 0;
    let peak = parseFloat(chronological[0].nav);
    
    // Calendar month grouping
    const monthlyMap = new Map<string, number>();
    
    for (const point of chronological) {
      const val = parseFloat(point.nav);
      // Drawdown logic
      if (val > peak) peak = val;
      const drawdown = ((peak - val) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      // Month grouping
      const d = point.parsedDate;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, val); // overwrites so we keep the last NAV of the month
    }

    const months = Array.from(monthlyMap.keys()).sort();
    const monthlyReturns: number[] = [];
    
    for (let i = 1; i < months.length; i++) {
      const prev = monthlyMap.get(months[i - 1])!;
      const curr = monthlyMap.get(months[i])!;
      monthlyReturns.push((curr - prev) / prev);
    }

    let volatility: number | null = null;
    let consistency: number | null = null;
    let sharpeRatio: number | null = null;

    if (monthlyReturns.length > 5) {
      const mean = monthlyReturns.reduce((sum, r) => sum + r, 0) / monthlyReturns.length;
      const variance = monthlyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (monthlyReturns.length - 1); 
      volatility = Math.sqrt(variance) * Math.sqrt(12) * 100;

      // Rolling 1Y Returns Consistency (using 12-month windows)
      if (monthlyReturns.length >= 12) {
        let positiveWindows = 0;
        let totalWindows = 0;
        for (let i = 11; i < monthlyReturns.length; i++) {
          let windowReturn = 1;
          for (let j = i - 11; j <= i; j++) {
            windowReturn *= (1 + monthlyReturns[j]);
          }
          windowReturn -= 1;
          if (windowReturn > 0) positiveWindows++;
          totalWindows++;
        }
        consistency = totalWindows > 0 ? (positiveWindows / totalWindows) * 100 : null;
      } else {
        // Fallback to positive months if history < 1Y
        const positiveMonths = monthlyReturns.filter(r => r > 0).length;
        consistency = (positiveMonths / monthlyReturns.length) * 100;
      }

      // Risk-Adjusted Performance (Sharpe Ratio proxy)
      const RISK_FREE_RATE = 5.0; // Explicit conservative assumption
      const activeReturn = cagr3Y || return1Y;
      if (activeReturn !== null && volatility > 0) {
        sharpeRatio = (activeReturn - RISK_FREE_RATE) / volatility;
      }
    }

    return {
      return1Y,
      cagr3Y,
      cagr5Y,
      volatility,
      maxDrawdown,
      consistency,
      sharpeRatio,
      historyYears
    };
  }
}
