import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  Path,
  LinearGradient,
  Stop,
  Circle,
  Line,
} from 'react-native-svg';
import { colors } from '../theme/tokens';

export interface HistoryPoint {
  date: string;
  value: number;
}

export type PortfolioRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

const RANGES: PortfolioRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

interface PortfolioChartProps {
  history?: HistoryPoint[];
  investedValue?: number | null;
  currentValue?: number | null;
  height?: number;
  variant?: 'light' | 'dark';
}

export const PortfolioChart: React.FC<PortfolioChartProps> = ({
  history = [],
  investedValue = null,
  currentValue = null,
  height = 128,
  variant = 'light',
}) => {
  const [selectedRange, setSelectedRange] = useState<PortfolioRange>('ALL');
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const isDark = variant === 'dark';

  const filteredHistory = useMemo(() => {
    if (!history || history.length < 2) return [];
    if (selectedRange === 'ALL') return history;

    const counts: Record<Exclude<PortfolioRange, 'ALL'>, number> = {
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365,
    };
    const sliceLen = counts[selectedRange];
    const sliced = history.slice(-sliceLen);
    return sliced.length >= 2 ? sliced : history;
  }, [history, selectedRange]);

  const hasValidData = filteredHistory.length >= 2;

  const { pathD, areaD, points, latestPoint } = useMemo(() => {
    if (!hasValidData) {
      return { pathD: '', areaD: '', points: [], latestPoint: null };
    }

    const values = filteredHistory.map((h) => h.value).filter((v) => Number.isFinite(v));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;

    const width = 320;
    const paddingX = 12;
    const paddingY = 16;
    const effectiveWidth = width - paddingX * 2;
    const effectiveHeight = height - paddingY * 2;

    const pts = filteredHistory.map((pt, idx) => {
      const x = paddingX + (idx / (filteredHistory.length - 1)) * effectiveWidth;
      const normalizedY = (pt.value - min) / span;
      const y = height - paddingY - normalizedY * effectiveHeight;
      return { x, y, pt };
    });

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cpX = (curr.x + next.x) / 2;
      d += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
    }

    const last = pts[pts.length - 1];
    const area = `${d} L ${last.x} ${height} L ${pts[0].x} ${height} Z`;

    return {
      pathD: d,
      areaD: area,
      points: pts,
      latestPoint: last,
    };
  }, [hasValidData, filteredHistory, height]);

  // Honest visual bar when real holdings totals exist without historical daily snapshots
  if (!hasValidData) {
    if (isDark && investedValue != null && currentValue != null && currentValue > 0) {
      const maxBar = Math.max(investedValue, currentValue, 1);
      const investedPct = Math.max(12, Math.min(100, (investedValue / maxBar) * 100));
      const currentPct = Math.max(12, Math.min(100, (currentValue / maxBar) * 100));
      const isGain = currentValue >= investedValue;

      return (
        <View style={styles.snapshotBox}>
          <View style={styles.snapshotRow}>
            <Text style={styles.snapshotLabel}>Invested</Text>
            <View style={styles.snapshotTrack}>
              <View style={[styles.snapshotFillInvested, { width: `${investedPct}%` }]} />
            </View>
            <Text style={styles.snapshotNum}>₹{Math.round(investedValue).toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.snapshotRow}>
            <Text style={styles.snapshotLabel}>Current</Text>
            <View style={styles.snapshotTrack}>
              <View
                style={[
                  styles.snapshotFillCurrent,
                  {
                    width: `${currentPct}%`,
                    backgroundColor: isGain ? '#34D399' : '#F87171',
                  },
                ]}
              />
            </View>
            <Text style={styles.snapshotNum}>₹{Math.round(currentValue).toLocaleString('en-IN')}</Text>
          </View>

          <Text style={styles.snapshotHint}>
            Interactive growth curve unlocks automatically as daily folio NAV snapshots accumulate.
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.emptyContainer, isDark && styles.emptyContainerDark, { height }]}>
        <Text style={[styles.emptyTitle, isDark && { color: '#FFFFFF' }]}>Portfolio Trend</Text>
        <Text style={[styles.emptySubtitle, isDark && { color: '#CBD5E1' }]}>
          Historical growth chart populates once multiple daily portfolio snapshots are recorded.
        </Text>
      </View>
    );
  }

  const inspected = activeIdx !== null && points[activeIdx] ? points[activeIdx] : latestPoint;
  const startDate = filteredHistory[0]?.date ?? '';
  const endDate = filteredHistory[filteredHistory.length - 1]?.date ?? '';

  return (
    <View style={styles.container}>
      {inspected ? (
        <View style={styles.inspectRow}>
          <Text style={[styles.inspectDate, isDark && styles.inspectDateDark]}>
            {inspected.pt.date}
          </Text>
          <Text style={[styles.inspectVal, isDark && styles.inspectValDark]}>
            ₹{Math.round(inspected.pt.value).toLocaleString('en-IN')}
          </Text>
        </View>
      ) : null}

      <Svg width="100%" height={height} viewBox={`0 0 320 ${height}`}>
        <Defs>
          <LinearGradient id={`chartAreaGrad_${variant}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop
              offset="0%"
              stopColor={isDark ? '#F7941D' : colors.accent}
              stopOpacity={isDark ? '0.32' : '0.22'}
            />
            <Stop
              offset="100%"
              stopColor={isDark ? '#FFFFFF' : colors.primary}
              stopOpacity="0.00"
            />
          </LinearGradient>

          <LinearGradient id={`chartLineGrad_${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={isDark ? '#A5B4FC' : '#36358D'} />
            <Stop offset="70%" stopColor={isDark ? '#FFFFFF' : '#36358D'} />
            <Stop offset="100%" stopColor="#F7941D" />
          </LinearGradient>
        </Defs>

        <Line
          x1="12"
          y1={height * 0.3}
          x2="308"
          y2={height * 0.3}
          stroke={isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0'}
          strokeWidth="0.8"
          strokeDasharray="3 3"
        />
        <Line
          x1="12"
          y1={height * 0.7}
          x2="308"
          y2={height * 0.7}
          stroke={isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0'}
          strokeWidth="0.8"
          strokeDasharray="3 3"
        />

        <Path d={areaD} fill={`url(#chartAreaGrad_${variant})`} />
        <Path
          d={pathD}
          fill="none"
          stroke={`url(#chartLineGrad_${variant})`}
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {points.map((pt, i) => (
          <Circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={activeIdx === i || (activeIdx === null && i === points.length - 1) ? 4.5 : 2}
            fill={activeIdx === i || i === points.length - 1 ? '#F7941D' : isDark ? '#FFFFFF' : '#36358D'}
            opacity={activeIdx === i || i === points.length - 1 ? 1 : 0.45}
            onPress={() => setActiveIdx(i)}
          />
        ))}
      </Svg>

      <View style={styles.dateRow}>
        <Text style={[styles.dateLabel, isDark && styles.dateLabelDark]}>{startDate}</Text>
        <Text style={[styles.dateLabel, isDark && styles.dateLabelDark]}>{endDate}</Text>
      </View>

      <View style={[styles.rangeRow, isDark && styles.rangeRowDark]}>
        {RANGES.map((range) => {
          const active = selectedRange === range;
          return (
            <Pressable
              key={range}
              onPress={() => {
                setSelectedRange(range);
                setActiveIdx(null);
              }}
              style={[
                styles.rangePill,
                active && (isDark ? styles.rangePillActiveDark : styles.rangePillActive),
              ]}
            >
              <Text
                style={[
                  styles.rangeText,
                  isDark && styles.rangeTextDark,
                  active && (isDark ? styles.rangeTextActiveDark : styles.rangeTextActive),
                ]}
              >
                {range}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 6,
  },
  inspectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  inspectDate: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  inspectDateDark: {
    color: '#CBD5E1',
  },
  inspectVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#102A54',
  },
  inspectValDark: {
    color: '#FFFFFF',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 2,
  },
  dateLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  dateLabelDark: {
    color: 'rgba(255,255,255,0.65)',
  },
  rangeRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginTop: 10,
    gap: 2,
  },
  rangeRowDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  rangePill: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 7,
    alignItems: 'center',
  },
  rangePillActive: {
    backgroundColor: '#FFFFFF',
  },
  rangePillActiveDark: {
    backgroundColor: '#FFFFFF',
  },
  rangeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  rangeTextDark: {
    color: 'rgba(255,255,255,0.78)',
  },
  rangeTextActive: {
    color: '#36358D',
    fontWeight: '800',
  },
  rangeTextActiveDark: {
    color: '#36358D',
    fontWeight: '800',
  },
  snapshotBox: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: 8,
  },
  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  snapshotLabel: {
    width: 54,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  snapshotTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  snapshotFillInvested: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#A5B4FC',
  },
  snapshotFillCurrent: {
    height: '100%',
    borderRadius: 4,
  },
  snapshotNum: {
    width: 74,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  snapshotHint: {
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.66)',
    marginTop: 2,
  },
  emptyContainer: {
    width: '100%',
    backgroundColor: '#F8F9FD',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginVertical: 8,
  },
  emptyContainerDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default PortfolioChart;
