/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  computeFundMetrics,
  computeSipProjection,
  formatIndianCompactCurrency,
  inferRiskLevelFromCategory,
  normalizeRiskProfile,
  parseNavHistory,
  sliceNavByRange,
} from '../fundAnalytics';

const mobileRoot = join(__dirname, '../../..');

describe('fundAnalytics utilities & Home/ArthaVerse UI architecture', () => {
  it('parses MFAPI DD-MM-YYYY history chronologically and filters invalid entries', () => {
    const parsed = parseNavHistory([
      { date: '15-11-2026', nav: '120.50' },
      { date: 'bad-date', nav: '99' },
      { date: '15-11-2025', nav: '100.00' },
      { date: '15-11-2024', nav: '0' },
    ]);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].isoDate).toBe('2025-11-15');
    expect(parsed[1].isoDate).toBe('2026-11-15');
  });

  it('computes real 1Y return and leaves unsupported multi-year CAGRs null without fabricating', () => {
    const raw = [];
    const start = Date.UTC(2025, 0, 1);
    for (let d = 0; d <= 365; d += 5) {
      const dt = new Date(start + d * 24 * 60 * 60 * 1000);
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = dt.getUTCFullYear();
      const nav = (100 * (1 + 0.15 * (d / 365))).toFixed(4);
      raw.push({ date: `${dd}-${mm}-${yyyy}`, nav });
    }

    const series = parseNavHistory(raw);
    const metrics = computeFundMetrics(series);

    expect(metrics.latestNav).toBeCloseTo(115, 1);
    expect(metrics.return1Y).toBeCloseTo(15, 0);
    expect(metrics.cagr3Y).toBeNull();
    expect(metrics.cagr5Y).toBeNull();
    expect(metrics.high52W).toBeCloseTo(115, 1);
    expect(metrics.low52W).toBeCloseTo(100, 1);

    const sliced1M = sliceNavByRange(series, '1M');
    expect(sliced1M.length).toBeGreaterThanOrEqual(2);
    expect(sliced1M.length).toBeLessThan(series.length);
  });

  it('never fabricates a default risk category when assessment is missing', () => {
    expect(normalizeRiskProfile(null, null)).toBeNull();
    expect(normalizeRiskProfile(undefined, undefined)).toBeNull();
    expect(normalizeRiskProfile('', 0)).toBeNull();

    const moderate = normalizeRiskProfile('MODERATE', 36);
    expect(moderate?.key).toBe('MODERATE');
    expect(moderate?.label).toBe('Moderate');

    const growth = normalizeRiskProfile('MODERATELY_HIGH', 45);
    expect(growth?.key).toBe('MODERATELY_HIGH');
    expect(growth?.label).toBe('Growth');
  });

  it('maps mutual fund categories to honest neutral risk tiers', () => {
    expect(inferRiskLevelFromCategory('Debt Scheme - Liquid Fund').level).toBe('Low');
    expect(inferRiskLevelFromCategory('Debt Scheme - Corporate Bond Fund').level).toBe('Moderate');
    expect(inferRiskLevelFromCategory('Hybrid Scheme - Balanced Advantage').level).toBe('Moderately High');
    expect(inferRiskLevelFromCategory('Equity Scheme - Large Cap Fund').level).toBe('High');
    expect(inferRiskLevelFromCategory('Equity Scheme - Small Cap Fund').level).toBe('Very High');
  });

  it('computes SIP compounding projection accurately for ArthaPlay', () => {
    const res = computeSipProjection(5000, 10, 12);
    expect(res.totalInvested).toBe(600000);
    expect(res.estimatedValue).toBeGreaterThan(1100000);
    expect(res.estimatedGain).toBe(res.estimatedValue - res.totalInvested);
    expect(res.points).toHaveLength(11);
    expect(formatIndianCompactCurrency(1161695)).toBe('₹11.62 L');
  });

  it('verifies transformed HomeScreen and ArthaVerseScreen structure and neutral wording', () => {
    const homeSrc = readFileSync(join(mobileRoot, 'src/screens/HomeScreen.tsx'), 'utf8');
    expect(homeSrc).toContain('RiskometerGauge');
    expect(homeSrc).toContain('GoalProgressRing');
    expect(homeSrc).toContain('Floating3DCard');
    expect(homeSrc).toContain("label: 'Invest'");
    expect(homeSrc).not.toContain("label: 'Withdraw'");
    expect(homeSrc).toContain("label: 'Holdings'");
    expect(homeSrc).toContain("label: 'Transactions'");
    expect(homeSrc).toContain('Explore ArthaVerse');

    const arthaSrc = readFileSync(join(mobileRoot, 'src/screens/ArthaVerseScreen.tsx'), 'utf8');
    for (const col of [
      'Large Cap Funds',
      'Mid Cap Funds',
      'Small Cap Funds',
      'Flexi Cap Funds',
      'Index Funds',
      'Debt & Corporate Bond Funds',
      'Hybrid & Balanced Funds',
      'ELSS Tax Saver Funds',
    ]) {
      expect(arthaSrc).toContain(col);
    }
    for (const card of [
      'Market Boulevard',
      'What’s Moving',
      'Category Explorer',
      'Fund Intelligence',
      'ArthaPlay',
      'Artha Academy',
      'Research & Sources',
    ]) {
      expect(arthaSrc).toContain(card);
    }
    expect(arthaSrc).toContain('ARTHAVERSE DESTINATION');
    expect(arthaSrc).toContain('MarketPulseCard');
    expect(arthaSrc).toContain('arthaverse-destination-grid');
    expect(arthaSrc).not.toContain('subFilterScroll');
    expect(arthaSrc).not.toContain('subTabPill');
    expect(arthaSrc).not.toContain('filterScroll');
  });
});
