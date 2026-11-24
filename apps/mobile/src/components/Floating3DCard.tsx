import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

export type Floating3DVariant = 'hero' | 'hub' | 'light' | 'tab3d';

interface Floating3DCardProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
  ctaLabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant?: Floating3DVariant;
  accentColor?: string;
  badgeText?: string;
  active?: boolean;
  floatDelay?: number;
  onPress: () => void;
  style?: ViewStyle;
  testID?: string;
}

/**
 * True layered floating 3D-inspired glassmorphic navigation card.
 * Features multi-stop indigo/purple SVG gradients, subtle continuous floating motion,
 * 3D bottom ledge bevel + layered shadow depth, specular light sheen, and tactile spring press tilt.
 */
export const Floating3DCard: React.FC<Floating3DCardProps> = ({
  title,
  subtitle,
  eyebrow,
  ctaLabel,
  icon,
  variant = 'hub',
  accentColor = '#F7941D',
  badgeText,
  active = false,
  floatDelay = 0,
  onPress,
  style,
  testID,
}) => {
  const pressAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const timer = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 2100,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2100,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    }, floatDelay);

    return () => {
      clearTimeout(timer);
      loop?.stop();
    };
  }, [floatAnim, floatDelay]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 28,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  const animatedStyle = {
    transform: [
      { perspective: 900 },
      {
        translateY: Animated.add(
          floatAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -4],
          }),
          pressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 3],
          }),
        ),
      },
      {
        rotateX: pressAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '4deg'],
        }),
      },
      {
        scale: pressAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.968],
        }),
      },
    ],
  };

  const isDark = variant === 'hero' || variant === 'hub' || variant === 'tab3d';
  const gradId = `f3d_${variant}_${title.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <Animated.View style={[styles.depthStage, animatedStyle, style]}>
      {/* Soft floating shadow plinth underneath for real 3D elevation */}
      <View
        pointerEvents="none"
        style={[
          styles.floatingShadowPlinth,
          isDark ? styles.shadowPlinthDark : styles.shadowPlinthLight,
        ]}
      />

      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}`}
        style={[
          styles.outerShell,
          variant === 'hero' && styles.heroShell,
          variant === 'hub' && styles.hubShell,
          variant === 'tab3d' && styles.tab3dShell,
          variant === 'light' && styles.lightShell,
          active && styles.activeShell,
        ]}
      >
        {/* Layered SVG Gradient & Specular Reflections */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              {variant === 'hero' ? (
                <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#232262" />
                  <Stop offset="55%" stopColor="#38358E" />
                  <Stop offset="100%" stopColor="#5B54C2" />
                </LinearGradient>
              ) : variant === 'tab3d' ? (
                <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={active ? '#282678' : '#2E2C7E'} />
                  <Stop offset="60%" stopColor={active ? '#4B44B8' : '#433FA3'} />
                  <Stop offset="100%" stopColor={active ? '#645CE0' : '#5852BD'} />
                </LinearGradient>
              ) : variant === 'hub' ? (
                <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={active ? '#272575' : '#312F82'} />
                  <Stop offset="100%" stopColor={active ? '#5851C7' : '#4E49AD'} />
                </LinearGradient>
              ) : (
                <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#FFFFFF" />
                  <Stop offset="100%" stopColor="#EFEFFA" />
                </LinearGradient>
              )}
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradId})`} />
            <Circle
              cx="92%"
              cy="12%"
              r={variant === 'hero' ? '74' : '44'}
              fill={isDark ? '#FFFFFF' : '#36358D'}
              opacity={isDark ? '0.11' : '0.06'}
            />
            <Circle
              cx="14%"
              cy="96%"
              r={variant === 'hero' ? '56' : '32'}
              fill={accentColor}
              opacity={isDark ? '0.20' : '0.10'}
            />
          </Svg>
        </View>

        {/* Glassmorphic Top Rim Reflection */}
        <View
          style={[
            styles.topSheen,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.95)' },
          ]}
          pointerEvents="none"
        />

        {variant === 'hero' ? (
          <View style={styles.heroBody}>
            <View style={styles.heroTopRow}>
              <View style={styles.eyebrowPill}>
                <View style={[styles.eyebrowDot, { backgroundColor: accentColor }]} />
                <Text style={styles.eyebrowText}>{eyebrow || 'ARTHAVERSE'}</Text>
              </View>
              <View style={styles.heroIconOrb}>
                <Ionicons name={icon} size={22} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSubtitle} numberOfLines={2}>
              {subtitle}
            </Text>

            <View style={styles.heroFooter}>
              <View style={[styles.heroCtaPill, { backgroundColor: accentColor }]}>
                <Text style={styles.heroCtaText}>{ctaLabel || 'Explore ArthaVerse'}</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </View>
              {badgeText ? <Text style={styles.heroBadgeText}>{badgeText}</Text> : null}
            </View>
          </View>
        ) : variant === 'tab3d' ? (
          <View style={styles.tab3dBody}>
            <View style={styles.tab3dTopRow}>
              <View style={styles.tab3dIconOrb}>
                <Ionicons name={icon} size={18} color="#FFFFFF" />
              </View>
              <View style={[styles.accentPip, { backgroundColor: accentColor }]} />
            </View>
            <View>
              <Text style={styles.tab3dTitle} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.tab3dSub} numberOfLines={2}>
                {subtitle}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.hubBody}>
            <View style={styles.hubTopRow}>
              <View
                style={[
                  styles.hubIconBadge,
                  isDark
                    ? {
                        backgroundColor: 'rgba(255,255,255,0.18)',
                        borderColor: 'rgba(255,255,255,0.32)',
                      }
                    : { backgroundColor: '#EEEDFA', borderColor: '#D8D9F6' },
                ]}
              >
                <Ionicons name={icon} size={18} color={isDark ? '#FFFFFF' : '#36358D'} />
              </View>
              {badgeText ? (
                <View
                  style={[
                    styles.hubBadge,
                    isDark
                      ? { backgroundColor: 'rgba(247,148,29,0.24)' }
                      : { backgroundColor: '#FFF4E8' },
                  ]}
                >
                  <Text
                    style={[
                      styles.hubBadgeText,
                      { color: isDark ? '#FFD199' : '#DD6B20' },
                    ]}
                  >
                    {badgeText}
                  </Text>
                </View>
              ) : (
                <Ionicons
                  name="arrow-forward-circle-outline"
                  size={18}
                  color={isDark ? 'rgba(255,255,255,0.82)' : '#36358D'}
                />
              )}
            </View>

            <Text
              style={[styles.hubTitle, !isDark && styles.hubTitleLight]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              style={[styles.hubSubtitle, !isDark && styles.hubSubtitleLight]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  depthStage: {
    position: 'relative',
    paddingBottom: 5,
  },
  floatingShadowPlinth: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 0,
    height: 14,
    borderRadius: 16,
  },
  shadowPlinthDark: {
    backgroundColor: 'rgba(35, 34, 98, 0.24)',
  },
  shadowPlinthLight: {
    backgroundColor: 'rgba(54, 53, 141, 0.14)',
  },
  outerShell: {
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderBottomWidth: 3.5,
  },
  heroShell: {
    borderColor: 'rgba(255,255,255,0.24)',
    borderBottomColor: '#1B1A52',
    shadowColor: '#232262',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  hubShell: {
    borderColor: 'rgba(255,255,255,0.22)',
    borderBottomColor: '#1E1C5A',
    shadowColor: '#232262',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  tab3dShell: {
    borderColor: 'rgba(255,255,255,0.24)',
    borderBottomColor: '#1D1B58',
    shadowColor: '#252468',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 6,
  },
  lightShell: {
    borderColor: '#DFE2F7',
    borderBottomColor: '#C5C8EC',
    shadowColor: '#36358D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  activeShell: {
    borderColor: '#F7941D',
    borderBottomColor: '#DD6B20',
    borderWidth: 1.5,
    borderBottomWidth: 3.5,
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: 1.5,
    borderRadius: 2,
  },
  heroBody: {
    padding: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.9,
  },
  heroIconOrb: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#E2E4FA',
    lineHeight: 19,
    marginBottom: 16,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 12,
  },
  heroCtaText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.78)',
  },
  tab3dBody: {
    padding: 13,
    width: 148,
    minHeight: 112,
    justifyContent: 'space-between',
  },
  tab3dTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tab3dIconOrb: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentPip: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tab3dTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  tab3dSub: {
    fontSize: 10.5,
    color: '#DCDFF8',
    lineHeight: 14,
  },
  hubBody: {
    padding: 14,
    minHeight: 112,
    justifyContent: 'space-between',
  },
  hubTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  hubIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  hubBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  hubTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  hubTitleLight: {
    color: '#102A54',
  },
  hubSubtitle: {
    fontSize: 11.5,
    color: '#DCDFF8',
    lineHeight: 15.5,
  },
  hubSubtitleLight: {
    color: '#64748B',
  },
});

export default Floating3DCard;
