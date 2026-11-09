import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import type { ChartRange, MarketOverviewResponse, ChartDataPoint } from '../types/market';

interface MarketPulseCardProps {
  data: MarketOverviewResponse | null;
  loading: boolean;
  onExplorePress: () => void;
  onMoodPress: () => void;
}

const RANGES: ChartRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = 20;
const CHART_WIDTH = Math.min(SCREEN_WIDTH - 48 - CARD_PADDING * 2, 340);
const CHART_HEIGHT = 130;

export const MarketPulseCard: React.FC<MarketPulseCardProps> = ({
  data,
  loading,
  onExplorePress,
  onMoodPress,
}) => {
  const [selectedRange, setSelectedRange] = useState<ChartRange>('1D');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const nifty = data?.nifty50;
  const isPositive = (nifty?.change ?? 0) >= 0;
  const accentColor = isPositive ? '#10B981' : '#EF4444';
  const accentGradientStart = isPositive ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)';

  // Chart coordinates calculation
  const currentChartPoints: ChartDataPoint[] = useMemo(() => {
    if (!data?.charts || !data.charts[selectedRange]) return [];
    return data.charts[selectedRange];
  }, [data, selectedRange]);

  const { pathData, areaData, points, minVal, maxVal } = useMemo(() => {
    if (!currentChartPoints || currentChartPoints.length < 2) {
      return { pathData: '', areaData: '', points: [], minVal: 0, maxVal: 0 };
    }

    const values = currentChartPoints.map((p: ChartDataPoint) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = 12;
    const innerW = CHART_WIDTH - padding * 2;
    const innerH = CHART_HEIGHT - padding * 2;
    const range = max - min || 1;

    const calculatedPoints = currentChartPoints.map((p: ChartDataPoint, idx: number) => {
      const x = padding + (idx / (currentChartPoints.length - 1)) * innerW;
      const y = padding + innerH - ((p.value - min) / range) * innerH;
      return { x, y, ...p };
    });

    // Build SVG Path string
    let d = `M ${calculatedPoints[0].x} ${calculatedPoints[0].y}`;
    for (let i = 1; i < calculatedPoints.length; i++) {
      const prev = calculatedPoints[i - 1];
      const curr = calculatedPoints[i];
      // Catmull-Rom or cubic Bezier curve smoothing
      const cpx1 = prev.x + (curr.x - prev.x) / 2;
      const cpy1 = prev.y;
      const cpx2 = prev.x + (curr.x - prev.x) / 2;
      const cpy2 = curr.y;
      d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
    }

    const area = `${d} L ${calculatedPoints[calculatedPoints.length - 1].x} ${CHART_HEIGHT} L ${calculatedPoints[0].x} ${CHART_HEIGHT} Z`;

    return { pathData: d, areaData: area, points: calculatedPoints, minVal: min, maxVal: max };
  }, [currentChartPoints]);

  const hoveredPoint = activeIndex !== null && points[activeIndex] ? points[activeIndex] : null;

  if (loading && !data) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator size="small" color="#3C3985" />
        <Text style={styles.loadingText}>Fetching live Indian market indicators...</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Top Bar: Index Name, Live Status & Market Mood Badge */}
      <View style={styles.topRow}>
        <View style={styles.symbolBadge}>
          <Text style={styles.symbolText}>NIFTY 50</Text>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: nifty?.marketStatus === 'Open' ? '#10B981' : '#64748B' }]} />
            <Text style={styles.statusText}>{nifty?.marketStatus ? `MARKET ${nifty.marketStatus.toUpperCase()}` : 'MARKET CLOSED'}</Text>
          </View>
        </View>

        {/* Market Mood Tap Target */}
        <Pressable onPress={onMoodPress} style={styles.moodPill}>
          <Ionicons name="speedometer-outline" size={13} color="#3C3985" />
          <Text style={styles.moodText}>Mood: {data?.marketMood?.sentiment || 'Positive'}</Text>
          <Ionicons name="information-circle-outline" size={12} color="#3C3985" />
        </Pressable>
      </View>

      {/* Main Quote & Daily Delta */}
      <View style={styles.quoteRow}>
        <View>
          <Text style={styles.mainValue}>
            {hoveredPoint ? `₹${hoveredPoint.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : nifty ? `₹${nifty.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
          </Text>
          <Text style={styles.quoteSubtext}>
            {hoveredPoint ? hoveredPoint.label : `Prev Close: ₹${nifty?.previousClose.toLocaleString('en-IN') || '—'}`}
          </Text>
        </View>

        <View style={[styles.deltaBadge, { backgroundColor: isPositive ? '#ECFDF5' : '#FEF2F2', borderColor: isPositive ? '#A7F3D0' : '#FECACA' }]}>
          <Ionicons name={isPositive ? 'trending-up' : 'trending-down'} size={15} color={accentColor} />
          <Text style={[styles.deltaText, { color: accentColor }]}>
            {nifty ? `${isPositive ? '+' : ''}${nifty.change.toFixed(2)} (${isPositive ? '+' : ''}${nifty.changePercent.toFixed(2)}%)` : '—'}
          </Text>
        </View>
      </View>

      {/* Interactive Range Selector */}
      <View style={styles.rangeRow}>
        {RANGES.map((range) => {
          const isSelected = selectedRange === range;
          return (
            <Pressable
              key={range}
              onPress={() => {
                setSelectedRange(range);
                setActiveIndex(null);
              }}
              style={[styles.rangeTab, isSelected && styles.rangeTabActive]}
            >
              <Text style={[styles.rangeTabText, isSelected && styles.rangeTabTextActive]}>{range}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Responsive SVG Chart */}
      <View style={styles.chartContainer}>
        {points.length > 0 ? (
          <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={accentGradientStart} />
                <Stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
              </LinearGradient>
            </Defs>

            {/* Shaded Area Under Curve */}
            <Path d={areaData} fill="url(#chartGradient)" />

            {/* Trend Line */}
            <Path d={pathData} fill="none" stroke={accentColor} strokeWidth={2.5} strokeLinecap="round" />

            {/* Clickable/Hoverable Data Points */}
            {points.map((pt, i) => (
              <Circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={activeIndex === i ? 5 : 2.5}
                fill={activeIndex === i ? '#3C3985' : accentColor}
                stroke="#FFFFFF"
                strokeWidth={1.5}
                onPress={() => setActiveIndex(i)}
              />
            ))}
          </Svg>
        ) : (
          <View style={styles.emptyChart}>
            <ActivityIndicator size="small" color="#3C3985" />
          </View>
        )}
      </View>

      {/* Market Stats Bar: Day High, Day Low, Sensex Ticker */}
      <View style={styles.statsBar}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>DAY RANGE</Text>
          <Text style={styles.statValue}>
            ₹{nifty?.dayLow ? Math.round(nifty.dayLow).toLocaleString('en-IN') : '—'} - ₹{nifty?.dayHigh ? Math.round(nifty.dayHigh).toLocaleString('en-IN') : '—'}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCol}>
          <Text style={styles.statLabel}>BSE SENSEX</Text>
          <Text style={styles.statValue}>
            {data?.sensex ? `₹${Math.round(data.sensex.currentValue).toLocaleString('en-IN')} (+${data.sensex.changePercent}%)` : '—'}
          </Text>
        </View>
      </View>

      {/* Explore Market Action Footer */}
      <View style={styles.footerRow}>
        <Text style={styles.sourceText}>Source: NSE / BSE Verified Data</Text>
        <Pressable onPress={onExplorePress} style={styles.exploreBtn}>
          <Text style={styles.exploreBtnText}>Explore Market</Text>
          <Ionicons name="arrow-forward" size={13} color="#3C3985" />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: CARD_PADDING,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  symbolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  symbolText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#102A54',
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.4,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBEBFA',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#D8D8F6',
  },
  moodText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C3985',
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mainValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#102A54',
    letterSpacing: -0.5,
  },
  quoteSubtext: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '800',
  },
  rangeRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  rangeTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  rangeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  rangeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  rangeTabTextActive: {
    color: '#3C3985',
    fontWeight: '900',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  emptyChart: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FD',
    borderRadius: 12,
    padding: 10,
    marginVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#102A54',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sourceText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F0EFFB',
    borderRadius: 8,
  },
  exploreBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C3985',
  },
});
