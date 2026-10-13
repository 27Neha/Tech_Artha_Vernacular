import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AnimatedHeroVisual } from '../components/AnimatedHeroVisual';
import { GrowthSproutBanner } from '../components/GrowthSproutBanner';
import { Header } from '../components/Header';
import { colors } from '../theme/tokens';

export const WelcomeScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation('common');
  const { height: windowHeight } = useWindowDimensions();

  // Responsive layout scaling: balanced allocation for header, graph, trust badges, sprout banner, and CTAs
  const isCompact = windowHeight < 740;
  const heroVisualHeight = isCompact ? 220 : windowHeight < 840 ? 250 : 270;

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />

      {/* 1. Header: Official TechArtha Logo on left matching other screens, language selector on right */}
      <Header
        showLogo={true}
        logoSize="medium"
        showSettings={false}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          isCompact && { paddingVertical: 6, paddingHorizontal: 16 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.mainContent}>
          {/* 2. Welcome Headline */}
          <Text style={[styles.title, isCompact && styles.titleCompact]}>
            {t('welcome.title', { defaultValue: 'Invest in your future, simply and securely.' })}
          </Text>

          {/* 3. Supporting Text */}
          <Text style={[styles.desc, isCompact && styles.descCompact]}>
            {t('welcome.desc', {
              defaultValue: 'Small steps today. A brighter tomorrow.',
            })}
          </Text>

          {/* 4. Main Interactive 3D Graph Card with Pointer Labels */}
          <AnimatedHeroVisual height={heroVisualHeight} />

          {/* 5. Three Trust Badges in Clean Horizontal Row */}
          <View style={styles.badgesWrapper}>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>🔒</Text>
              <Text style={styles.badgeText} numberOfLines={2}>
                {t('welcome.badge2', { defaultValue: 'AMFI Registered' })}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>🏦</Text>
              <Text style={styles.badgeText} numberOfLines={2}>
                {t('welcome.badge1', { defaultValue: 'SEBI Compliant' })}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>🇮🇳</Text>
              <Text style={styles.badgeText} numberOfLines={2}>
                {t('welcome.badge3', { defaultValue: 'Made for India' })}
              </Text>
            </View>
          </View>

          {/* 6. Creative Growth Sprout Illustration - Seamlessly Blended into Background */}
          <GrowthSproutBanner height={isCompact ? 72 : 86} />
        </View>

        {/* 7 & 8. Primary & Secondary Call to Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
            ]}
            onPress={() => navigation.navigate('Signup')}
            accessibilityRole="button"
            accessibilityLabel="Start Investing"
          >
            <Text style={styles.primaryText}>{t('welcome.start', { defaultValue: 'Start Investing' })}</Text>
            <View style={styles.arrowCircle}>
              <Text style={styles.primaryArrow}>→</Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.outlineButton,
              pressed && { backgroundColor: '#F8F9FE', borderColor: colors.primary },
            ]}
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
            accessibilityLabel="I already have an account"
          >
            <Text style={styles.outlineText}>
              {t('welcome.login', { defaultValue: 'I already have an account' })}
            </Text>
          </Pressable>

          {/* 9. Concise Statutory Mutual Fund Risk Disclaimer */}
          <Text style={styles.disclaimer}>
            {t('disclaimer', {
              defaultValue:
                'Mutual fund investments are subject to market risks. Read all scheme related documents carefully before investing.',
            })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 24,
  },
  mainContent: {
    width: '100%',
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: '#102A54',
    lineHeight: 34,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  titleCompact: {
    fontSize: 23,
    lineHeight: 29,
  },
  desc: {
    fontSize: 14.5,
    color: '#64748B',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
    fontWeight: '400',
  },
  descCompact: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  badgesWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
    width: '100%',
  },
  badge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    gap: 4,
  },
  badgeIcon: {
    fontSize: 11.5,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#102A54',
    textAlign: 'center',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  actions: {
    width: '100%',
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: '#36358D',
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#36358D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 10,
    letterSpacing: -0.2,
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(247, 148, 29, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryArrow: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginTop: -1,
  },
  outlineButton: {
    backgroundColor: '#FFFFFF',
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  outlineText: {
    color: '#36358D',
    fontSize: 14.5,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 9.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '500',
    paddingHorizontal: 12,
  },
});

export default WelcomeScreen;
