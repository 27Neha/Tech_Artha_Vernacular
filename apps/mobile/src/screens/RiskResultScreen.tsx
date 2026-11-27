import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exitOnboarding } from '../utils/navigation';
import { Header } from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { RiskometerGauge, RISK_CATEGORIES } from '../components/RiskometerGauge';
import { authStore } from '../store/auth';
import { API_URL } from '../services/api/client';
import { useTheme } from '../context/ThemeContext';

export const RiskResultScreen = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const paramCategory = route.params?.category
    ? String(route.params.category).toUpperCase().replace(/\s+/g, '_')
    : null;
  const paramScore = route.params?.score != null ? Number(route.params.score) : null;
  const paramReasons = Array.isArray(route.params?.reasons) ? route.params.reasons : null;

  const [categoryKey, setCategoryKey] = useState<string>(paramCategory || 'MODERATE');
  const [score, setScore] = useState<number>(paramScore && paramScore > 0 ? paramScore : 36);
  const [reasons, setReasons] = useState<string[]>(paramReasons || []);
  const [loadingLatest, setLoadingLatest] = useState<boolean>(!paramCategory || !paramScore);

  const loadPersistedRiskProfile = useCallback(async () => {
    try {
      const token = authStore.accessToken;
      if (token) {
        const res = await fetch(`${API_URL}/risk/latest`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);

        if (res && res.ok) {
          const latest = await res.json().catch(() => null);
          if (latest?.category && typeof latest?.score === 'number') {
            const normCat = String(latest.category).toUpperCase().replace(/\s+/g, '_');
            setCategoryKey(normCat);
            setScore(Number(latest.score));
            if (Array.isArray(latest.reasons)) {
              setReasons(latest.reasons);
            }
            await AsyncStorage.setItem('techartha_latest_risk_profile', JSON.stringify(latest)).catch(() => {});
            setLoadingLatest(false);
            return;
          }
        }
      }

      // Check local persisted cache if navigating back offline or before next sync
      const cached = await AsyncStorage.getItem('techartha_latest_risk_profile').catch(() => null);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.category && typeof parsed?.score === 'number') {
          setCategoryKey(String(parsed.category).toUpperCase().replace(/\s+/g, '_'));
          setScore(Number(parsed.score));
          if (Array.isArray(parsed.reasons)) {
            setReasons(parsed.reasons);
          }
        }
      }
    } catch {
      // Retain route params
    } finally {
      setLoadingLatest(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (paramCategory) {
        setCategoryKey(paramCategory);
      }
      if (paramScore && paramScore > 0) {
        setScore(paramScore);
      }
      if (paramReasons) {
        setReasons(paramReasons);
      }
      void loadPersistedRiskProfile();
    }, [paramCategory, paramScore, paramReasons, loadPersistedRiskProfile]),
  );

  // Category Configuration
  const categoryConfig =
    RISK_CATEGORIES.find((c) => c.key === categoryKey) ||
    RISK_CATEGORIES.find((c) => c.key === 'MODERATE')!;

  const label = categoryConfig.label;
  const color = categoryConfig.color;
  const desc = categoryConfig.description;
  const illustrativeSplit = categoryConfig.split.replace(' Equity / ', ' / ').replace(' Debt', '');

  return (
    <View style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <StatusBar style={colors.statusBar} />
      <Header title="Your Risk Profile" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Your Investor Risk Profile</Text>
          <View style={[styles.categoryBadge, { backgroundColor: categoryConfig.bg, borderColor: categoryConfig.border }]}>
            <Text style={[styles.category, { color }]}>{label} Investor</Text>
          </View>

          {loadingLatest ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#36358D" />
            </View>
          ) : (
            <View style={styles.gaugeWrapper}>
              <RiskometerGauge score={score} category={categoryConfig.key} size={290} showLabels={true} />
            </View>
          )}

          <Text style={[styles.description, { color: colors.textSecondary }]}>{desc}</Text>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: isDark ? colors.surfaceMuted : '#F8FAFC', borderColor: colors.border }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Calculated Score</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{score} / 60</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: isDark ? colors.surfaceMuted : '#F8FAFC', borderColor: colors.border }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Illustrative Mix</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>Equity {illustrativeSplit}</Text>
            </View>
          </View>

          {reasons.length > 0 && (
            <View style={[styles.reasonsBox, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF', borderColor: colors.border }]}>
              <Text style={styles.reasonsHeading}>Key Suitability Factors</Text>
              {reasons.map((r, idx) => (
                <View key={idx} style={styles.reasonRow}>
                  <Ionicons name="checkmark-circle" size={15} color="#36358D" style={{ marginTop: 2 }} />
                  <Text style={[styles.reasonText, { color: colors.textPrimary }]}>{r}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Option 1: Learn How (Riskometer Representation & Guidance) */}
          <Pressable
            style={({ pressed }) => [styles.actionCard, styles.learnHowCard, pressed && styles.actionPressed]}
            onPress={() => navigation.navigate('Article', { slug: 'understanding-risk' })}
            accessibilityRole="button"
            accessibilityLabel="Learn How: Understand what the Riskometer represents"
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#EBEBFA' }]}>
              <Ionicons name="school-outline" size={20} color="#36358D" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <Text style={styles.actionTitle}>Learn How</Text>
                <View style={styles.academyTag}>
                  <Text style={styles.academyTagText}>ACADEMY</Text>
                </View>
              </View>
              <Text style={styles.actionSubtitle}>
                What the Riskometer represents & how to understand your risk score
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#36358D" />
          </Pressable>

          {/* Option 2: How Is Your Score Calculated? */}
          <Pressable
            style={({ pressed }) => [styles.actionCard, styles.calcCard, pressed && styles.actionPressed]}
            onPress={() => navigation.navigate('Article', { slug: 'risk-score-calculation' })}
            accessibilityRole="button"
            accessibilityLabel="How Is Your Score Calculated?"
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#FFF4E5' }]}>
              <Ionicons name="calculator-outline" size={20} color="#F7941D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>How Is Your Score Calculated?</Text>
              <Text style={styles.actionSubtitle}>
                12 suitability factors & SEBI category formula explained
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F7941D" />
          </Pressable>
        </View>

        {/* All Investor Categories Section — Uniform Typography & Layout */}
        <View style={styles.categoriesCard}>
          <Text style={styles.categoriesSectionTitle}>Investor Risk Categories</Text>
          <Text style={styles.categoriesSectionSub}>
            Standardized 5-tier suitability classifications and illustrative asset mixes
          </Text>

          <View style={styles.categoriesList}>
            {RISK_CATEGORIES.map((item) => {
              const isCurrent = item.key === categoryConfig.key;
              return (
                <View
                  key={item.key}
                  style={[
                    styles.catItemCard,
                    isCurrent && {
                      backgroundColor: item.bg,
                      borderColor: item.color,
                      borderWidth: 1.5,
                    },
                  ]}
                >
                  <View style={styles.catItemHeader}>
                    <View style={styles.catTitleGroup}>
                      <View style={[styles.catColorDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.catItemTitle, isCurrent && { color: item.color }]}>
                        {item.fullTitle}
                      </Text>
                    </View>
                    <View style={[styles.catSplitBadge, { backgroundColor: isCurrent ? '#FFFFFF' : '#F1F5F9' }]}>
                      <Text style={styles.catSplitText}>Score {item.scoreRange}</Text>
                    </View>
                  </View>

                  <Text style={styles.catAllocText}>{item.split}</Text>
                  <Text style={styles.catItemDesc}>{item.description}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Pressable
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('InvestmentBuckets', { category: categoryConfig.key })}
        >
          <Text style={[styles.primaryBtnText, { flex: 1 }]}>View Suited Buckets</Text>
          <Text style={styles.primaryBtnText}>→</Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryBtn, { marginTop: 10 }]}
          onPress={() => navigation.navigate('GoalSelection')}
        >
          <Text style={styles.secondaryBtnText}>Continue to Goal Planner</Text>
        </Pressable>

        <Pressable style={styles.skipBtn} onPress={() => exitOnboarding(navigation, 'Home')}>
          <Text style={styles.skipBtnText}>Back to Dashboard</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  container: { padding: 18, paddingBottom: 40, alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    textAlign: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 14,
    maxWidth: '100%',
  },
  category: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  gaugeWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
    paddingHorizontal: 6,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginBottom: 8,
  },
  statBox: {
    flexGrow: 1,
    flexBasis: 130,
    backgroundColor: '#F8F9FB',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#102A54',
    textAlign: 'center',
  },
  reasonsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    gap: 6,
  },
  reasonsHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#36358D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#334155',
    fontWeight: '500',
  },
  actionCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 12,
    gap: 12,
  },
  learnHowCard: {
    backgroundColor: '#F9F9FE',
    borderColor: '#DEDBF7',
  },
  calcCard: {
    backgroundColor: '#FFFAF5',
    borderColor: '#FEE0C2',
  },
  actionPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
  },
  academyTag: {
    backgroundColor: '#EBEBFA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  academyTagText: {
    color: '#36358D',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  categoriesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  categoriesSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 4,
  },
  categoriesSectionSub: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  categoriesList: {
    gap: 10,
  },
  catItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  catTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  catColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
    lineHeight: 20,
    flexShrink: 1,
  },
  catSplitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catSplitText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  catAllocText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#36358D',
    marginBottom: 4,
    lineHeight: 17,
  },
  catItemDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    fontWeight: '500',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#36358D',
    minHeight: 54,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#36358D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#36358D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#36358D',
    fontSize: 15,
    fontWeight: '800',
  },
  skipBtn: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  skipBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default RiskResultScreen;
