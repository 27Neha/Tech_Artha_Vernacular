import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Pressable } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  Line,
  Rect,
  G,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from '../theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type ActiveHeroTab = 'compounding' | 'horizon';

export interface AnimatedHeroVisualProps {
  height?: number;
}

export const AnimatedHeroVisual: React.FC<AnimatedHeroVisualProps> = ({ height = 280 }) => {
  const [activeTab, setActiveTab] = useState<ActiveHeroTab>('compounding');

  const lineAnim = useRef(new Animated.Value(450)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const transitionAnim = useRef(new Animated.Value(1)).current;

  // Entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 750,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Line drawing animation
    Animated.timing(lineAnim, {
      toValue: 0,
      duration: 1200,
      delay: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [lineAnim, opacityAnim, scaleAnim]);

  // Smooth, fluid tab switching transition
  const handleTabChange = (tab: ActiveHeroTab) => {
    if (tab === activeTab) return;

    Animated.sequence([
      Animated.timing(transitionAnim, {
        toValue: 0.25,
        duration: 110,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(transitionAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    lineAnim.setValue(450);
    Animated.timing(lineAnim, {
      toValue: 0,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    setActiveTab(tab);
  };

  const isCompounding = activeTab === 'compounding';

  // Curve A (Disciplined Compounding): Steady, progressive upward momentum
  const curveA = 'M 30 158 C 100 150, 165 124, 218 88 C 262 58, 296 42, 324 30';
  const shadowA = 'M 30 162 C 100 154, 165 128, 218 92 C 262 62, 296 46, 324 34';
  const highlightA = 'M 30 157 C 100 149, 165 123, 218 87 C 262 57, 296 41, 324 29';
  const areaA = 'M 30 158 C 100 150, 165 124, 218 88 C 262 58, 296 42, 324 30 L 324 165 L 30 165 Z';

  // Curve B (Long-Term Horizon): Gradual patient foundation then soaring exponential flight
  const curveB = 'M 30 162 C 110 164, 165 158, 205 132 C 248 106, 285 54, 324 18';
  const shadowB = 'M 30 166 C 110 168, 165 162, 205 136 C 248 110, 285 58, 324 22';
  const highlightB = 'M 30 161 C 110 163, 165 157, 205 131 C 248 105, 285 53, 324 17';
  const areaB = 'M 30 162 C 110 164, 165 158, 205 132 C 248 106, 285 54, 324 18 L 324 165 L 30 165 Z';

  // Dynamic positions for nodes & pointer labels
  // Point 1 (Start / Early Years)
  const p1X = 30;
  const p1Y = isCompounding ? 158 : 162;

  // Point 2 (Consistent Investing / Growing Over Time)
  const p2X = isCompounding ? 175 : 205;
  const p2Y = isCompounding ? 116 : 132;

  // Point 3 (Compounding Growth / Long-Term Horizon)
  const p3X = 324;
  const p3Y = isCompounding ? 30 : 18;

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
      {/* 2 Compact Interactive Tabs at top */}
      <View style={styles.cardHeaderRow}>
        <Pressable
          onPress={() => handleTabChange('compounding')}
          hitSlop={10}
          accessibilityRole="tab"
          accessibilityState={{ selected: isCompounding }}
          accessibilityLabel="Disciplined Wealth Compounding"
        >
          {isCompounding ? (
            <View style={styles.activeTabPill}>
              <View style={styles.tabIndicatorDot} />
              <Text style={styles.activeTabText}>DISCIPLINED WEALTH COMPOUNDING</Text>
            </View>
          ) : (
            <View style={styles.inactiveTabWrap}>
              <Text style={styles.inactiveTabText}>DISCIPLINED WEALTH COMPOUNDING</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={() => handleTabChange('horizon')}
          hitSlop={10}
          accessibilityRole="tab"
          accessibilityState={{ selected: !isCompounding }}
          accessibilityLabel="Long-Term Horizon"
        >
          {!isCompounding ? (
            <View style={styles.activeTabPill}>
              <View style={[styles.tabIndicatorDot, { backgroundColor: colors.accent }]} />
              <Text style={styles.activeTabText}>LONG-TERM HORIZON</Text>
            </View>
          ) : (
            <View style={styles.inactiveTabWrap}>
              <Text style={styles.inactiveTabText}>LONG-TERM HORIZON</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* 3D Visual Metaphor with Dimensional Layering & Pointer Labels */}
      <Animated.View style={[styles.svgWrapper, { opacity: transitionAnim }]}>
        <Svg width="100%" height="100%" viewBox="0 0 350 205" preserveAspectRatio="xMidYMid meet">
          <Defs>
            {/* Soft Ambient Apex Lighting */}
            <LinearGradient id="apexAura" x1="100%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#4E4CB8" stopOpacity="0.09" />
              <Stop offset="50%" stopColor="#36358D" stopOpacity="0.03" />
              <Stop offset="100%" stopColor="#36358D" stopOpacity="0" />
            </LinearGradient>

            {/* 3D Core Curve Gradient: Indigo -> Royal Violet -> Electric Indigo -> Sunset Orange -> Amber */}
            <LinearGradient id="curve3DGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#36358D" stopOpacity="0.75" />
              <Stop offset="38%" stopColor="#4E4CB8" stopOpacity="0.95" />
              <Stop offset="68%" stopColor="#6366F1" stopOpacity="1" />
              <Stop offset="88%" stopColor="#F7941D" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FFAE42" stopOpacity="1" />
            </LinearGradient>

            {/* 3D Specular Highlight Ridge on Top Edge */}
            <LinearGradient id="specularGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <Stop offset="50%" stopColor="#E0E7FF" stopOpacity="0.65" />
              <Stop offset="85%" stopColor="#FFF2D6" stopOpacity="0.7" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.8" />
            </LinearGradient>

            {/* Luminous Area Gradient Fill Under Curve */}
            <LinearGradient id="growthAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#F7941D" stopOpacity="0.16" />
              <Stop offset="35%" stopColor="#4E4CB8" stopOpacity="0.08" />
              <Stop offset="75%" stopColor="#36358D" stopOpacity="0.02" />
              <Stop offset="100%" stopColor="#36358D" stopOpacity="0.00" />
            </LinearGradient>

            {/* 3D Sphere Spherical Gradient */}
            <LinearGradient id="sphere3DGrad" x1="20%" y1="10%" x2="80%" y2="90%">
              <Stop offset="0%" stopColor="#FFD188" />
              <Stop offset="45%" stopColor="#F7941D" />
              <Stop offset="100%" stopColor="#B45309" />
            </LinearGradient>
          </Defs>

          {/* Soft ambient background lighting aura */}
          <Rect width="100%" height="100%" fill="url(#apexAura)" />

          {/* Calming minimal baseline guide */}
          <Line
            x1="20"
            y1="165"
            x2="330"
            y2="165"
            stroke="#F1F5F9"
            strokeWidth="1.2"
          />

          {/* Layer 1: Translucent Fluid Area Fill under the growth curve */}
          <Path
            d={isCompounding ? areaA : areaB}
            fill="url(#growthAreaGrad)"
          />

          {/* Layer 2: 3D Soft Drop Shadow underneath the curve */}
          <Path
            d={isCompounding ? shadowA : shadowB}
            fill="none"
            stroke="#102A54"
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.08"
          />

          {/* Layer 3: 3D Ambient Core Ribbon */}
          <AnimatedPath
            d={isCompounding ? curveA : curveB}
            fill="none"
            stroke="url(#curve3DGrad)"
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeDasharray={450}
            strokeDashoffset={lineAnim}
          />

          {/* Layer 4: 3D Specular Highlight Ridge Stroke along crest */}
          <AnimatedPath
            d={isCompounding ? highlightA : highlightB}
            fill="none"
            stroke="url(#specularGrad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={450}
            strokeDashoffset={lineAnim}
          />

          {/* ======================================================== */}
          {/* POINT 1: START / EARLY YEARS (Bottom Left)                */}
          {/* ======================================================== */}
          {/* Downward leader tick to badge below baseline */}
          <Line
            x1={p1X}
            y1={p1Y + 5}
            x2={p1X}
            y2={175}
            stroke="#CBD5E1"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          {/* 3D Foundation Node */}
          <Circle cx={p1X} cy={p1Y} r="7" fill="#36358D" opacity="0.12" />
          <Circle cx={p1X} cy={p1Y} r="4" fill="#36358D" />
          <Circle cx={p1X - 1} cy={p1Y - 1} r="1.3" fill="#FFFFFF" opacity="0.9" />

          {/* Point 1 Pointer Label: Placed safely BELOW curve at Y = 175 */}
          <G>
            <Rect
              x={14}
              y={175}
              width={isCompounding ? 68 : 72}
              height={18}
              rx={9}
              fill="#FFFFFF"
              stroke="#E2E8F0"
              strokeWidth={1}
            />
            <SvgText
              x={isCompounding ? 48 : 50}
              y={187.5}
              fontSize="8.5"
              fill="#102A54"
              fontWeight="800"
              textAnchor="middle"
            >
              {isCompounding ? 'Start / SIP' : 'Early Years'}
            </SvgText>
          </G>

          {/* ======================================================== */}
          {/* POINT 2: CONSISTENT INVESTING / GROWING OVER TIME (Mid)  */}
          {/* ======================================================== */}
          <G>
            {/* Upward leader tick line to badge placed safely ABOVE */}
            <Line
              x1={p2X}
              y1={p2Y - 7}
              x2={p2X}
              y2={isCompounding ? 87 : 106}
              stroke="#CBD5E1"
              strokeWidth="1"
              strokeDasharray="2 2"
            />

            {/* 3D Spherical Node with Specular Glint */}
            <Circle cx={p2X} cy={p2Y} r="9" fill={colors.accent} opacity="0.16" />
            <Circle cx={p2X} cy={p2Y} r="5" fill="url(#sphere3DGrad)" />
            <Circle cx={p2X - 1.2} cy={p2Y - 1.2} r="1.5" fill="#FFFFFF" opacity="0.9" />

            {/* Point 2 Pointer Label: Placed cleanly ABOVE the curve */}
            <G>
              <Rect
                x={isCompounding ? p2X - 58 : p2X - 58}
                y={isCompounding ? 68 : 87}
                width={116}
                height={19}
                rx={9.5}
                fill="#FFFFFF"
                stroke="#E2E8F0"
                strokeWidth={1}
              />
              <SvgText
                x={p2X}
                y={isCompounding ? 80.5 : 99.5}
                fontSize="8.5"
                fill="#36358D"
                fontWeight="800"
                textAnchor="middle"
              >
                {isCompounding ? 'Consistent Investing' : 'Growing Over Time'}
              </SvgText>
            </G>
          </G>

          {/* ======================================================== */}
          {/* POINT 3: COMPOUNDING GROWTH / LONG-TERM HORIZON (Apex)   */}
          {/* ======================================================== */}
          {/* Horizontal leader connector to the badge on the left */}
          <Line
            x1={p3X - 10}
            y1={p3Y}
            x2={298}
            y2={p3Y}
            stroke="#CBD5E1"
            strokeWidth="1"
            strokeDasharray="2 2"
          />

          {/* Point 3 Pointer Label: Placed safely to the LEFT of the beacon */}
          <G>
            <Rect
              x={isCompounding ? 180 : 184}
              y={isCompounding ? p3Y - 10 : p3Y - 10}
              width={isCompounding ? 116 : 112}
              height={20}
              rx={10}
              fill="#FFF7ED"
              stroke="#FFEDD5"
              strokeWidth={1}
            />
            <SvgText
              x={isCompounding ? 238 : 240}
              y={isCompounding ? p3Y + 3.5 : p3Y + 3.5}
              fontSize="8.5"
              fill="#C05621"
              fontWeight="800"
              textAnchor="middle"
            >
              {isCompounding ? 'Compounding Growth ★' : 'Long-Term Horizon'}
            </SvgText>
          </G>

          {/* Radiant Apex 3D Beacon with Breathing Aura */}
          <Circle cx={p3X} cy={p3Y} r={18} fill={colors.accent} opacity={0.14} />
          <Circle cx={p3X} cy={p3Y} r={11} fill={colors.accent} opacity={0.22} />
          <Circle cx={p3X} cy={p3Y} r={6} fill="url(#sphere3DGrad)" />
          <Circle cx={p3X} cy={p3Y} r={2.2} fill="#FFFFFF" />
        </Svg>
      </Animated.View>

      {/* Clean, minimal educational footnote */}
      <View style={styles.cardFooter}>
        <Text style={styles.disclaimerText}>
          Illustrative representation of compounding over time
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    marginVertical: 4,
    elevation: 3,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  activeTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF0FB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  inactiveTabWrap: {
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  tabIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#36358D',
  },
  activeTabText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#36358D',
    letterSpacing: 0.3,
  },
  inactiveTabText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#94A3B8',
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
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: 9.5,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});

export default AnimatedHeroVisual;
