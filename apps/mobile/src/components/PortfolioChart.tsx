import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

interface PortfolioChartProps {
  history?: HistoryPoint[];
  currentValue?: number;
  height?: number;
}

export const PortfolioChart: React.FC<PortfolioChartProps> = ({
  history = [],
  currentValue = 0,
  height = 160,
}) => {
  const hasValidData = history && history.length >= 2;

  const { pathD, areaD, minVal, maxVal, latestPoint } = useMemo(() => {
    if (!hasValidData) return { pathD: '', areaD: '', minVal: 0, maxVal: 0, latestPoint: null };

    const values = history.map((h) => h.value).filter((v) => Number.isFinite(v));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;

    const width = 320;
    const paddingX = 16;
    const paddingY = 24;
    const effectiveWidth = width - paddingX * 2;
    const effectiveHeight = height - paddingY * 2;

    const points = history.map((pt, idx) => {
      const x = paddingX + (idx / (history.length - 1)) * effectiveWidth;
      const normalizedY = (pt.value - min) / span;
      const y = height - paddingY - normalizedY * effectiveHeight;
      return { x, y, pt };
    });

    // Build smooth cubic bezier curve
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpX = (curr.x + next.x) / 2;
      d += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
    }

    const last = points[points.length - 1];
    const area = `${d} L ${last.x} ${height} L ${points[0].x} ${height} Z`;

    return {
      pathD: d,
      areaD: area,
      minVal: min,
      maxVal: max,
      latestPoint: last,
    };
  }, [hasValidData, history, height]);

  if (!hasValidData) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <View style={styles.emptyIconBg}>
          <Text style={styles.emptyIcon}>📈</Text>
        </View>
        <Text style={styles.emptyTitle}>Portfolio Trend</Text>
        <Text style={styles.emptySubtitle}>
          Historical performance chart will populate as your portfolio grows over time.
        </Text>
      </View>
    );
  }

  const startDate = history[0]?.date ?? '';
  const endDate = history[history.length - 1]?.date ?? '';

  return (
    <View style={[styles.container, { height: height + 30 }]}>
      <Svg width="100%" height={height} viewBox={`0 0 320 ${height}`}>
        <Defs>
          <LinearGradient id="chartAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.22" />
            <Stop offset="50%" stopColor={colors.primary} stopOpacity="0.08" />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.00" />
          </LinearGradient>

          <LinearGradient id="chartLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#36358D" />
            <Stop offset="70%" stopColor="#36358D" />
            <Stop offset="100%" stopColor="#F7941D" />
          </LinearGradient>
        </Defs>

        {/* Faint Horizontal Reference Guides */}
        <Line x1="16" y1={height * 0.25} x2="304" y2={height * 0.25} stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3 3" />
        <Line x1="16" y1={height * 0.65} x2="304" y2={height * 0.65} stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3 3" />

        {/* Gradient Area Fill */}
        <Path d={areaD} fill="url(#chartAreaGrad)" />

        {/* Curved Trend Line */}
        <Path
          d={pathD}
          fill="none"
          stroke="url(#chartLineGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* Latest Data Node */}
        {latestPoint && (
          <>
            <Circle cx={latestPoint.x} cy={latestPoint.y} r={7} fill={colors.accent} opacity="0.3" />
            <Circle cx={latestPoint.x} cy={latestPoint.y} r={4.5} fill={colors.accent} />
            <Circle cx={latestPoint.x} cy={latestPoint.y} r={2} fill="#FFFFFF" />
          </>
        )}
      </Svg>

      {/* Axis Date Range Labels */}
      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>{startDate}</Text>
        <Text style={styles.dateLabel}>Actual Portfolio Trend</Text>
        <Text style={styles.dateLabel}>{endDate}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 4,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A0AEC0',
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
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  emptyIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyIcon: {
    fontSize: 22,
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
