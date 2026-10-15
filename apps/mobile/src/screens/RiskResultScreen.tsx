import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { exitOnboarding } from '../utils/navigation';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { RiskometerGauge, RISK_CATEGORIES } from '../components/RiskometerGauge';

export const RiskResultScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const rawCategory = (route.params?.category || 'MODERATE').toUpperCase().replace(/\s+/g, '_');
  const score = Number(route.params?.score) || 35;

  // Category Configuration
  const categoryConfig =
    RISK_CATEGORIES.find((c) => c.key === rawCategory) ||
    RISK_CATEGORIES.find((c) => c.key === 'MODERATE')!;

  const label = categoryConfig.label;
  const color = categoryConfig.color;

  let desc = 'You prefer a balanced approach, seeking growth while taking measured risks to protect your capital.';
  let recommendedSplit = '55% / 45%';

  if (rawCategory === 'CONSERVATIVE') {
    desc = 'You prioritize capital preservation over high returns. You prefer stable, low-risk instruments.';
    recommendedSplit = '20% / 80%';
  } else if (rawCategory === 'MODERATELY_LOW') {
    desc = 'You seek capital stability with modest growth, willing to accept minimal short-term market fluctuations.';
    recommendedSplit = '35% / 65%';
  } else if (rawCategory === 'MODERATE') {
    desc = 'You prefer a balanced approach, seeking wealth growth while taking measured risks across assets.';
    recommendedSplit = '55% / 45%';
  } else if (rawCategory === 'MODERATELY_HIGH') {
    desc = 'You are focused on long-term capital appreciation and comfortable with moderate market volatility.';
    recommendedSplit = '70% / 30%';
  } else if (rawCategory === 'AGGRESSIVE') {
    desc = 'You are willing to accept higher market volatility for the potential of significant long-term wealth growth.';
    recommendedSplit = '85% / 15%';
  }

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="Your Risk Profile" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>Your Risk Profile is</Text>
          <View style={[styles.categoryBadge, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
            <Text style={[styles.category, { color }]}>{label}</Text>
          </View>

          {/* 5-Tier SEBI-Compliant Riskometer Gauge */}
          <View style={styles.gaugeWrapper}>
            <RiskometerGauge score={score} category={rawCategory} size={290} showLabels={true} />
          </View>

          <Text style={styles.description}>{desc}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Calculated Score</Text>
              <Text style={styles.statValue}>{score} / 60</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Recommended</Text>
              <Text style={styles.statValue}>Equity {recommendedSplit}</Text>
            </View>
          </View>
        </View>

        <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('GoalSelection')}>
          <Text style={styles.primaryBtnText}>Continue to Goal Planner</Text>
          <Text style={styles.primaryBtnText}>→</Text>
        </Pressable>

        {/* Reset rather than navigate: onboarding stack must not stay behind */}
        <Pressable style={styles.skipBtn} onPress={() => exitOnboarding(navigation)}>
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  container: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  category: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  gaugeWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 10,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8F9FB',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A0AEC0',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#102A54',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#3C3985',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  skipBtn: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  skipBtnText: {
    color: '#3C3985',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default RiskResultScreen;
