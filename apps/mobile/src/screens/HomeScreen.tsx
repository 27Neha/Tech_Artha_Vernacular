import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Header } from '../components/Header';
import { PortfolioChart } from '../components/PortfolioChart';
import { authStore } from '../store/auth';
import { api } from '../services/api/client';
import { useTranslation } from 'react-i18next';
import { colors, radii, shadows } from '../theme/tokens';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const HomeScreen = ({ name }: { name?: string }) => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const [profileName, setProfileName] = useState<string | null>(name ?? null);
  const [goals, setGoals] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [profile, setProfile] = useState('Moderate');
  const [recommendedFunds, setRecommendedFunds] = useState<any[]>([]);
  const [sipPlans, setSipPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const greeting = useMemo(() => {
    const raw = (profileName || name || '').trim();
    return raw ? raw.split(' ')[0] : 'Investor';
  }, [profileName, name]);

  const fetchData = useCallback(async () => {
    try {
      const token = authStore.accessToken;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const [goalsRes, portRes, profileRes, sipsRes, bucketsRes] = await Promise.all([
        fetch(`${API_URL}/goals`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
        api.get<any>('/portfolio').catch(async () => {
          const res = await fetch(`${API_URL}/portfolio`, { headers });
          return res.ok ? await res.json() : null;
        }),
        api.get<any>('/auth/profile').catch(async () => {
          const res = await fetch(`${API_URL}/users/profile`, { headers });
          return res.ok ? await res.json() : null;
        }),
        api.get<any>('/buckets/investments').catch(async () => {
          const res = await fetch(`${API_URL}/sips`, { headers });
          return res.ok ? await res.json() : null;
        }),
        api.get<any>('/buckets').catch(() => null),
      ]);

      if (Array.isArray(goalsRes)) setGoals(goalsRes);
      if (portRes?.data) setPortfolio(portRes.data);
      else if (portRes) setPortfolio(portRes);

      if (sipsRes?.plans) setSipPlans(sipsRes.plans);
      else if (Array.isArray(sipsRes)) setSipPlans(sipsRes);

      if (profileRes?.profile?.fullName) setProfileName(profileRes.profile.fullName);
      if (profileRes?.riskProfile?.category) {
        const cat = profileRes.riskProfile.category;
        setProfile(cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase());
      } else if (profileRes?.riskProfile) {
        setProfile(profileRes.riskProfile);
      }

      const recBucket = bucketsRes?.buckets?.find((b: any) => b.recommended);
      if (recBucket?.funds) {
        setRecommendedFunds(recBucket.funds.slice(0, 3));
      } else {
        const fundsRes = await fetch(`${API_URL}/funds?riskProfile=${profile}`);
        if (fundsRes.ok) {
          const fundsData = await fundsRes.json();
          if (Array.isArray(fundsData)) setRecommendedFunds(fundsData.slice(0, 3));
        }
      }
    } catch (e) {
      console.log('Error fetching dashboard data', e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="" />
      <ScrollView contentContainerStyle={styles.home} showsVerticalScrollIndicator={false}>
        {/* Welcome Salutation */}
        <View style={styles.headerBlock}>
          <View style={styles.eyebrowRow}>
            <View style={styles.accentIndicator} />
            <Text style={styles.eyebrow}>{t('dash.welcomeBack', { defaultValue: 'WELCOME BACK' })}</Text>
          </View>
          <Text style={styles.homeTitle}>
            {t('dash.hello', { defaultValue: 'Hello {{name}}', name: greeting }).replace(/\{\{?name\}\}?/g, greeting)} 👋
          </Text>
          <Text style={styles.homeSub}>{t('dash.subtitle', { defaultValue: 'Small steps today. A stronger tomorrow.' })}</Text>
        </View>
        
        {/* 3D Elevated Portfolio Summary Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceTopRow}>
            <Text style={styles.balanceLabel}>{t('dash.investmentJourney', { defaultValue: 'YOUR INVESTMENT JOURNEY' })}</Text>
            <View style={styles.amfiPill}>
              <Text style={styles.amfiPillText}>AMFI Registered</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginVertical: 14 }} />
          ) : (
            <View style={{ marginVertical: 4 }}>
              <Text style={styles.balance}>₹{(portfolio?.currentValue ?? 0).toLocaleString('en-IN')}</Text>
              <Text style={styles.balanceSub}>
                {t('port.totalInvested', { defaultValue: 'Total Invested:' })} ₹{(portfolio?.totalInvested ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          {/* Actual Historical Trend or Truthful Empty State */}
          <View style={styles.chartWrapper}>
            <PortfolioChart
              history={portfolio?.history}
              currentValue={portfolio?.currentValue ?? 0}
              height={130}
            />
          </View>

          <View style={styles.cardActionsRow}>
            <Pressable
              style={styles.primaryActionButton}
              onPress={() => navigation.navigate('Funds')}
            >
              <Text style={styles.primaryActionText}>{t('dash.browseFunds', { defaultValue: 'Browse Funds' })}</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryActionButton}
              onPress={() => navigation.navigate('Portfolio', { tab: 'Overview' })}
            >
              <Text style={styles.secondaryActionText}>{t('dash.viewDetails', { defaultValue: 'View Details' })} →</Text>
            </Pressable>
          </View>
        </View>

        {/* Goals Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('port.myGoals', { defaultValue: 'My Goals' })}</Text>
          {goals.length > 0 && (
            <Pressable onPress={() => navigation.navigate('GoalSelection')} hitSlop={8}>
              <Text style={styles.linkText}>{t('goals.createNewGoal', { defaultValue: '+ Plan Goal' })}</Text>
            </Pressable>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
        ) : goals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emoji}>🎯</Text>
            <Text style={styles.emptyTitle}>{t('goals.noGoalsTitle', { defaultValue: 'No goals created yet' })}</Text>
            <Text style={styles.emptyDesc}>
              {t('goals.noGoalsDesc', { defaultValue: 'Start planning for your future by setting a financial goal.' })}
            </Text>
            <Pressable style={styles.emptyCtaButton} onPress={() => navigation.navigate('GoalSelection')}>
              <Text style={styles.emptyCtaText}>{t('goals.planAGoal', { defaultValue: 'Plan a Goal' })}</Text>
            </Pressable>
          </View>
        ) : (
          goals.slice(0, 2).map((g) => {
            const p = g.progressPercentage || 0;
            const currentSaved = g.currentSavings || g.currentInvestmentValue || 0;
            return (
              <Pressable 
                key={g.id} 
                style={styles.goalCard}
                onPress={() => navigation.navigate('GoalDetails', { goalId: g.id, goalData: g })}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalTitle}>{g.name}</Text>
                    <Text style={styles.goalSubtitle}>{g.timePeriod} {t('common.years', { defaultValue: 'Years' })} · {g.bucketName || 'Bucket'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.targetAmount}>₹{g.targetAmount?.toLocaleString('en-IN')}</Text>
                    <Text style={styles.targetLabel}>{t('dash.target', { defaultValue: 'TARGET' }).toUpperCase()}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 8 }}>
                  <View style={styles.progressRow}>
                    <Text style={styles.savedText}>₹{currentSaved.toLocaleString('en-IN')} {t('dash.saved', { defaultValue: 'Saved' })}</Text>
                    <Text style={styles.percentText}>{p.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(p, 100)}%` }]} />
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
          
        {goals.length > 2 && (
          <Pressable
            onPress={() => navigation.navigate('Portfolio', { tab: 'Goals' })}
            style={styles.moreGoalsButton}
          >
            <Text style={styles.moreGoalsText}>{t('dash.seeMoreGoals', { defaultValue: 'See more goals' })} →</Text>
          </Pressable>
        )}

        {/* SIP Orders Section */}
        {sipPlans.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>{t('dash.yourOrders', { defaultValue: 'Your Orders' })}</Text>
            <View style={{ gap: 10 }}>
              {sipPlans.map((p) => (
                <View key={p.id} style={styles.sipCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.sipTitle, { flex: 1 }]} numberOfLines={1}>{p.fundName || 'Mutual Fund Investment'}</Text>
                    <View style={styles.badgeSuccess}>
                      <Text style={styles.badgeSuccessText}>
                        {p.statusLabel ? t(`status.${p.statusLabel.toLowerCase()}`, { defaultValue: p.statusLabel }) : 'PROCESSING'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.sipSubtitle}>
                    ₹{(p.amount ?? 0).toLocaleString('en-IN')} • {p.kind === 'plan' ? `${t('dash.monthly', { defaultValue: 'monthly' })} • ${t('dash.day', { defaultValue: 'day' })} ${p.installmentDay || 1}` : t('dash.oneTime', { defaultValue: 'one-time' })}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Recommended Funds */}
        <View style={[styles.sectionHeader, { marginTop: 26, alignItems: 'flex-start' }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{t('dash.forYourRiskProfile', { defaultValue: 'For your risk profile' })}</Text>
            <Text style={[styles.profileSubLabel, { marginTop: 4 }]}>
              {t('dash.basedOnProfile', { defaultValue: 'Based on: {{profile}}', profile }).replace(/\{\{?profile\}\}?/g, profile)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => navigation.navigate('InvestmentBuckets')}>
              <Text style={styles.linkText}>{t('dash.seeBuckets', { defaultValue: 'See Buckets' })}</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('RiskAssessment')}>
              <Text style={styles.linkText}>{t('dash.retake', { defaultValue: 'Retake' })}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          {recommendedFunds.map((fund, idx) => (
            <Pressable
              key={fund.schemeCode || idx}
              style={styles.fundCard}
              onPress={() => navigation.navigate('Funds')}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.fundCardTitle} numberOfLines={1}>{fund.name || fund.schemeName}</Text>
                <View style={styles.fundBadge}>
                  <Text style={styles.fundBadgeText}>
                    {fund.category ? t(`category.${fund.category.toLowerCase().replace(/\s+/g, '')}`, { defaultValue: fund.category }) : 'Mutual Fund'}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.fundNavText}>
                  ₹{fund.nav ? parseFloat(fund.nav).toFixed(2) : (fund.latestNav ? parseFloat(fund.latestNav).toFixed(2) : t('dash.na', { defaultValue: 'N/A' }))}
                </Text>
                <Text style={styles.fundArrow}>→</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Safety Assurances */}
        <View style={styles.safetyBanner}>
          <Text style={styles.safetyTitle}>🛡️ {t('dash.bankSecurity', { defaultValue: 'Bank-grade Security' })}</Text>
          <Text style={styles.safetyDesc}>
            {t('dash.bankSecurityDesc', { defaultValue: 'Your money is routed directly via SEBI-regulated AMCs and clearing corporations.' })}
          </Text>
        </View>

        {/* Learn Section */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Text style={styles.sectionTitle}>📚 {t('dash.learnAndGrow', { defaultValue: 'Learn & Grow' })}</Text>
        </View>
        <Pressable style={styles.learnBanner} onPress={() => navigation.navigate('Learn')}>
          <View style={styles.learnBannerIconWrapper}>
            <Text style={{ fontSize: 32 }}>🎓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.learnBannerTitle}>{t('dash.academyTitle', { defaultValue: 'TechArtha Academy' })}</Text>
            <Text style={styles.learnBannerDesc}>{t('dash.academyDesc', { defaultValue: 'Master the basics of mutual funds, SIPs, and risk management with our bite-sized lessons.' })}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <Text style={styles.linkText}>{t('dash.startLearning', { defaultValue: 'Start Learning' })}</Text>
              <Text style={[styles.linkText, { marginLeft: 4 }]}>→</Text>
            </View>
          </View>
        </Pressable>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  home: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 10 },
  headerBlock: { marginBottom: 8 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  accentIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  eyebrow: { color: colors.accentDark, fontSize: 11, letterSpacing: 1.4, fontWeight: '800' },
  homeTitle: { color: colors.textPrimary, fontSize: 30, textTransform: 'capitalize', fontWeight: '900', marginTop: 4 },
  homeSub: { color: colors.textSecondary, fontSize: 14, marginTop: 2 },

  // 3D Elevated Balance Card
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: radii['2xl'],
    padding: 22,
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...shadows.glowPrimary,
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '800',
  },
  amfiPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  amfiPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  balance: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 4,
  },
  balanceSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  chartWrapper: {
    marginTop: 10,
    marginBottom: 10,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  primaryActionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  primaryActionText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  secondaryActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 26,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  linkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  profileSubLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  // Goals Card
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: radii.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  emoji: {
    fontSize: 38,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  emptyCtaButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radii.md,
    ...shadows.buttonPrimary,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    marginBottom: 10,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  goalSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  targetAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  targetLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '800',
    marginTop: 1,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  savedText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
  },
  progressBarBg: {
    height: 7,
    backgroundColor: '#EDF2F7',
    borderRadius: 3.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3.5,
  },
  moreGoalsButton: {
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8F9FD',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 6,
  },
  moreGoalsText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },

  // SIP orders
  sipCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    ...shadows.card,
  },
  sipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sipSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  badgeSuccess: {
    backgroundColor: colors.status.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.status.successBorder,
  },
  badgeSuccessText: {
    color: colors.status.success,
    fontSize: 10,
    fontWeight: '800',
  },

  // Fund cards
  fundCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.card,
  },
  fundCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  fundBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  fundBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  fundNavText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  fundArrow: {
    color: '#CBD5E0',
    fontSize: 16,
    fontWeight: '800',
  },

  // Safety & Academy banners
  safetyBanner: {
    backgroundColor: '#EBEBFA',
    borderRadius: radii.lg,
    padding: 16,
    marginTop: 22,
    borderWidth: 1,
    borderColor: '#D8D8F6',
  },
  safetyTitle: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  safetyDesc: {
    color: colors.primaryDark,
    opacity: 0.85,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
    fontWeight: '600',
  },
  learnBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    ...shadows.card,
  },
  learnBannerIconWrapper: {
    backgroundColor: '#FFF4E8',
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  learnBannerTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  learnBannerDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },
});

export default HomeScreen;
