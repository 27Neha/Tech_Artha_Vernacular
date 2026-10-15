import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
  Defs,
  Path,
  Circle,
  LinearGradient,
  Stop,
  G,
  Line,
} from 'react-native-svg';

export interface RiskCategoryConfig {
  key: string;
  label: string;
  color: string;
  shortLabel?: string;
}

export const RISK_CATEGORIES: RiskCategoryConfig[] = [
  { key: 'CONSERVATIVE', label: 'Conservative', color: '#10B981', shortLabel: 'Cons.' },
  { key: 'MODERATELY_LOW', label: 'Moderately Low', color: '#84CC16', shortLabel: 'Mod. Low' },
  { key: 'MODERATE', label: 'Moderate', color: '#EAB308', shortLabel: 'Moderate' },
  { key: 'MODERATELY_HIGH', label: 'Moderately High', color: '#EA580C', shortLabel: 'Mod. High' },
  { key: 'AGGRESSIVE', label: 'Aggressive', color: '#EF4444', shortLabel: 'Aggr.' },
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
  const animValue = useRef(new Animated.Value(0)).current;

  // Normalized score range: 12 to 60 (standard 12-question risk survey range)
  const minScore = 12;
  const maxScore = 60;
  const safeScore = Math.max(minScore, Math.min(maxScore, Number(score) || 36));
  const progressPercent = (safeScore - minScore) / (maxScore - minScore); // 0.0 to 1.0

  // Needle angle: -90 degrees (far left / Conservative) to +90 degrees (far right / Aggressive)
  const targetAngle = -90 + progressPercent * 180;
  const [needleAngle, setNeedleAngle] = useState(-90);

  useEffect(() => {
    const id = animValue.addListener(({ value }) => {
      setNeedleAngle(-90 + value * (targetAngle - (-90)));
    });
    Animated.timing(animValue, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: false,
    }).start();
    return () => {
      animValue.removeListener(id);
    };
  }, [animValue, score, targetAngle]);

  const width = size;
  const height = size * 0.58;
  const cx = width / 2;
  const cy = height - 8;
  const radius = width * 0.42;
  const strokeWidth = 16;

  // Semicircle arc path helper
  const arcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  // Normalized category key
  const normalizedCat = (category || 'MODERATE').toUpperCase().replace(/\s+/g, '_');
  const activeCat = RISK_CATEGORIES.find((c) => c.key === normalizedCat) || RISK_CATEGORIES[2];

  // Helper to compute tick dividers for 5 equal 36-degree sectors:
  // Boundaries are at 180 - (36 * i) degrees for i = 1, 2, 3, 4
  const dividers = [1, 2, 3, 4].map((i) => {
    const angleDeg = 180 - i * 36;
    const rad = (Math.PI / 180) * angleDeg;
    const rInner = radius - strokeWidth / 2 - 1;
    const rOuter = radius + strokeWidth / 2 + 1;
    return {
      x1: cx - rInner * Math.cos(rad),
      y1: cy - rInner * Math.sin(rad),
      x2: cx - rOuter * Math.cos(rad),
      y2: cy - rOuter * Math.sin(rad),
    };
  });

  return (
    <View style={[styles.container, { width }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {/* 5-tier Smooth Spectrum Gradient */}
          <LinearGradient id="risk5Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#10B981" />
            <Stop offset="25%" stopColor="#84CC16" />
            <Stop offset="50%" stopColor="#EAB308" />
            <Stop offset="75%" stopColor="#EA580C" />
            <Stop offset="100%" stopColor="#EF4444" />
          </LinearGradient>

          {/* Pivot Gradient with TechArtha Brand Indigo */}
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

        {/* Needle Layer */}
        <G rotation={needleAngle} originX={cx} originY={cy}>
          {/* Needle drop shadow / body */}
          <Path
            d={`M ${cx - 3.5} ${cy} L ${cx} ${cy - radius + 8} L ${cx + 3.5} ${cy} Z`}
            fill="#102A54"
            opacity="0.95"
          />
          {/* Dynamic Category Color Needle Tip Accent */}
          <Circle cx={cx} cy={cy - radius + 9} r={3.5} fill={activeCat.color} />
        </G>

        {/* Center Hub / Pivot Cap */}
        <Circle cx={cx} cy={cy} r={14} fill="#E2E8F0" />
        <Circle cx={cx} cy={cy} r={10} fill="url(#pivotGrad)" />
        <Circle cx={cx} cy={cy} r={4} fill="#FFFFFF" opacity="0.9" />
      </Svg>

      {/* 5 Category Labels Row */}
      {showLabels && (
        <View style={[styles.labelsRow, { width: width - 8 }]}>
          {RISK_CATEGORIES.map((catItem) => {
            const isSelected = catItem.key === normalizedCat;
            return (
              <View key={catItem.key} style={styles.labelCol}>
                <View style={[styles.indicatorDot, { backgroundColor: catItem.color }, isSelected && styles.activeDot]} />
                <Text
                  style={[
                    styles.labelText,
                    isSelected && { color: catItem.color, fontWeight: '800' },
                  ]}
                  numberOfLines={2}
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
    marginVertical: 8,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 2,
  },
  labelCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  indicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginBottom: 4,
  },
  activeDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: '#102A54',
  },
  labelText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 12,
  },
});

export default RiskometerGauge;
