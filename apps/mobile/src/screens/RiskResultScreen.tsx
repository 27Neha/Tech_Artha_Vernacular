import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { RiskometerGauge } from '../components/RiskometerGauge';
import { colors, radii, shadows } from '../theme/tokens';

type RiskPayload = {
  data?: { score?: number; category?: string };
  category?: string;
  score?: number;
  explanation?: string[];
  disclaimer?: string;
};

export const RiskResultScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const payload: RiskPayload = route.params?.profile ?? {};
  const rawCat = route.params?.category ?? payload.data?.category ?? payload.category ?? 'MODERATE';
  const category = String(rawCat).toUpperCase();
  const score = route.params?.score ?? payload.data?.score ?? payload.score ?? 35;
  const reasons = payload.explanation ?? [];

  let label = 'Moderate';
  let desc = 'You prefer a balanced approach, seeking growth while taking measured risks to protect your capital.';
  let themeColor = colors.risk.moderate;
  let bgBadgeColor = colors.risk.moderateMuted;

  if (category === 'CONSERVATIVE') {
    label = 'Conservative';
    desc = 'You prioritize capital preservation over high returns. You prefer stable, low-risk investments.';
    themeColor = colors.risk.conservative;
    bgBadgeColor = colors.risk.conservativeMuted;
  } else if (category === 'AGGRESSIVE') {
    label = 'Aggressive';
    desc = 'You are willing to accept higher market volatility for the potential of significant long-term growth.';
    themeColor = colors.risk.aggressive;
    bgBadgeColor = colors.risk.aggressiveMuted;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="Your Risk Profile" />
      
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* 3D Elevated Results Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderEyebrow}>Assessed Investor Profile</Text>
          
          <View style={[styles.categoryBadge, { backgroundColor: bgBadgeColor, borderColor: themeColor }]}>
            <Text style={[styles.categoryText, { color: themeColor }]}>{label}</Text>
          </View>

          {/* Precision Animated Vector Riskometer */}
          <RiskometerGauge
            score={Number(score)}
            category={category}
            size={280}
          />

          <Text style={styles.description}>{desc}</Text>

          {/* Score & Bucket Summary */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Calculated Score</Text>
              <Text style={styles.statValue}>{score} / 60</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Matching Bucket</Text>
              <Text style={[styles.statValue, { color: themeColor }]}>{label} Bucket</Text>
            </View>
          </View>

          {reasons.length > 0 && (
            <View style={styles.reasonsBox}>
              <Text style={styles.reasonsTitle}>Assessment Rationale</Text>
              {reasons.map((reason, i) => (
                <Text key={i} style={styles.reasonText}>• {reason}</Text>
              ))}
            </View>
          )}

          <Text style={styles.disclaimer}>
            {payload.disclaimer ??
              'This investor profile is a suitability assessment conducted per AMFI/SEBI norms and does not guarantee investment returns. Mutual fund investments are subject to market risks.'}
          </Text>
        </View>

        {/* Action Controls */}
        <View style={styles.actionBlock}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
            onPress={() => navigation.navigate('GoalSelection')}
          >
            <Text style={styles.primaryBtnText}>Continue to Goal Planner</Text>
            <Text style={styles.primaryBtnText}>→</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.outlineBtn,
              pressed && { backgroundColor: '#F1F5F9' },
            ]}
            onPress={() => navigation.navigate('RiskAssessment')}
          >
            <Text style={styles.outlineBtnText}>Retake Assessment</Text>
          </Pressable>

          <Pressable style={styles.skipBtn} onPress={() => navigation.navigate('MainTabs')} hitSlop={10}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  container: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii['2xl'],
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8ECF4',
    ...shadows.cardElevated,
    marginBottom: 20,
  },
  cardHeaderEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8F9FD',
    padding: 14,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  reasonsBox: {
    alignSelf: 'stretch',
    backgroundColor: '#F8F9FD',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  actionBlock: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: radii.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.buttonPrimary,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  outlineBtn: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    ...shadows.card,
  },
  outlineBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  skipBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  skipBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default RiskResultScreen;
