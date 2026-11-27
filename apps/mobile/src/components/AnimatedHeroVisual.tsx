import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Pressable, ScrollView } from 'react-native';
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
import { colors as brandTokens } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type ActiveHeroTab = 'compounding' | 'horizon';

export interface AnimatedHeroVisualProps {
  height?: number;
  minHeight?: number;
  maxHeight?: number;
  flexGrow?: number;
}

export const AnimatedHeroVisual: React.FC<AnimatedHeroVisualProps> = ({
  height = 280,
  minHeight,
  maxHeight,
  flexGrow,
}) => {
  const { colors, isDark } = useTheme();
  const { width: windowWidth, factor, rf } = useResponsive();
  const [activeTab, setActiveTab] = useState<ActiveHeroTab>('compounding');

  // Screen-size responsive typography inside the graph card & SVG pointer badges
  const tabFontSize = rf(windowWidth < 365 ? 9.2 : windowWidth > 420 ? 11 : 10.2);
  const captionFontSize = rf(9.8);
  const svgScale = Math.max(0.88, Math.min(1.16, factor));
  const svgFontSize = Number((8.6 * svgScale).toFixed(1));

  const pill1W = Math.round((activeTab === 'compounding' ? 72 : 76) * svgScale);
  const pill1H = Math.round(18.5 * svgScale);

  const pill2W = Math.round(120 * svgScale);
  const pill2H = Math.round(19.5 * svgScale);

  const pill3W = Math.round((activeTab === 'compounding' ? 122 : 116) * svgScale);
  const pill3H = Math.round(20 * svgScale);

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
          backgroundColor: isDark ? colors.surface : '#FFFFFF',
          borderColor: isDark ? colors.border : '#E2E8F0',
          minHeight: minHeight ?? height,
          ...(maxHeight ? { maxHeight } : {}),
          ...(flexGrow !== undefined ? { flexGrow } : { height }),
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* 2 Interactive Graph Titles with Horizontal Scroll & Zero Clipping */}
      <View style={styles.cardHeaderWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardHeaderScroll}
          bounces={false}
        >
          <Pressable
            onPress={() => handleTabChange('compounding')}
            hitSlop={8}
            accessibilityRole="tab"
            accessibilityState={{ selected: isCompounding }}
            accessibilityLabel="Disciplined Wealth Compounding"
            style={[
              styles.tabPillBase,
              { paddingHorizontal: windowWidth < 365 ? 8 : 10 },
              isCompounding
                ? [styles.activeTabPill, isDark && { backgroundColor: colors.surfaceMuted, borderColor: colors.primary }]
                : [styles.inactiveTabWrap, isDark && { backgroundColor: 'transparent', borderColor: colors.border }],
            ]}
          >
            <View
              style={[
                styles.tabIndicatorDot,
                { backgroundColor: isCompounding ? (isDark ? colors.primary : '#36358D') : '#CBD5E1' },
              ]}
            />
            <Text
              style={[
                isCompounding ? styles.activeTabTextBase : styles.inactiveTabTextBase,
                { fontSize: tabFontSize },
                isDark && { color: isCompounding ? colors.primary : colors.textSecondary },
              ]}
            >
              DISCIPLINED WEALTH COMPOUNDING
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleTabChange('horizon')}
            hitSlop={8}
            accessibilityRole="tab"
            accessibilityState={{ selected: !isCompounding }}
            accessibilityLabel="Long-Term Horizon"
            style={[
              styles.tabPillBase,
              { paddingHorizontal: windowWidth < 365 ? 8 : 10 },
              !isCompounding
                ? [styles.activeTabPill, isDark && { backgroundColor: colors.surfaceMuted, borderColor: brandTokens.accent }]
                : [styles.inactiveTabWrap, isDark && { backgroundColor: 'transparent', borderColor: colors.border }],
            ]}
          >
            <View
              style={[
                styles.tabIndicatorDot,
                { backgroundColor: !isCompounding ? brandTokens.accent : '#CBD5E1' },
              ]}
            />
            <Text
              style={[
                !isCompounding ? styles.activeTabTextBase : styles.inactiveTabTextBase,
                { fontSize: tabFontSize },
                isDark && { color: !isCompounding ? brandTokens.accent : colors.textSecondary },
              ]}
            >
              LONG-TERM HORIZON
            </Text>
          </Pressable>
        </ScrollView>
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

          {/* Point 1 Pointer Label: Placed safely BELOW curve at Y = 174 */}
          <G>
            <Rect
              x={12}
              y={174}
              width={pill1W}
              height={pill1H}
              rx={pill1H / 2}
              fill={isDark ? colors.surfaceElevated : '#FFFFFF'}
              stroke={isDark ? colors.border : '#E2E8F0'}
              strokeWidth={1}
            />
            <SvgText
              x={12 + pill1W / 2}
              y={174 + pill1H * 0.68}
              fontSize={svgFontSize}
              fill={isDark ? colors.textPrimary : '#102A54'}
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
              y2={(isCompounding ? 67 : 86) + pill2H}
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
                x={p2X - pill2W / 2}
                y={isCompounding ? 67 : 86}
                width={pill2W}
                height={pill2H}
                rx={pill2H / 2}
                fill={isDark ? colors.surfaceElevated : '#FFFFFF'}
                stroke={isDark ? colors.border : '#E2E8F0'}
                strokeWidth={1}
              />
              <SvgText
                x={p2X}
                y={(isCompounding ? 67 : 86) + pill2H * 0.68}
                fontSize={svgFontSize}
                fill={isDark ? colors.primary : '#36358D'}
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
              x={298 - pill3W}
              y={p3Y - pill3H / 2}
              width={pill3W}
              height={pill3H}
              rx={pill3H / 2}
              fill={isDark ? '#2D2118' : '#FFF7ED'}
              stroke={isDark ? '#7C2D12' : '#FFEDD5'}
              strokeWidth={1}
            />
            <SvgText
              x={298 - pill3W / 2}
              y={p3Y + svgFontSize * 0.36}
              fontSize={svgFontSize}
              fill={isDark ? '#FDBA74' : '#C05621'}
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
        <Text
          style={[
            styles.disclaimerTextBase,
            {
              fontSize: captionFontSize,
              color: isDark ? colors.textMuted : '#64748B',
            },
          ]}
        >
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
  cardHeaderWrapper: {
    width: '100%',
    marginBottom: 4,
  },
  cardHeaderScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexGrow: 1,
    gap: 8,
    paddingVertical: 2,
  },
  tabPillBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  activeTabPill: {
    backgroundColor: '#EEF0FB',
    borderWidth: 1,
    borderColor: '#D4D8F6',
  },
  inactiveTabWrap: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#36358D',
  },
  activeTabTextBase: {
    fontWeight: '800',
    color: '#36358D',
    letterSpacing: 0.3,
  },
  inactiveTabTextBase: {
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  svgWrapper: {
    flex: 1,
    minHeight: 155,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    paddingTop: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  disclaimerTextBase: {
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});

export default AnimatedHeroVisual;
