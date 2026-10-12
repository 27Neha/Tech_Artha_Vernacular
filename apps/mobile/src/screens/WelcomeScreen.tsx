import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AnimatedHeroVisual } from '../components/AnimatedHeroVisual';
import { Header } from '../components/Header';
import { TechArthaLogo } from '../components/TechArthaLogo';
import { colors, radii, shadows } from '../theme/tokens';

export const WelcomeScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation('common');
  const { height: windowHeight } = useWindowDimensions();

  // Responsive layout scaling for compact Android viewports vs large devices
  const isCompact = windowHeight < 740;
  const heroVisualHeight = isCompact ? 165 : windowHeight < 840 ? 185 : 210;

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      
      {/* Clean top bar: No squished header logo, language selector neatly on right */}
      <Header
        showLogo={false}
        showSettings={false}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          isCompact && { paddingVertical: 8, paddingHorizontal: 16 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.mainContent}>
          {/* Prominent Official TechArtha Logo (Single Instance in Composition) */}
          <View style={styles.logoHeroContainer}>
            <TechArthaLogo
              width={isCompact ? 185 : 215}
              height={isCompact ? 57 : 66}
            />
          </View>

          {/* Eyebrow Tag */}
          <View style={styles.eyebrowWrapper}>
            <View style={styles.eyebrowPill}>
              <Text style={styles.eyebrowIcon}>✨</Text>
              <Text style={styles.eyebrowText}>
                {t('welcome.badge', { defaultValue: 'MUTUAL FUNDS SIMPLIFIED' }).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Screen Headline */}
          <Text style={[styles.title, isCompact && styles.titleCompact]}>
            {t('welcome.title', { defaultValue: 'Invest in your future, simply and securely.' })}
          </Text>

          {/* Supporting Copy */}
          <Text style={[styles.desc, isCompact && styles.descCompact]}>
            {t('welcome.desc', {
              defaultValue: 'Smart, tailored mutual fund portfolios designed just for your financial goals.',
            })}
          </Text>

          {/* Premium 3D Financial Growth Animated Hero Visual */}
          <AnimatedHeroVisual height={heroVisualHeight} />

          {/* Unified Institutional Trust & Performance Banner */}
          <View style={styles.trustBanner}>
            <View style={styles.trustColumn}>
              <Text style={styles.trustValuePrimary}>₹1,200 Cr+</Text>
              <Text style={styles.trustLabel}>
                {t('welcome.stat2', { defaultValue: 'Assets Managed' })}
              </Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustColumn}>
              <Text style={styles.trustValueAccent}>50,000+</Text>
              <Text style={styles.trustLabel}>
                {t('welcome.stat1', { defaultValue: 'Active Investors' })}
              </Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustColumn}>
              <Text style={styles.trustValueDark}>AMFI & SEBI</Text>
              <Text style={styles.trustLabel}>Compliant MFD</Text>
            </View>
          </View>

          {/* Regulatory Trust Chips */}
          <View style={styles.trustChipsRow}>
            <View style={styles.trustChip}>
              <Text style={styles.trustChipIcon}>🛡️</Text>
              <Text style={styles.trustChipText}>AMFI Registered</Text>
            </View>
            <View style={styles.trustChip}>
              <Text style={styles.trustChipIcon}>🏛️</Text>
              <Text style={styles.trustChipText}>SEBI Compliant</Text>
            </View>
            <View style={styles.trustChip}>
              <Text style={styles.trustChipIcon}>🇮🇳</Text>
              <Text style={styles.trustChipText}>Made for India</Text>
            </View>
          </View>
        </View>

        {/* Primary & Secondary Call to Actions */}
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  mainContent: {
    width: '100%',
  },
  logoHeroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  eyebrowWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF0FB',
    borderWidth: 1,
    borderColor: '#E0E3FA',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.full,
    gap: 6,
  },
  eyebrowIcon: {
    fontSize: 11,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#36358D',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 25,
    fontWeight: '900',
    color: '#102A54',
    lineHeight: 33,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  titleCompact: {
    fontSize: 22,
    lineHeight: 29,
  },
  desc: {
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  descCompact: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 2,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 4,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  trustColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#EDF2F7',
  },
  trustValuePrimary: {
    fontSize: 15,
    fontWeight: '900',
    color: '#36358D',
    marginBottom: 2,
  },
  trustValueAccent: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F7941D',
    marginBottom: 2,
  },
  trustValueDark: {
    fontSize: 14,
    fontWeight: '900',
    color: '#102A54',
    marginBottom: 2,
  },
  trustLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  trustChipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  trustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  trustChipIcon: {
    fontSize: 11,
  },
  trustChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  actions: {
    marginTop: 6,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#36358D',
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#36358D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
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
    borderRadius: 14,
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
    paddingHorizontal: 8,
  },
});

export default WelcomeScreen;
