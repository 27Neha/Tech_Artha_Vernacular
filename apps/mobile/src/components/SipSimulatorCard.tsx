import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import {
  computeSipProjection,
  formatIndianCompactCurrency,
} from '../utils/fundAnalytics';

interface SipSimulatorCardProps {
  onPlanGoalPress?: () => void;
}

const SIP_PRESETS = [2000, 5000, 10000, 25000];
const YEAR_PRESETS = [5, 10, 15, 20];
const RATE_PRESETS = [8, 10, 12, 14];

export const SipSimulatorCard: React.FC<SipSimulatorCardProps> = ({ onPlanGoalPress }) => {
  const [monthlySip, setMonthlySip] = useState(5000);
  const [years, setYears] = useState(10);
  const [ratePct, setRatePct] = useState(12);

  const projection = useMemo(
    () => computeSipProjection(monthlySip, years, ratePct),
    [monthlySip, years, ratePct],
  );

  const { valuePath, areaPath, investedPath, endPt } = useMemo(() => {
    const W = 300;
    const H = 112;
    const padX = 12;
    const padY = 14;
    const innerW = W - padX * 2;
    const innerH = H - padY * 2;
    const pts = projection.points;
    const maxY = Math.max(1, pts[pts.length - 1]?.value ?? 1);

    const toCoord = (idx: number, val: number) => {
      const x = padX + (idx / Math.max(1, pts.length - 1)) * innerW;
      const y = padY + innerH - (val / maxY) * innerH;
      return { x, y };
    };

    const valCoords = pts.map((p, idx) => toCoord(idx, p.value));
    const invCoords = pts.map((p, idx) => toCoord(idx, p.invested));

    const buildPath = (coords: { x: number; y: number }[]) =>
      coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');

    const vPath = buildPath(valCoords);
    const iPath = buildPath(invCoords);
    const last = valCoords[valCoords.length - 1];
    const first = valCoords[0];
    const aPath = `${vPath} L ${last.x.toFixed(1)} ${H} L ${first.x.toFixed(1)} ${H} Z`;

    return { valuePath: vPath, areaPath: aPath, investedPath: iPath, endPt: last };
  }, [projection]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="calculator-outline" size={16} color="#36358D" />
          </View>
          <View>
            <Text style={styles.title}>SIP Compounding Studio</Text>
            <Text style={styles.subtitle}>Interactive scenario explorer</Text>
          </View>
        </View>
        <View style={styles.rateTag}>
          <Text style={styles.rateTagText}>{ratePct}% p.a.</Text>
        </View>
      </View>

      {/* Output Summary Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>INVESTED</Text>
          <Text style={styles.metricVal}>{formatIndianCompactCurrency(projection.totalInvested)}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>ILLUSTRATIVE VALUE</Text>
          <Text style={[styles.metricVal, styles.metricValPrimary]}>
            {formatIndianCompactCurrency(projection.estimatedValue)}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>EST. GAIN</Text>
          <Text style={[styles.metricVal, styles.metricValGain]}>
            +{formatIndianCompactCurrency(projection.estimatedGain)}
          </Text>
        </View>
      </View>

      {/* Live SVG Curve: Invested vs Compounded */}
      <View style={styles.chartWrap}>
        <Svg width="100%" height={112} viewBox="0 0 300 112">
          <Defs>
            <LinearGradient id="sipAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#36358D" stopOpacity="0.24" />
              <Stop offset="100%" stopColor="#36358D" stopOpacity="0.01" />
            </LinearGradient>
          </Defs>
          <Line x1="12" y1="98" x2="288" y2="98" stroke="#E2E8F0" strokeWidth="1" />
          <Path d={areaPath} fill="url(#sipAreaGrad)" />
          <Path
            d={investedPath}
            fill="none"
            stroke="#94A3B8"
            strokeWidth={1.8}
            strokeDasharray="4 4"
          />
          <Path
            d={valuePath}
            fill="none"
            stroke="#36358D"
            strokeWidth={2.8}
            strokeLinecap="round"
          />
          {endPt && (
            <>
              <Circle cx={endPt.x} cy={endPt.y} r={6} fill="#F7941D" opacity={0.25} />
              <Circle cx={endPt.x} cy={endPt.y} r={3.5} fill="#F7941D" />
            </>
          )}
        </Svg>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#36358D' }]} />
            <Text style={styles.legendText}>Compounded Value</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#94A3B8' }]} />
            <Text style={styles.legendText}>Total Invested</Text>
          </View>
        </View>
      </View>

      {/* Tactile Preset Controls */}
      <View style={styles.controlGroup}>
        <Text style={styles.controlLabel}>Monthly SIP</Text>
        <View style={styles.pillRow}>
          {SIP_PRESETS.map((amt) => (
            <Pressable
              key={amt}
              onPress={() => setMonthlySip(amt)}
              style={[styles.pill, monthlySip === amt && styles.pillActive]}
            >
              <Text style={[styles.pillText, monthlySip === amt && styles.pillTextActive]}>
                ₹{(amt / 1000).toFixed(0)}k
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.twoColControls}>
        <View style={{ flex: 1 }}>
          <Text style={styles.controlLabel}>Horizon</Text>
          <View style={styles.pillRow}>
            {YEAR_PRESETS.map((yr) => (
              <Pressable
                key={yr}
                onPress={() => setYears(yr)}
                style={[styles.pillSm, years === yr && styles.pillActive]}
              >
                <Text style={[styles.pillText, years === yr && styles.pillTextActive]}>{yr}Y</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.controlLabel}>Assumed Rate</Text>
          <View style={styles.pillRow}>
            {RATE_PRESETS.map((rt) => (
              <Pressable
                key={rt}
                onPress={() => setRatePct(rt)}
                style={[styles.pillSm, ratePct === rt && styles.pillActive]}
              >
                <Text style={[styles.pillText, ratePct === rt && styles.pillTextActive]}>{rt}%</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.disclaimerText}>
          Illustrative mathematical projection only; mutual fund returns are market-linked and not guaranteed.
        </Text>
        {onPlanGoalPress ? (
          <Pressable style={styles.ctaBtn} onPress={onPlanGoalPress}>
            <Text style={styles.ctaBtnText}>Plan Goal</Text>
            <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E4F5',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEEDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#102A54',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  rateTag: {
    backgroundColor: '#FFF4E8',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rateTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DD6B20',
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F6F7FD',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  metricLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#102A54',
  },
  metricValPrimary: {
    color: '#36358D',
  },
  metricValGain: {
    color: '#059669',
  },
  chartWrap: {
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  controlGroup: {
    marginBottom: 10,
  },
  twoColControls: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  controlLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 5,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 5,
  },
  pill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  pillSm: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: '#36358D',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 9.5,
    color: '#94A3B8',
    lineHeight: 13,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#36358D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ctaBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default SipSimulatorCard;
