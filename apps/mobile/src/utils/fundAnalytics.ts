export interface RawNavPoint {
  date: string; // DD-MM-YYYY from MFAPI
  nav: string;
}

export interface ParsedNavPoint {
  date: string;
  isoDate: string;
  timestamp: number;
  value: number;
}

export type FundChartRange = '1M' | '3M' | '6M' | '1Y' | '3Y' | 'ALL';

export interface ComputedFundMetrics {
  latestNav: number | null;
  latestDate: string | null;
  dayChangePercent: number | null;
  return1M: number | null;
  return6M: number | null;
  return1Y: number | null;
  cagr3Y: number | null;
  cagr5Y: number | null;
  high52W: number | null;
  low52W: number | null;
  annualizedVolatility: number | null;
  dataSpanYears: number;
}

export interface CategoryRiskIndicator {
  level: 'Low' | 'Moderate' | 'Moderately High' | 'High' | 'Very High';
  tier: 1 | 2 | 3 | 4 | 5;
  color: string;
  bg: string;
  note: string;
}

export interface SipProjectionPoint {
  year: number;
  invested: number;
  value: number;
}

export interface SipProjectionResult {
  totalInvested: number;
  estimatedValue: number;
  estimatedGain: number;
  points: SipProjectionPoint[];
}

export interface NormalizedRiskDisplay {
  key: 'CONSERVATIVE' | 'MODERATELY_LOW' | 'MODERATE' | 'MODERATELY_HIGH' | 'AGGRESSIVE';
  label: string;
  score: number;
  shortSummary: string;
  color: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Parses MFAPI `DD-MM-YYYY` dates into chronological ascending points.
 */
export function parseNavHistory(raw: RawNavPoint[] = []): ParsedNavPoint[] {
  const parsed: ParsedNavPoint[] = [];

  for (const item of raw) {
    if (!item?.date || item.nav == null) continue;
    const value = Number.parseFloat(item.nav);
    if (!Number.isFinite(value) || value <= 0) continue;

    const parts = item.date.split('-');
    if (parts.length !== 3) continue;

    const day = Number.parseInt(parts[0], 10);
    const month = Number.parseInt(parts[1], 10);
    const year = Number.parseInt(parts[2], 10);
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) continue;

    const dt = new Date(Date.UTC(year, month - 1, day));
    const ts = dt.getTime();
    if (!Number.isFinite(ts)) continue;

    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    parsed.push({
      date: item.date,
      isoDate,
      timestamp: ts,
      value,
    });
  }

  parsed.sort((a, b) => a.timestamp - b.timestamp);
  return parsed;
}

export function sliceNavByRange(
  series: ParsedNavPoint[],
  range: FundChartRange,
  maxPoints = 60,
): ParsedNavPoint[] {
  if (series.length === 0) return [];
  const latestTs = series[series.length - 1].timestamp;

  const daysBack: Record<FundChartRange, number | null> = {
    '1M': 31,
    '3M': 93,
    '6M': 186,
    '1Y': 366,
    '3Y': 365 * 3 + 1,
    ALL: null,
  };

  const lookback = daysBack[range];
  const filtered =
    lookback == null
      ? series
      : series.filter((pt) => pt.timestamp >= latestTs - lookback * DAY_MS);

  const source = filtered.length >= 2 ? filtered : series.slice(-Math.min(series.length, 30));
  if (source.length <= maxPoints) return source;

  const step = (source.length - 1) / (maxPoints - 1);
  const sampled: ParsedNavPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.min(source.length - 1, Math.round(i * step));
    sampled.push(source[idx]);
  }
  return sampled;
}

function findPointDaysBefore(series: ParsedNavPoint[], days: number): ParsedNavPoint | null {
  if (series.length < 2) return null;
  const latest = series[series.length - 1];
  const targetTs = latest.timestamp - days * DAY_MS;

  // Must actually span at least 85% of the requested horizon to avoid misleading extrapolation.
  if (series[0].timestamp > latest.timestamp - days * 0.85 * DAY_MS) {
    return null;
  }

  let closest = series[0];
  let minDiff = Math.abs(series[0].timestamp - targetTs);
  for (let i = 1; i < series.length; i++) {
    const diff = Math.abs(series[i].timestamp - targetTs);
    if (diff < minDiff) {
      minDiff = diff;
      closest = series[i];
    }
  }
  return closest;
}

/**
 * Computes real historical metrics strictly from published daily NAV points.
 * Returns `null` for horizons not covered by actual NAV history.
 */
export function computeFundMetrics(series: ParsedNavPoint[]): ComputedFundMetrics {
  if (series.length === 0) {
    return {
      latestNav: null,
      latestDate: null,
      dayChangePercent: null,
      return1M: null,
      return6M: null,
      return1Y: null,
      cagr3Y: null,
      cagr5Y: null,
      high52W: null,
      low52W: null,
      annualizedVolatility: null,
      dataSpanYears: 0,
    };
  }

  const latest = series[series.length - 1];
  const prev = series.length >= 2 ? series[series.length - 2] : null;
  const dayChangePercent =
    prev && prev.value > 0 ? ((latest.value - prev.value) / prev.value) * 100 : null;

  const pt1M = findPointDaysBefore(series, 30);
  const pt6M = findPointDaysBefore(series, 182);
  const pt1Y = findPointDaysBefore(series, 365);
  const pt3Y = findPointDaysBefore(series, 365 * 3);
  const pt5Y = findPointDaysBefore(series, 365 * 5);

  const absRet = (base: ParsedNavPoint | null) =>
    base && base.value > 0 ? ((latest.value - base.value) / base.value) * 100 : null;

  const cagr = (base: ParsedNavPoint | null, years: number) => {
    if (!base || base.value <= 0) return null;
    const actualYears = Math.max(0.5, (latest.timestamp - base.timestamp) / (365.25 * DAY_MS));
    if (actualYears < years * 0.85) return null;
    return (Math.pow(latest.value / base.value, 1 / actualYears) - 1) * 100;
  };

  const oneYearPoints = series.filter((pt) => pt.timestamp >= latest.timestamp - 366 * DAY_MS);
  const high52W =
    oneYearPoints.length > 0 ? Math.max(...oneYearPoints.map((p) => p.value)) : null;
  const low52W =
    oneYearPoints.length > 0 ? Math.min(...oneYearPoints.map((p) => p.value)) : null;

  // Annualized daily return volatility over up to last 252 trading observations
  let annualizedVolatility: number | null = null;
  const volSlice = oneYearPoints.length >= 20 ? oneYearPoints : series.slice(-252);
  if (volSlice.length >= 20) {
    const dailyReturns: number[] = [];
    for (let i = 1; i < volSlice.length; i++) {
      if (volSlice[i - 1].value > 0) {
        dailyReturns.push((volSlice[i].value - volSlice[i - 1].value) / volSlice[i - 1].value);
      }
    }
    if (dailyReturns.length >= 15) {
      const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
      const variance =
        dailyReturns.reduce((s, r) => s + (r - mean) * (r - mean), 0) / (dailyReturns.length - 1);
      annualizedVolatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
    }
  }

  const dataSpanYears =
    series.length >= 2
      ? Math.max(0, (latest.timestamp - series[0].timestamp) / (365.25 * DAY_MS))
      : 0;

  return {
    latestNav: latest.value,
    latestDate: latest.date,
    dayChangePercent,
    return1M: absRet(pt1M),
    return6M: absRet(pt6M),
    return1Y: absRet(pt1Y),
    cagr3Y: cagr(pt3Y, 3),
    cagr5Y: cagr(pt5Y, 5),
    high52W,
    low52W,
    annualizedVolatility,
    dataSpanYears,
  };
}

/**
 * Neutral category-based risk indicator (explicitly distinct from AMC's official SEBI Risk-o-Meter).
 */
export function inferRiskLevelFromCategory(schemeCategory?: string | null): CategoryRiskIndicator {
  const cat = (schemeCategory ?? '').toLowerCase();

  if (cat.includes('liquid') || cat.includes('overnight') || cat.includes('money market')) {
    return {
      level: 'Low',
      tier: 1,
      color: '#10B981',
      bg: '#ECFDF5',
      note: 'Short-maturity debt category typically associated with lower price fluctuations.',
    };
  }
  if (cat.includes('debt') || cat.includes('gilt') || cat.includes('short duration') || cat.includes('corporate bond')) {
    return {
      level: 'Moderate',
      tier: 2,
      color: '#0284C7',
      bg: '#F0F9FF',
      note: 'Fixed-income category sensitive to interest-rate and credit movements.',
    };
  }
  if (cat.includes('hybrid') || cat.includes('balanced') || cat.includes('arbitrage') || cat.includes('multi asset')) {
    return {
      level: 'Moderately High',
      tier: 3,
      color: '#D97706',
      bg: '#FFFBEB',
      note: 'Blends equity and debt exposure to moderate market cycles.',
    };
  }
  if (cat.includes('small cap') || cat.includes('mid cap') || cat.includes('sectoral') || cat.includes('thematic') || cat.includes('international')) {
    return {
      level: 'Very High',
      tier: 5,
      color: '#DC2626',
      bg: '#FEF2F2',
      note: 'High-beta equity segment suited only for long horizons and high volatility tolerance.',
    };
  }
  return {
    level: 'High',
    tier: 4,
    color: '#EA580C',
    bg: '#FFF7ED',
    note: 'Equity-oriented category subject to broader stock-market fluctuations.',
  };
}

/**
 * Standard mathematical SIP future-value formula for illustrative ArthaPlay scenarios.
 */
export function computeSipProjection(
  monthlyAmount: number,
  years: number,
  annualRatePct: number,
): SipProjectionResult {
  const safeMonthly = Math.max(500, monthlyAmount);
  const safeYears = Math.max(1, Math.min(40, Math.round(years)));
  const r = annualRatePct / 100 / 12;

  const points: SipProjectionPoint[] = [];
  for (let y = 0; y <= safeYears; y++) {
    const months = y * 12;
    const invested = safeMonthly * months;
    let value = invested;
    if (months > 0 && r > 0) {
      value = safeMonthly * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
    }
    points.push({
      year: y,
      invested: Math.round(invested),
      value: Math.round(value),
    });
  }

  const last = points[points.length - 1];
  return {
    totalInvested: last.invested,
    estimatedValue: last.value,
    estimatedGain: Math.max(0, last.value - last.invested),
    points,
  };
}

/**
 * Normalizes actual user RiskProfile from `/auth/profile` without ever inventing a fallback category.
 */
export function normalizeRiskProfile(
  rawCategory?: string | null,
  rawScore?: number | null,
): NormalizedRiskDisplay | null {
  if (!rawCategory || typeof rawCategory !== 'string' || !rawCategory.trim()) {
    return null;
  }

  const norm = rawCategory.trim().toUpperCase().replace(/[\s-]+/g, '_');

  if (norm === 'CONSERVATIVE') {
    return {
      key: 'CONSERVATIVE',
      label: 'Conservative',
      score: rawScore ?? 18,
      shortSummary: 'Capital stability first with lower short-term volatility.',
      color: '#10B981',
    };
  }
  if (norm === 'MODERATELY_LOW' || norm === 'MODERATELY_CONSERVATIVE') {
    return {
      key: 'MODERATELY_LOW',
      label: 'Moderately Low',
      score: rawScore ?? 26,
      shortSummary: 'Steady income orientation with selective equity exposure.',
      color: '#65A30D',
    };
  }
  if (norm === 'MODERATE' || norm === 'BALANCED') {
    return {
      key: 'MODERATE',
      label: 'Moderate',
      score: rawScore ?? 36,
      shortSummary: 'Balanced growth cushioned against sharper drawdowns.',
      color: '#D97706',
    };
  }
  if (norm === 'MODERATELY_HIGH' || norm === 'GROWTH' || norm === 'MODERATELY_AGGRESSIVE') {
    return {
      key: 'MODERATELY_HIGH',
      label: 'Growth',
      score: rawScore ?? 46,
      shortSummary: 'Long-term equity focus comfortable with market swings.',
      color: '#EA580C',
    };
  }
  if (norm === 'AGGRESSIVE') {
    return {
      key: 'AGGRESSIVE',
      label: 'Aggressive',
      score: rawScore ?? 55,
      shortSummary: 'Maximum long-horizon compounding through full market cycles.',
      color: '#EF4444',
    };
  }

  return null;
}

export function formatIndianCompactCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}
