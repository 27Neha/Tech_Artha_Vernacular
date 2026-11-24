import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api/client';
import { addToDraft } from '../store/customBucket';
import { Header } from '../components/Header';
import {
  computeFundMetrics,
  FundChartRange,
  inferRiskLevelFromCategory,
  parseNavHistory,
  sliceNavByRange,
} from '../utils/fundAnalytics';

type FundDetails = {
  meta?: {
    scheme_name?: string;
    fund_house?: string;
    scheme_category?: string;
    scheme_type?: string;
    isin_growth?: string;
  };
  data?: { date: string; nav: string }[];
};

const RANGES: FundChartRange[] = ['1M', '3M', '6M', '1Y', '3Y', 'ALL'];

function fmtPct(v: number | null, suffix = '%'): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}${suffix}`;
}

export const FundDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const schemeCode: string = String(route.params?.schemeCode ?? '');

  const [details, setDetails] = useState<FundDetails | null>(null);
  const [riskCategory, setRiskCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Interactive chart & Read More states
  const [selectedRange, setSelectedRange] = useState<FundChartRange>('1Y');
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [factsExpanded, setFactsExpanded] = useState(false);

  // Real side-by-side comparison modal state
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareQuery, setCompareQuery] = useState('');
  const [compareResults, setCompareResults] = useState<any[]>([]);
  const [compareSearching, setCompareSearching] = useState(false);
  const [compareFund, setCompareFund] = useState<FundDetails | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [fund, profile] = await Promise.allSettled([
        api.get<FundDetails>(`/funds/${encodeURIComponent(schemeCode)}`, { anonymous: true }),
        api.get<{ riskProfile?: { category?: string | null } | null }>('/auth/profile'),
      ]);

      if (fund.status === 'fulfilled') setDetails(fund.value);
      else setError('Fund data is temporarily unavailable.');

      if (profile.status === 'fulfilled') {
        const category = profile.value?.riskProfile?.category ?? '';
        setRiskCategory(
          category ? category.charAt(0).toUpperCase() + category.slice(1).toLowerCase() : '',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [schemeCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const parsedSeries = useMemo(() => parseNavHistory(details?.data ?? []), [details?.data]);
  const metrics = useMemo(() => computeFundMetrics(parsedSeries), [parsedSeries]);
  const chartPoints = useMemo(
    () => sliceNavByRange(parsedSeries, selectedRange, 48),
    [parsedSeries, selectedRange],
  );

  const compareSeries = useMemo(() => parseNavHistory(compareFund?.data ?? []), [compareFund?.data]);
  const compareMetrics = useMemo(() => computeFundMetrics(compareSeries), [compareSeries]);

  const chartSvg = useMemo(() => {
    const W = 320;
    const H = 148;
    if (chartPoints.length < 2) {
      return { pathD: '', areaD: '', pts: [], isPositive: true, periodReturn: null as number | null };
    }
    const vals = chartPoints.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const padX = 10;
    const padY = 16;
    const innerW = W - padX * 2;
    const innerH = H - padY * 2;

    const pts = chartPoints.map((p, i) => ({
      ...p,
      x: padX + (i / (chartPoints.length - 1)) * innerW,
      y: H - padY - ((p.value - min) / span) * innerH,
    }));

    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx.toFixed(1)} ${prev.y.toFixed(1)}, ${cx.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }
    const last = pts[pts.length - 1];
    const areaD = `${d} L ${last.x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`;
    const firstVal = chartPoints[0].value;
    const lastVal = chartPoints[chartPoints.length - 1].value;
    const periodReturn = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : null;

    return {
      pathD: d,
      areaD,
      pts,
      isPositive: lastVal >= firstVal,
      periodReturn,
    };
  }, [chartPoints]);

  const addToBucket = async () => {
    const name = details?.meta?.scheme_name;
    if (!name) return;
    setAdding(true);
    try {
      await addToDraft({
        schemeCode: Number(schemeCode),
        name,
        category: details?.meta?.scheme_category,
      });
      navigation.navigate('CustomBucket');
    } finally {
      setAdding(false);
    }
  };

  const searchCompareFunds = async (q: string) => {
    setCompareQuery(q);
    if (q.trim().length < 2) {
      setCompareResults([]);
      return;
    }
    setCompareSearching(true);
    try {
      const res = await api.get<{ items?: any[] }>(
        `/funds/search?q=${encodeURIComponent(q.trim())}`,
        { anonymous: true },
      );
      setCompareResults((res?.items ?? []).slice(0, 8));
    } catch {
      setCompareResults([]);
    } finally {
      setCompareSearching(false);
    }
  };

  const selectCompareFund = async (code: string | number) => {
    setCompareLoading(true);
    try {
      const data = await api.get<FundDetails>(`/funds/${encodeURIComponent(String(code))}`, {
        anonymous: true,
      });
      setCompareFund(data);
      setCompareResults([]);
    } finally {
      setCompareLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <Header />
        <View style={styles.centre}>
          <ActivityIndicator color="#36358D" />
        </View>
      </View>
    );
  }

  const meta = details?.meta;
  if (error || !meta) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <Header />
        <View style={styles.centre}>
          <Text style={styles.error}>{error ?? 'Fund not found.'}</Text>
          <Pressable style={styles.outlineButton} onPress={() => navigation.goBack()}>
            <Text style={styles.outlineText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const category = (meta.scheme_category ?? '').toLowerCase();
  const showRiskWarning =
    riskCategory.toUpperCase() === 'MODERATE' &&
    (category.includes('equity') || category.includes('small cap'));

  const riskIndicator = inferRiskLevelFromCategory(meta.scheme_category);
  const inspected =
    activeIdx !== null && chartSvg.pts[activeIdx] ? chartSvg.pts[activeIdx] : null;
  const displayNav = inspected?.value ?? metrics.latestNav;
  const displayDate = inspected?.date ?? metrics.latestDate;
  const lineStroke = chartSvg.isPositive ? '#10B981' : '#EF4444';

  const range52Pos =
    metrics.high52W != null &&
    metrics.low52W != null &&
    metrics.latestNav != null &&
    metrics.high52W > metrics.low52W
      ? ((metrics.latestNav - metrics.low52W) / (metrics.high52W - metrics.low52W)) * 100
      : 50;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Header />

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {showRiskWarning ? (
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={18} color="#C05621" />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Higher risk than your profile</Text>
              <Text style={styles.warningText}>
                Category volatility is higher than your assessed {riskCategory} profile.
              </Text>
            </View>
          </View>
        ) : null}

        {/* 1. Scheme Title & Neutral Badges */}
        <View style={styles.heroHeader}>
          <Text style={styles.title}>{meta.scheme_name}</Text>
          <View style={styles.pillsRow}>
            {meta.scheme_category ? (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{meta.scheme_category}</Text>
              </View>
            ) : null}
            <View style={[styles.pill, { backgroundColor: riskIndicator.bg }]}>
              <Text style={[styles.pillText, { color: riskIndicator.color }]}>
                {riskIndicator.level} Risk
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Interactive NAV Performance Card */}
        <View style={styles.chartCard} testID="fund-intelligence-chart">
          <View style={styles.navTopRow}>
            <View>
              <Text style={styles.navEyebrow}>
                {inspected ? 'SELECTED NAV' : 'LATEST NAV'}
              </Text>
              <Text style={styles.navValue}>
                {displayNav != null ? `₹${displayNav.toFixed(2)}` : '—'}
              </Text>
              <Text style={styles.navDate}>
                {displayDate ? `As of ${displayDate}` : 'No published NAV'}
              </Text>
            </View>

            {chartSvg.periodReturn != null && (
              <View
                style={[
                  styles.periodBadge,
                  { backgroundColor: chartSvg.isPositive ? '#ECFDF5' : '#FEF2F2' },
                ]}
              >
                <Ionicons
                  name={chartSvg.isPositive ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={lineStroke}
                />
                <Text style={[styles.periodBadgeText, { color: lineStroke }]}>
                  {fmtPct(chartSvg.periodReturn)} ({selectedRange})
                </Text>
              </View>
            )}
          </View>

          {chartSvg.pts.length >= 2 ? (
            <View style={styles.svgWrap}>
              <Svg width="100%" height={148} viewBox="0 0 320 148">
                <Defs>
                  <LinearGradient id="fundNavGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor={lineStroke} stopOpacity="0.24" />
                    <Stop offset="100%" stopColor={lineStroke} stopOpacity="0.00" />
                  </LinearGradient>
                </Defs>
                <Line x1="10" y1="38" x2="310" y2="38" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3 3" />
                <Line x1="10" y1="105" x2="310" y2="105" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3 3" />
                <Path d={chartSvg.areaD} fill="url(#fundNavGrad)" />
                <Path d={chartSvg.pathD} fill="none" stroke={lineStroke} strokeWidth={2.6} strokeLinecap="round" />
                {chartSvg.pts.map((pt, i) => (
                  <Circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={activeIdx === i || (activeIdx === null && i === chartSvg.pts.length - 1) ? 4.5 : 2}
                    fill={activeIdx === i ? '#36358D' : lineStroke}
                    opacity={activeIdx === i || i === chartSvg.pts.length - 1 ? 1 : 0.35}
                    onPress={() => setActiveIdx(i)}
                  />
                ))}
              </Svg>
            </View>
          ) : (
            <Text style={styles.muted}>Not enough published NAV history for this range.</Text>
          )}

          <View style={styles.rangeRow}>
            {RANGES.map((range) => {
              const active = selectedRange === range;
              return (
                <Pressable
                  key={range}
                  onPress={() => {
                    setSelectedRange(range);
                    setActiveIdx(null);
                  }}
                  style={[styles.rangeTab, active && styles.rangeTabActive]}
                >
                  <Text style={[styles.rangeTabText, active && styles.rangeTabTextActive]}>
                    {range}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 3. Real Historical Returns Strip (Never fabricated) */}
        <View style={styles.metricsCard}>
          <Text style={styles.cardTitle}>Historical Performance</Text>
          <View style={styles.returnsGrid}>
            {[
              { label: '1M', val: metrics.return1M },
              { label: '6M', val: metrics.return6M },
              { label: '1Y', val: metrics.return1Y },
              { label: '3Y CAGR', val: metrics.cagr3Y },
              { label: '5Y CAGR', val: metrics.cagr5Y },
            ].map((item) => (
              <View key={item.label} style={styles.returnCell}>
                <Text style={styles.returnLabel}>{item.label}</Text>
                <Text
                  style={[
                    styles.returnVal,
                    item.val != null && { color: item.val >= 0 ? '#059669' : '#DC2626' },
                  ]}
                >
                  {fmtPct(item.val)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 4. Visual Risk & 52W Range Intelligence */}
        <View style={styles.metricsCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Risk & Range Indicators</Text>
            <Pressable style={styles.compareBtn} onPress={() => setCompareOpen(true)}>
              <Ionicons name="git-compare-outline" size={13} color="#36358D" />
              <Text style={styles.compareBtnText}>Compare</Text>
            </Pressable>
          </View>

          {/* 5-Tier Category Risk Bar */}
          <View style={styles.riskBarRow}>
            {[1, 2, 3, 4, 5].map((tier) => (
              <View
                key={tier}
                style={[
                  styles.riskSegment,
                  tier <= riskIndicator.tier && { backgroundColor: riskIndicator.color },
                ]}
              />
            ))}
          </View>
          <View style={styles.riskMetaRow}>
            <Text style={[styles.riskLevelText, { color: riskIndicator.color }]}>
              Category Indicator: {riskIndicator.level}
            </Text>
            {metrics.annualizedVolatility != null && (
              <Text style={styles.volText}>
                Volatility: {metrics.annualizedVolatility.toFixed(1)}%
              </Text>
            )}
          </View>

          {/* 52-Week High / Low Track */}
          {metrics.high52W != null && metrics.low52W != null && (
            <View style={styles.range52Wrap}>
              <View style={styles.range52Labels}>
                <Text style={styles.range52Label}>52W Low ₹{metrics.low52W.toFixed(2)}</Text>
                <Text style={styles.range52Label}>52W High ₹{metrics.high52W.toFixed(2)}</Text>
              </View>
              <View style={styles.range52Track}>
                <View
                  style={[
                    styles.range52Marker,
                    { left: `${Math.min(96, Math.max(4, range52Pos))}%` },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* 5. Expandable "Read More" Scheme Facts Accordion */}
        <Pressable
          style={styles.accordionCard}
          onPress={() => setFactsExpanded((v) => !v)}
        >
          <View style={styles.accordionHeader}>
            <Text style={styles.cardTitle}>Scheme Facts & Disclosures</Text>
            <View style={styles.readMoreBadge}>
              <Text style={styles.readMoreBadgeText}>
                {factsExpanded ? 'Show Less' : 'Read More'}
              </Text>
              <Ionicons
                name={factsExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color="#36358D"
              />
            </View>
          </View>

          {factsExpanded && (
            <View style={styles.factsBody}>
              <View style={styles.factRow}>
                <Text style={styles.factKey}>Fund House</Text>
                <Text style={styles.factVal}>{meta.fund_house || '—'}</Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factKey}>Plan Type</Text>
                <Text style={styles.factVal}>{meta.scheme_type || '—'}</Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factKey}>ISIN</Text>
                <Text style={styles.factVal}>{meta.isin_growth || '—'}</Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factKey}>TER / AUM / Holdings</Text>
                <Text style={styles.factVal}>Refer AMC Factsheet</Text>
              </View>
              <Text style={styles.riskNote}>{riskIndicator.note}</Text>
            </View>
          )}
        </Pressable>

        {/* Preserved Regulatory Disclaimer */}
        <Text style={styles.disclaimer}>
          Mutual fund investments are subject to market risks. Read all scheme related documents carefully. Past performance is not indicative of future returns. NAV history is reference data only; verify official TER, AUM, and SEBI Risk-o-Meter on the AMC factsheet.
        </Text>

        {/* Preserved Functional Actions */}
        <View style={styles.actions}>
          <Pressable
            style={styles.button}
            onPress={() =>
              navigation.navigate('Invest', { schemeCode, fundName: meta.scheme_name })
            }
          >
            <Text style={styles.buttonText}>Invest in this fund</Text>
          </Pressable>
          <Pressable
            style={[styles.outlineButton, adding && styles.disabled]}
            onPress={addToBucket}
            disabled={adding}
          >
            <Text style={styles.outlineText}>
              {adding ? 'Adding…' : 'Add to my bucket'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.textButton}
            onPress={() => navigation.navigate('InvestmentBuckets')}
          >
            <Text style={styles.textButtonLabel}>Browse buckets →</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Interactive Side-by-Side Fund Comparison Modal */}
      <Modal
        visible={compareOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCompareOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Compare Funds</Text>
              <Pressable onPress={() => setCompareOpen(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color="#64748B" />
              </Pressable>
            </View>

            <TextInput
              value={compareQuery}
              onChangeText={searchCompareFunds}
              placeholder="Search another fund (e.g. Nifty, Flexi Cap)..."
              placeholderTextColor="#94A3B8"
              style={styles.compareInput}
            />

            {compareSearching && <ActivityIndicator size="small" color="#36358D" style={{ marginVertical: 10 }} />}

            {compareResults.length > 0 && (
              <ScrollView style={{ maxHeight: 160 }} keyboardShouldPersistTaps="handled">
                {compareResults.map((item) => (
                  <Pressable
                    key={item.schemeCode}
                    style={styles.compareResultRow}
                    onPress={() => selectCompareFund(item.schemeCode)}
                  >
                    <Text style={styles.compareResultName} numberOfLines={2}>
                      {item.schemeName}
                    </Text>
                    <Ionicons name="add-circle-outline" size={18} color="#36358D" />
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {compareLoading && <ActivityIndicator size="small" color="#36358D" style={{ marginVertical: 14 }} />}

            {compareFund?.meta && (
              <View style={styles.compareTable}>
                <View style={styles.compareHeaderRow}>
                  <Text style={styles.compareMetricCol}>Metric</Text>
                  <Text style={styles.compareFundCol} numberOfLines={2}>
                    {meta.scheme_name}
                  </Text>
                  <Text style={styles.compareFundCol} numberOfLines={2}>
                    {compareFund.meta.scheme_name}
                  </Text>
                </View>
                {[
                  {
                    label: 'Latest NAV',
                    a: metrics.latestNav != null ? `₹${metrics.latestNav.toFixed(2)}` : '—',
                    b: compareMetrics.latestNav != null ? `₹${compareMetrics.latestNav.toFixed(2)}` : '—',
                  },
                  { label: '1Y Return', a: fmtPct(metrics.return1Y), b: fmtPct(compareMetrics.return1Y) },
                  { label: '3Y CAGR', a: fmtPct(metrics.cagr3Y), b: fmtPct(compareMetrics.cagr3Y) },
                  {
                    label: 'Volatility',
                    a: metrics.annualizedVolatility != null ? `${metrics.annualizedVolatility.toFixed(1)}%` : '—',
                    b: compareMetrics.annualizedVolatility != null ? `${compareMetrics.annualizedVolatility.toFixed(1)}%` : '—',
                  },
                ].map((row) => (
                  <View key={row.label} style={styles.compareRow}>
                    <Text style={styles.compareMetricCol}>{row.label}</Text>
                    <Text style={styles.compareValCol}>{row.a}</Text>
                    <Text style={styles.compareValCol}>{row.b}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F7FC' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  scrollBody: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 40 },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF4E8',
    borderLeftWidth: 4,
    borderLeftColor: '#F7941D',
    padding: 13,
    borderRadius: 12,
    marginBottom: 14,
  },
  warningTitle: { color: '#C05621', fontWeight: '800', fontSize: 13 },
  warningText: { color: '#9C4221', fontSize: 11.5, marginTop: 2, lineHeight: 16 },
  heroHeader: { marginBottom: 14 },
  title: { color: '#102A54', fontSize: 20, fontWeight: '900', lineHeight: 26 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pill: { backgroundColor: '#EEEDFA', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { color: '#36358D', fontWeight: '800', fontSize: 11 },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    marginBottom: 14,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  navTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  navEyebrow: { fontSize: 9.5, fontWeight: '800', color: '#64748B', letterSpacing: 0.6 },
  navValue: { fontSize: 28, fontWeight: '900', color: '#102A54', marginTop: 2 },
  navDate: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  periodBadgeText: { fontSize: 11.5, fontWeight: '800' },
  svgWrap: { marginVertical: 4 },
  rangeRow: {
    flexDirection: 'row',
    backgroundColor: '#F4F5FB',
    borderRadius: 11,
    padding: 3,
    marginTop: 8,
  },
  rangeTab: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  rangeTabActive: { backgroundColor: '#FFFFFF' },
  rangeTabText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  rangeTabTextActive: { color: '#36358D', fontWeight: '800' },
  metricsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: '#102A54', marginBottom: 8 },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEEDFA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    marginBottom: 8,
  },
  compareBtnText: { fontSize: 11.5, fontWeight: '800', color: '#36358D' },
  returnsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  returnCell: {
    flex: 1,
    backgroundColor: '#F8F9FD',
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  returnLabel: { fontSize: 9.5, fontWeight: '800', color: '#64748B', marginBottom: 3 },
  returnVal: { fontSize: 12, fontWeight: '900', color: '#102A54' },
  riskBarRow: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  riskSegment: { flex: 1, height: 7, borderRadius: 4, backgroundColor: '#E2E8F0' },
  riskMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  riskLevelText: { fontSize: 12, fontWeight: '800' },
  volText: { fontSize: 11.5, fontWeight: '700', color: '#475569' },
  range52Wrap: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  range52Labels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  range52Label: { fontSize: 11, fontWeight: '700', color: '#475569' },
  range52Track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8EAF6',
    position: 'relative',
    justifyContent: 'center',
  },
  range52Marker: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#36358D',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginLeft: -6,
  },
  accordionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    marginBottom: 14,
  },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  readMoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readMoreBadgeText: { fontSize: 12, fontWeight: '800', color: '#36358D' },
  factsBody: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 8 },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  factKey: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  factVal: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '800', color: '#102A54' },
  riskNote: { fontSize: 11, color: '#64748B', lineHeight: 16, marginTop: 4 },
  muted: { color: '#718096', fontSize: 12, marginVertical: 12, textAlign: 'center' },
  disclaimer: { color: '#94A3B8', fontSize: 10.5, lineHeight: 15, textAlign: 'center', marginBottom: 16 },
  error: { color: '#C53030', fontSize: 14, textAlign: 'center' },
  actions: { gap: 10 },
  button: { backgroundColor: '#36358D', paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  outlineButton: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#36358D' },
  outlineText: { color: '#36358D', fontSize: 14.5, fontWeight: '800' },
  textButton: { paddingVertical: 10, alignItems: 'center' },
  textButtonLabel: { color: '#36358D', fontSize: 13.5, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(16, 42, 84, 0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '900', color: '#102A54' },
  compareInput: {
    backgroundColor: '#F6F7FC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E4F5',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#102A54',
    marginBottom: 10,
  },
  compareResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  compareResultName: { flex: 1, fontSize: 12.5, fontWeight: '700', color: '#102A54' },
  compareTable: { marginTop: 12, borderRadius: 14, backgroundColor: '#F8F9FD', padding: 12 },
  compareHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 6,
  },
  compareRow: { flexDirection: 'row', paddingVertical: 7, alignItems: 'center' },
  compareMetricCol: { width: 82, fontSize: 11.5, fontWeight: '700', color: '#64748B' },
  compareFundCol: { flex: 1, fontSize: 11, fontWeight: '800', color: '#36358D', paddingHorizontal: 4 },
  compareValCol: { flex: 1, fontSize: 12.5, fontWeight: '900', color: '#102A54', paddingHorizontal: 4 },
});
