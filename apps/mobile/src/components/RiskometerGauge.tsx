import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';
import Svg, {
  Defs,
  Path,
  Circle,
  LinearGradient,
  Stop,
  Line,
} from 'react-native-svg';

export interface RiskCategoryConfig {
  key: string;
  label: string;
  fullTitle: string;
  color: string;
  bg: string;
  border: string;
  split: string;
  scoreRange: string;
  description: string;
}

export const RISK_CATEGORIES: RiskCategoryConfig[] = [
  {
    key: 'CONSERVATIVE',
    label: 'Conservative',
    fullTitle: 'Conservative Investor',
    color: '#10B981',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    split: '20% Equity / 80% Debt',
    scoreRange: '12 – 20',
    description:
      'You prioritize capital preservation over high returns and prefer stable, low-volatility instruments.',
  },
  {
    key: 'MODERATELY_LOW',
    label: 'Moderately Low',
    fullTitle: 'Moderately Low Investor',
    color: '#65A30D',
    bg: '#F7FEE7',
    border: '#BEF264',
    split: '35% Equity / 65% Debt',
    scoreRange: '21 – 29',
    description:
      'You seek capital stability with modest growth and are comfortable with minimal short-term fluctuations.',
  },
  {
    key: 'MODERATE',
    label: 'Moderate',
    fullTitle: 'Moderate Investor',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    split: '55% Equity / 45% Debt',
    scoreRange: '30 – 41',
    description:
      'You prefer a balanced approach, seeking steady wealth creation while taking measured risks across asset classes.',
  },
  {
    key: 'MODERATELY_HIGH',
    label: 'Moderately High',
    fullTitle: 'Moderately High Investor',
    color: '#EA580C',
    bg: '#FFF7ED',
    border: '#FED7AA',
    split: '70% Equity / 30% Debt',
    scoreRange: '42 – 50',
    description:
      'You focus on long-term capital appreciation and are comfortable riding through moderate market volatility.',
  },
  {
    key: 'AGGRESSIVE',
    label: 'Aggressive',
    fullTitle: 'Aggressive Investor',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    split: '85% Equity / 15% Debt',
    scoreRange: '51 – 60',
    description:
      'You accept higher short-term market volatility in pursuit of substantial long-term wealth creation.',
  },
];

interface RiskometerGaugeProps {
  score: number; // typically 12 to 60
  category: string; // 'CONSERVATIVE' | 'MODERATELY_LOW' | 'MODERATE' | 'MODERATELY_HIGH' | 'AGGRESSIVE'
  size?: number;
  showLabels?: boolean;
}

export const RiskometerGauge: React.FC<RiskometerGaugeProps> = ({
  score,
  category,
  size = 280,
  showLabels = true,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const animValue = useRef(new Animated.Value(0)).current;

  // Responsive gauge width adapting cleanly to small, medium, and large phones
  const responsiveWidth = Math.max(220, Math.min(size, windowWidth - 64));

  // Normalized category key
  const normalizedCat = (category || 'MODERATE').toUpperCase().replace(/\s+/g, '_');
  const activeCatIndex = Math.max(
    0,
    RISK_CATEGORIES.findIndex((c) => c.key === normalizedCat),
  );
  const activeCat = RISK_CATEGORIES[activeCatIndex] || RISK_CATEGORIES[2];

  // Map score + category to the 5 equal 36-degree sectors on the semicircle (0.0 to 1.0)
  // Sector centers are at 0.1, 0.3, 0.5, 0.7, 0.9
  const minScore = 12;
  const maxScore = 60;
  const numericScore = Number(score);
  const hasValidScore = Number.isFinite(numericScore) && numericScore > 0;
  const clampedScore = hasValidScore ? Math.max(minScore, Math.min(maxScore, numericScore)) : 36;

  // Compute progress within the matched category sector so the needle always points inside the active category segment
  const sectorWidth = 0.2;
  const sectorStart = activeCatIndex * sectorWidth;
  const sectorBounds: [number, number][] = [
    [12, 20],
    [21, 29],
    [30, 41],
    [42, 50],
    [51, 60],
  ];
  const [bMin, bMax] = sectorBounds[activeCatIndex] || [30, 41];
  const withinSectorRatio = hasValidScore
    ? Math.max(0.18, Math.min(0.82, (clampedScore - bMin) / Math.max(1, bMax - bMin)))
    : 0.5;
  const progressPercent = sectorStart + withinSectorRatio * sectorWidth;

  // Angle in standard SVG polar coordinates: 180 deg (left) down to 0 deg (right)
  const targetPolarDeg = 180 - progressPercent * 180;
  const [polarDeg, setPolarDeg] = useState(180);

  useEffect(() => {
    animValue.setValue(0);
    const id = animValue.addListener(({ value }) => {
      setPolarDeg(180 - value * (180 - targetPolarDeg));
    });
    Animated.timing(animValue, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => {
      animValue.removeListener(id);
    };
  }, [animValue, score, category, targetPolarDeg]);

  const width = responsiveWidth;
  const height = Math.round(width * 0.58);
  const cx = width / 2;
  const cy = height - 12;
  const radius = width * 0.41;
  const strokeWidth = Math.max(14, Math.round(width * 0.062));

  // Semicircle arc path
  const arcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  // Compute tick dividers for 5 equal 36-degree sectors
  const dividers = [1, 2, 3, 4].map((i) => {
    const angleDeg = 180 - i * 36;
    const rad = (Math.PI / 180) * angleDeg;
    const rInner = radius - strokeWidth / 2 - 1;
    const rOuter = radius + strokeWidth / 2 + 1;
    return {
      x1: cx + rInner * Math.cos(rad),
      y1: cy - rInner * Math.sin(rad),
      x2: cx + rOuter * Math.cos(rad),
      y2: cy - rOuter * Math.sin(rad),
    };
  });

  // Compute needle coordinates directly (avoids react-native-svg <G rotation> bugs on Android)
  const needleRad = (Math.PI / 180) * polarDeg;
  const needleLength = radius - 8;
  const tipX = cx + needleLength * Math.cos(needleRad);
  const tipY = cy - needleLength * Math.sin(needleRad);
  const perpRad = needleRad + Math.PI / 2;
  const halfBase = 4;
  const baseLeftX = cx + halfBase * Math.cos(perpRad);
  const baseLeftY = cy - halfBase * Math.sin(perpRad);
  const baseRightX = cx - halfBase * Math.cos(perpRad);
  const baseRightY = cy + halfBase * Math.sin(perpRad);
  const needlePath = `M ${baseLeftX} ${baseLeftY} L ${tipX} ${tipY} L ${baseRightX} ${baseRightY} Z`;

  return (
    <View style={[styles.container, { width: '100%' }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="risk5Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#10B981" />
            <Stop offset="25%" stopColor="#84CC16" />
            <Stop offset="50%" stopColor="#EAB308" />
            <Stop offset="75%" stopColor="#EA580C" />
            <Stop offset="100%" stopColor="#EF4444" />
          </LinearGradient>

          <LinearGradient id="pivotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#3C3985" />
            <Stop offset="100%" stopColor="#102A54" />
          </LinearGradient>
        </Defs>

        {/* Background Track Arc */}
        <Path
          d={arcPath}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* 5-tier Gradient Spectrum Arc */}
        <Path
          d={arcPath}
          fill="none"
          stroke="url(#risk5Grad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* White Sector Dividers for the 5 categories */}
        {dividers.map((d, idx) => (
          <Line
            key={`div-${idx}`}
            x1={d.x1}
            y1={d.y1}
            x2={d.x2}
            y2={d.y2}
            stroke="#FFFFFF"
            strokeWidth={2.5}
          />
        ))}

        {/* Needle Polygon */}
        <Path d={needlePath} fill="#102A54" opacity="0.95" />
        <Circle cx={tipX} cy={tipY} r={3.5} fill={activeCat.color} />

        {/* Center Hub / Pivot Cap */}
        <Circle cx={cx} cy={cy} r={14} fill="#E2E8F0" />
        <Circle cx={cx} cy={cy} r={10} fill="url(#pivotGrad)" />
        <Circle cx={cx} cy={cy} r={4} fill="#FFFFFF" opacity="0.9" />
      </Svg>

      {/* 5 Uniform Category Pills (Responsive Wrap, Identical Typography) */}
      {showLabels && (
        <View style={styles.labelsGrid}>
          {RISK_CATEGORIES.map((catItem) => {
            const isSelected = catItem.key === normalizedCat;
            return (
              <View
                key={catItem.key}
                style={[
                  styles.categoryChip,
                  isSelected && {
                    backgroundColor: catItem.bg,
                    borderColor: catItem.color,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <View
                  style={[
                    styles.indicatorDot,
                    { backgroundColor: catItem.color },
                    isSelected && styles.activeDot,
                  ]}
                />
                <Text
                  style={[
                    styles.labelText,
                    isSelected && { color: catItem.color, fontWeight: '800' },
                  ]}
                >
                  {catItem.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  labelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    width: '100%',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  indicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    lineHeight: 15,
  },
});

export default RiskometerGauge;
