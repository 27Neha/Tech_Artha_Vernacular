import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedHeroVisual } from '../components/AnimatedHeroVisual';
import { GrowthSproutBanner } from '../components/GrowthSproutBanner';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

export const WelcomeScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation('common');
  const { width: windowWidth, height: windowHeight, fontScale, rf, rlh } = useResponsive();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // Dynamic viewport & accessibility font-scale adaptation across all device sizes
  const effectiveFontScale = Math.max(1, fontScale || 1);
  const headerEstHeight = insets.top + 56;
  const bottomSafePadding = Math.max(insets.bottom + 10, 18);
  const usableHeight = Math.max(460, windowHeight - headerEstHeight - bottomSafePadding);

  const horizontalPadding = windowWidth < 360 ? 14 : windowWidth >= 600 ? 28 : 20;
  const contentWidth = Math.min(windowWidth - horizontalPadding * 2, 560);
  const isShortScreen = usableHeight < 610 || usableHeight / effectiveFontScale < 550;
  const isLargeFont = effectiveFontScale > 1.18;

  // Screen-size responsive font hierarchy (scales up on larger phones, down on compact phones)
  const baseTitleSize = isShortScreen ? 23.5 : usableHeight > 740 ? 27 : 25.5;
  const baseDescSize = isShortScreen ? 13.5 : usableHeight > 740 ? 15 : 14.5;
  const titleFontSize = rf(baseTitleSize);
  const descFontSize = rf(baseDescSize);
  const badgeFontSize = rf(10.5);
  const buttonFontSize = rf(16);
  const disclaimerFontSize = rf(10.5);

  // Reserve full natural aspect height for the sprout/leaf illustration (350x98 viewBox)
  // so 100% of both leaves, stem, sparkles, sunrise & waves always show without clipping
  const sproutNaturalHeight = Math.round(contentWidth * (98 / 350));
  const sproutMinHeight = Math.max(82, Math.min(118, sproutNaturalHeight));
  const sproutMaxHeight = Math.max(sproutMinHeight + 12, Math.round(usableHeight * 0.19));

  // Graph card adapts elastically around the remaining viewport so everything fits cleanly
  const heroMinHeight = Math.round(
    Math.min(305, Math.max(198, usableHeight * (isLargeFont ? 0.31 : 0.36))),
  );
  const heroMaxHeight = Math.round(Math.max(heroMinHeight + 24, usableHeight * 0.46));

  return (
    <View style={[styles.safe, { backgroundColor: isDark ? colors.canvas : '#F8F9FD' }]}>
      <StatusBar style={colors.statusBar} />

      {/* 1. Header: Official TechArtha Logo on left matching other screens, language selector on right */}
      <Header
        showLogo={true}
        logoSize="medium"
        showSettings={false}
        hideBack={true}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: isShortScreen ? 6 : 10,
            paddingBottom: bottomSafePadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
      >
        <View
          style={[
            styles.responsiveFrame,
            { gap: isShortScreen ? 6 : 10 },
          ]}
        >
          {/* 2 & 3. Welcome Headline & Supporting Subtitle */}
          <View style={styles.heroTextSection}>
            <Text
              style={[
                styles.title,
                {
                  fontSize: titleFontSize,
                  lineHeight: Math.round(titleFontSize * 1.26),
                  color: isDark ? colors.textPrimary : '#102A54',
                },
              ]}
            >
              {t('welcome.title', { defaultValue: 'Invest in your future, simply and securely.' })}
            </Text>

            <Text
              style={[
                styles.desc,
                {
                  fontSize: descFontSize,
                  lineHeight: Math.round(descFontSize * 1.44),
                  color: isDark ? colors.textSecondary : '#64748B',
                },
              ]}
            >
              {t('welcome.desc', {
                defaultValue: 'Small steps today. A brighter tomorrow.',
              })}
            </Text>
          </View>

          {/* 4, 5 & 6. Flexible Middle Showcase (Graph + Trust Badges + Full Sprout/Leaf Illustration) */}
          <View
            style={[
              styles.visualShowcaseSection,
              { gap: isShortScreen ? 6 : 10 },
            ]}
          >
            <AnimatedHeroVisual
              minHeight={heroMinHeight}
              maxHeight={heroMaxHeight}
              flexGrow={1}
            />

            <View style={styles.badgesWrapper}>
              <View
                style={[
                  styles.badge,
                  {
                    flexBasis: isLargeFont || windowWidth < 345 ? '46%' : '29%',
                    backgroundColor: isDark ? colors.surface : '#FFFFFF',
                    borderColor: isDark ? colors.border : '#E2E8F0',
                    paddingVertical: isShortScreen ? 7 : 9,
                  },
                ]}
              >
                <Text style={{ fontSize: rf(12) }}>🔒</Text>
                <Text
                  style={[
                    styles.badgeTextBase,
                    { fontSize: badgeFontSize, color: isDark ? colors.textPrimary : '#102A54' },
                  ]}
                  numberOfLines={3}
                >
                  {t('welcome.badge2', { defaultValue: 'AMFI Registered' })}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  {
                    flexBasis: isLargeFont || windowWidth < 345 ? '46%' : '29%',
                    backgroundColor: isDark ? colors.surface : '#FFFFFF',
                    borderColor: isDark ? colors.border : '#E2E8F0',
                    paddingVertical: isShortScreen ? 7 : 9,
                  },
                ]}
              >
                <Text style={{ fontSize: rf(12) }}>🏦</Text>
                <Text
                  style={[
                    styles.badgeTextBase,
                    { fontSize: badgeFontSize, color: isDark ? colors.textPrimary : '#102A54' },
                  ]}
                  numberOfLines={3}
                >
                  {t('welcome.badge1', { defaultValue: 'SEBI Compliant' })}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  {
                    flexBasis: isLargeFont || windowWidth < 345 ? '46%' : '29%',
                    backgroundColor: isDark ? colors.surface : '#FFFFFF',
                    borderColor: isDark ? colors.border : '#E2E8F0',
                    paddingVertical: isShortScreen ? 7 : 9,
                  },
                ]}
              >
                <Text style={{ fontSize: rf(12) }}>🇮🇳</Text>
                <Text
                  style={[
                    styles.badgeTextBase,
                    { fontSize: badgeFontSize, color: isDark ? colors.textPrimary : '#102A54' },
                  ]}
                  numberOfLines={3}
                >
                  {t('welcome.badge3', { defaultValue: 'Made for India' })}
                </Text>
              </View>
            </View>

            <GrowthSproutBanner
              minHeight={sproutMinHeight}
              maxHeight={sproutMaxHeight}
              flexGrow={0.4}
            />
          </View>

          {/* 7 & 8. Bottom Anchored Primary CTA & Concise Statutory Disclaimer */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                { minHeight: isShortScreen ? 50 : 54 },
                pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
              ]}
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="button"
              accessibilityLabel="Start Investing"
            >
              <Text style={[styles.primaryTextBase, { fontSize: buttonFontSize }]}>
                {t('welcome.start', { defaultValue: 'Start Investing' })}
              </Text>
              <View style={styles.arrowCircle}>
                <Text style={[styles.primaryArrowBase, { fontSize: rf(14) }]}>→</Text>
              </View>
            </Pressable>

            <Text
              style={[
                styles.disclaimerBase,
                {
                  fontSize: disclaimerFontSize,
                  lineHeight: rlh(15.5),
                  color: isDark ? colors.textSecondary : '#334155',
                },
              ]}
            >
              {t('disclaimer', {
                defaultValue:
                  'Mutual fund investments are subject to market risks. Read all scheme related documents carefully before investing.',
              })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  scroll: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  responsiveFrame: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    justifyContent: 'space-between',
  },
  heroTextSection: {
    width: '100%',
  },
  title: {
    fontWeight: '800',
    color: '#102A54',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  desc: {
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 12,
    fontWeight: '400',
  },
  visualShowcaseSection: {
    flexGrow: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  badgesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  badge: {
    flexGrow: 1,
    minWidth: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    gap: 5,
  },
  badgeTextBase: {
    fontWeight: '700',
    color: '#102A54',
    textAlign: 'center',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  actions: {
    width: '100%',
    paddingTop: 2,
  },
  primaryButton: {
    backgroundColor: '#36358D',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#36358D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  primaryTextBase: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginRight: 10,
    letterSpacing: -0.2,
    flexShrink: 1,
    textAlign: 'center',
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(247, 148, 29, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  primaryArrowBase: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginTop: -1,
  },
  disclaimerBase: {
    color: '#334155',
    textAlign: 'center',
    fontWeight: '700',
    paddingHorizontal: 8,
  },
});

export default WelcomeScreen;
