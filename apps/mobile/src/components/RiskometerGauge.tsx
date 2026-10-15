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
import { colors } from '../theme/tokens';

interface RiskometerGaugeProps {
  score: number; // typically 12 to 60
  category: string; // 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'
  size?: number;
}

export const RiskometerGauge: React.FC<RiskometerGaugeProps> = ({
  score,
  category,
  size = 260,
}) => {
  const animValue = useRef(new Animated.Value(0)).current;

  // Calculate percentage and target angle
  // Normalized score range: 12 to 60 (standard risk survey range)
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
  const cy = height - 10;
  const radius = width * 0.42;
  const strokeWidth = 16;

  // Semicircle arc path helper
  // Arc from (-radius, 0) to (radius, 0) relative to (cx, cy)
  const arcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  return (
    <View style={[styles.container, { width, height: height + 36 }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {/* Semicircle Gradient Track (Conservative -> Moderate -> Aggressive) */}
          <LinearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#2B6CB0" />
            <Stop offset="32%" stopColor="#3182CE" />
            <Stop offset="45%" stopColor="#2F855A" />
            <Stop offset="65%" stopColor="#38A169" />
            <Stop offset="80%" stopColor="#DD6B20" />
            <Stop offset="100%" stopColor="#E53E3E" />
          </LinearGradient>

          {/* 3D Pivot Gradient */}
          <LinearGradient id="pivotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#36358D" />
            <Stop offset="100%" stopColor="#102A54" />
          </LinearGradient>
        </Defs>

        {/* Background Track Arc (Muted) */}
        <Path
          d={arcPath}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Gradient Spectrum Arc */}
        <Path
          d={arcPath}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Tick dividers */}
        {/* Conservative / Moderate boundary (~33%) */}
        {(() => {
          const angleRad = (Math.PI / 180) * 150; // 30 deg up from left
          const x1 = cx - (radius - strokeWidth / 2) * Math.cos(angleRad - Math.PI / 2);
          const y1 = cy - (radius - strokeWidth / 2) * Math.sin(angleRad - Math.PI / 2);
          const x2 = cx - (radius + strokeWidth / 2) * Math.cos(angleRad - Math.PI / 2);
          const y2 = cy - (radius + strokeWidth / 2) * Math.sin(angleRad - Math.PI / 2);
          return <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFFFFF" strokeWidth={2.5} />;
        })()}

        {/* Moderate / Aggressive boundary (~66%) */}
        {(() => {
          const angleRad = (Math.PI / 180) * 210;
          const x1 = cx - (radius - strokeWidth / 2) * Math.cos(angleRad - Math.PI / 2);
          const y1 = cy - (radius - strokeWidth / 2) * Math.sin(angleRad - Math.PI / 2);
          const x2 = cx - (radius + strokeWidth / 2) * Math.cos(angleRad - Math.PI / 2);
          const y2 = cy - (radius + strokeWidth / 2) * Math.sin(angleRad - Math.PI / 2);
          return <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFFFFF" strokeWidth={2.5} />;
        })()}

        {/* Needle Layer */}
        <G rotation={needleAngle} originX={cx} originY={cy}>
          {/* Needle drop shadow */}
          <Path
            d={`M ${cx - 3.5} ${cy} L ${cx} ${cy - radius + 10} L ${cx + 3.5} ${cy} Z`}
            fill="#102A54"
            opacity="0.9"
          />
          {/* Needle highlight accent tip */}
          <Circle cx={cx} cy={cy - radius + 11} r={3} fill="#F7941D" />
        </G>

        {/* 3D Center Hub / Pivot Cap */}
        <Circle cx={cx} cy={cy} r={14} fill="#E2E8F0" />
        <Circle cx={cx} cy={cy} r={10} fill="url(#pivotGrad)" />
        <Circle cx={cx} cy={cy} r={4} fill="#FFFFFF" opacity="0.9" />
      </Svg>

      {/* Ground labels */}
      <View style={[styles.labelsRow, { width: width - 20 }]}>
        <View style={styles.labelGroup}>
          <View style={[styles.indicatorDot, { backgroundColor: '#2B6CB0' }]} />
          <Text style={styles.labelText}>Conservative</Text>
        </View>
        <View style={styles.labelGroup}>
          <View style={[styles.indicatorDot, { backgroundColor: '#2F855A' }]} />
          <Text style={styles.labelText}>Moderate</Text>
        </View>
        <View style={styles.labelGroup}>
          <View style={[styles.indicatorDot, { backgroundColor: '#DD6B20' }]} />
          <Text style={styles.labelText}>Aggressive</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718096',
  },
});

export default RiskometerGauge;
