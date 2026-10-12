import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  Pattern,
  Circle,
  Rect,
  Path,
  LinearGradient,
  Stop,
  G,
  Line,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from '../theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AnimatedHeroVisualProps {
  height?: number;
}

export const AnimatedHeroVisual: React.FC<AnimatedHeroVisualProps> = ({ height = 190 }) => {
  const lineAnim = useRef(new Animated.Value(380)).current;
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Smooth illustrative line drawing animation (SVG strokeDashoffset)
    Animated.timing(lineAnim, {
      toValue: 0,
      duration: 1600,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Floating 3D motion loops
    const floatLoop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, {
          toValue: -7,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(floatAnim1, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );

    const floatLoop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, {
          toValue: 6,
          duration: 2700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(floatAnim2, {
          toValue: 0,
          duration: 2700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );

    // Radiant beacon breathing pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );

    floatLoop1.start();
    floatLoop2.start();
    pulseLoop.start();

    return () => {
      floatLoop1.stop();
      floatLoop2.stop();
      pulseLoop.stop();
    };
  }, [floatAnim1, floatAnim2, lineAnim, opacityAnim, pulseAnim, scaleAnim]);

  const pulseRadius = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 25],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.05],
  });

  return (
    <Animated.View
      style={[
        styles.outerCard,
        {
          height,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Visual Header / Micro-Indicator */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.headerPill}>
          <View style={styles.pulsingGreenDot} />
          <Text style={styles.headerPillText}>DISCIPLINED WEALTH COMPOUNDING</Text>
        </View>
        <Text style={styles.growthBadgeText}>LONG-TERM HORIZON</Text>
      </View>

      <View style={styles.svgWrapper}>
        <Svg width="100%" height="100%" viewBox="0 0 360 160" preserveAspectRatio="xMidYMid meet">
          <Defs>
            {/* Fine Dot Matrix Grid */}
            <Pattern id="dotMatrix" width="20" height="20" patternUnits="userSpaceOnUse">
              <Circle cx="2" cy="2" r="1.1" fill={colors.primary} opacity="0.08" />
            </Pattern>

            {/* Deep Indigo 3D Sphere Gradient */}
            <LinearGradient id="sphereIndigo" x1="20%" y1="0%" x2="80%" y2="100%">
              <Stop offset="0%" stopColor="#5B59C9" />
              <Stop offset="45%" stopColor="#36358D" />
              <Stop offset="100%" stopColor="#1B1A4D" />
            </LinearGradient>

            {/* Fintech Orange 3D Sphere Gradient */}
            <LinearGradient id="sphereOrange" x1="15%" y1="0%" x2="85%" y2="100%">
              <Stop offset="0%" stopColor="#FFB347" />
              <Stop offset="55%" stopColor="#F7941D" />
              <Stop offset="100%" stopColor="#C05621" />
            </LinearGradient>

            {/* Radiant Growth Curve Gradient: Indigo -> Royal Purple -> Fintech Orange -> Amber */}
            <LinearGradient id="growthCurveGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#36358D" stopOpacity="0.4" />
              <Stop offset="35%" stopColor="#36358D" stopOpacity="0.95" />
              <Stop offset="65%" stopColor="#4E4CB8" stopOpacity="1" />
              <Stop offset="88%" stopColor="#F7941D" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FFAE42" stopOpacity="1" />
            </LinearGradient>

            {/* Soft Luminous Area Gradient Fill Under Curve */}
            <LinearGradient id="areaFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#F7941D" stopOpacity="0.22" />
              <Stop offset="40%" stopColor="#4E4CB8" stopOpacity="0.10" />
              <Stop offset="80%" stopColor="#36358D" stopOpacity="0.03" />
              <Stop offset="100%" stopColor="#36358D" stopOpacity="0.00" />
            </LinearGradient>

            {/* Floating Ring Gradient */}
            <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#F7941D" stopOpacity="0.7" />
              <Stop offset="100%" stopColor="#36358D" stopOpacity="0.25" />
            </LinearGradient>
          </Defs>

          {/* Ambient Dot Matrix Surface */}
          <Rect width="100%" height="100%" fill="url(#dotMatrix)" />

          {/* Subtle Horizontal Milestone Reference Tracks */}
          <Line x1="16" y1="135" x2="344" y2="135" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />
          <Line x1="16" y1="95" x2="344" y2="95" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />
          <Line x1="16" y1="55" x2="344" y2="55" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />

          {/* Milestone Axis Labels */}
          <SvgText x="20" y="131" fontSize="8" fill="#94A3B8" fontWeight="600">Start / SIP</SvgText>
          <SvgText x="135" y="91" fontSize="8" fill="#94A3B8" fontWeight="600">Compounding Phase</SvgText>
          <SvgText x="250" y="51" fontSize="8" fill="#94A3B8" fontWeight="600">Wealth Acceleration</SvgText>

          {/* Area Fill Under Growth Curve */}
          <Path
            d="M 20 148 C 95 144, 140 128, 185 96 C 240 60, 275 42, 325 28 L 325 158 L 20 158 Z"
            fill="url(#areaFillGrad)"
          />

          {/* Subtle Under-curve Glow Path (Soft Indigo Blur Shadow) */}
          <Path
            d="M 20 148 C 95 144, 140 128, 185 96 C 240 60, 275 42, 325 28"
            fill="none"
            stroke="#36358D"
            strokeWidth="9"
            strokeLinecap="round"
            opacity="0.12"
          />

          {/* Progressive 3D Growth Curve */}
          <AnimatedPath
            d="M 20 148 C 95 144, 140 128, 185 96 C 240 60, 275 42, 325 28"
            fill="none"
            stroke="url(#growthCurveGrad)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={380}
            strokeDashoffset={lineAnim}
          />

          {/* Milestone Node 1: Disciplined Accumulation */}
          <AnimatedG y={floatAnim1 as any}>
            <Circle cx="60" cy="144" r="9" fill="#102A54" opacity="0.08" />
            <Circle cx="60" cy="144" r="6.5" fill="url(#sphereIndigo)" />
            <Circle cx="58" cy="142" r="2" fill="#FFFFFF" opacity="0.65" />
          </AnimatedG>

          {/* Milestone Node 2: Compounding Inflection with Badge */}
          <AnimatedG y={floatAnim2 as any}>
            {/* Floating Tag */}
            <Rect x="165" y="72" width="58" height="16" rx="8" fill="#FFF7ED" stroke="#FFEDD5" strokeWidth="1" />
            <SvgText x="194" y="83" fontSize="8" fill="#C05621" fontWeight="700" textAnchor="middle">SIP Boost</SvgText>
            {/* Inflection Node Sphere */}
            <Circle cx="185" cy="96" r="7.5" fill="url(#sphereOrange)" />
            <Circle cx="183" cy="94" r="2.2" fill="#FFFFFF" opacity="0.65" />
          </AnimatedG>

          {/* Floating 3D Geometric Ring Element */}
          <AnimatedG y={floatAnim1 as any}>
            <Circle
              cx="260"
              cy="115"
              r="18"
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <Circle cx="260" cy="115" r="10" fill="none" stroke="#E2E8F0" strokeWidth="1" opacity="0.4" />
          </AnimatedG>

          {/* Floating Micro-Particles (Depth field) */}
          <AnimatedCircle cx="110" cy="45" r="2.2" fill={colors.accent} opacity="0.35" y={floatAnim2 as any} />
          <AnimatedCircle cx="295" cy="78" r="2.5" fill={colors.primary} opacity="0.25" y={floatAnim1 as any} />
          <AnimatedCircle cx="40" cy="80" r="1.8" fill={colors.primary} opacity="0.2" y={floatAnim2 as any} />

          {/* Culminating Beacon Endpoint with Radiance */}
          <G>
            {/* Breathing Outer Radiance Ring */}
            <AnimatedCircle
              cx="325"
              cy="28"
              r={pulseRadius as any}
              fill={colors.accent}
              opacity={pulseOpacity as any}
            />
            {/* Middle Golden Aura */}
            <Circle cx="325" cy="28" r="12" fill={colors.accent} opacity="0.2" />
            {/* Solid Core Beacon */}
            <Circle cx="325" cy="28" r="7" fill={colors.accent} />
            <Circle cx="325" cy="28" r="3" fill="#FFFFFF" />
          </G>
        </Svg>
      </View>

      {/* Trust & Educational Footnote */}
      <View style={styles.cardFooter}>
        <Text style={styles.disclaimerText}>
          Illustrative compounding trajectory • Mutual fund investments are subject to market risks
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EDF2F7',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    marginVertical: 12,
    elevation: 4,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2FB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  pulsingGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38A169',
  },
  headerPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#36358D',
    letterSpacing: 0.4,
  },
  growthBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#718096',
    letterSpacing: 0.2,
  },
  svgWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F8F9FA',
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: 9,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 12,
  },
});

export default AnimatedHeroVisual;
