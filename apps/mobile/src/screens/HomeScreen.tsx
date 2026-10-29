import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Header } from '../components/Header';
import { authStore } from '../store/auth';
import { useTranslation } from 'react-i18next';

const LEARN_CARDS = [
  { icon: 'Book', title: 'What is a Mutual Fund?', desc: 'Learn how pooled investments work and why they are great for beginners.', time: '5 min read', slug: 'what-is-mutual-fund' },
  { icon: 'Scales', title: 'SIP vs Lump Sum', desc: 'Which investment approach suits your financial situation better?', time: '4 min read', slug: 'sip-vs-lump-sum' },
  { icon: 'Shield', title: 'Understanding Risk', desc: 'Learn how to assess and manage investment risk for your goals.', time: '6 min read', slug: 'understanding-risk' },
  { icon: 'Chart', title: 'Reading Fund Performance', desc: 'Understand NAV, returns, and how to compare mutual funds.', time: '7 min read', slug: 'fund-performance' }
];

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const HomeScreen = ({ name }: { name: string }) => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const [goals, setGoals] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [profile, setProfile] = useState('');
  const [recommendedFunds, setRecommendedFunds] = useState<any[]>([]);
  const [sipPlans, setSipPlans] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  const greeting = useMemo(() => (name?.trim() ? name.trim().split(' ')[0] : 'there'), [name]);

  const fetchData = useCallback(async () => {
    try {
      const token = authStore.accessToken;
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };

      // Every request here is a route the API serves. This used to call /users/profile,
      // /sips and /funds?riskProfile=, none of which exist, so the profile, SIPs and
      // recommendations were always blank.
      const [goalsRes, portRes, profileRes, investmentsRes, bucketsRes] = await Promise.all([
        fetch(`${API_URL}/goals`, { headers }),
        fetch(`${API_URL}/portfolio`, { headers }),
        fetch(`${API_URL}/auth/profile`, { headers }),
        fetch(`${API_URL}/buckets/investments`, { headers }),
        fetch(`${API_URL}/buckets`, { headers }),
      ]);

      if (goalsRes.ok) setGoals(await goalsRes.json());
      if (portRes.ok) setPortfolio(await portRes.json());
      if (investmentsRes.ok) {
        const inv = await investmentsRes.json();
        setSipPlans([
          ...(inv.plans ?? []).map((p: any) => ({ ...p, kind: 'plan' })),
          ...(inv.orders ?? []).map((o: any) => ({ ...o, kind: 'order' })),
        ]);
      }
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const category: string | undefined = profileData.riskProfile?.category;
        setProfile(category ? category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, ' ') : 'Not assessed');
      }
      if (bucketsRes.ok) {
        // Reference funds from the bucket suited to the investor's profile.
        const { buckets } = await bucketsRes.json();
        const suited = (buckets ?? []).find((b: any) => b.recommended) ?? buckets?.[0];
        setRecommendedFunds((suited?.recommendedFunds ?? []).slice(0, 3));
      }
    } catch (e) {
      console.log('Error fetching dashboard data', e);
    } finally {
      setLoading(false);
    }
  }, []);

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
        <Text style={styles.eyebrow}>{t('dash.welcomeBack', { defaultValue: 'WELCOME BACK' })}</Text>
        <Text style={styles.homeTitle}>{t('dash.hello', { defaultValue: 'Hello {{name}}', name: greeting }).replace(/\\{\\{?name\\}\}?/g, greeting)} 👋</Text>
        <Text style={styles.homeSub}>{t('dash.subtitle', { defaultValue: 'Small steps today. A stronger tomorrow.' })}</Text>
        
        {/* Portfolio Summary Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('dash.investmentJourney', { defaultValue: 'YOUR INVESTMENT JOURNEY' })}</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" style={{ marginVertical: 8 }} />
          ) : (
            <>
              {/* From GET /portfolio (Cybrilla's holdings report); a dash when unknown, never a 0 we did not read. */}
              <Text style={styles.balance}>
                {portfolio?.totals?.current != null ? `₹${Math.round(portfolio.totals.current).toLocaleString('en-IN')}` : portfolio?.status === 'NO_ACCOUNT' ? '₹0' : '—'}
              </Text>
              <Text style={styles.balanceSub}>
                {t('port.totalInvested', { defaultValue: 'Total Invested:' })}{' '}
                {portfolio?.totals?.invested != null ? `₹${Math.round(portfolio.totals.invested).toLocaleString('en-IN')}` : portfolio?.status === 'NO_ACCOUNT' ? '₹0' : '—'}
              </Text>
            </>
          )}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
            <Pressable style={[styles.lightButton, { marginTop: 0 }]} onPress={() => navigation.navigate('Funds')}>
              <Text style={styles.lightButtonText}>{t('dash.browseFunds', { defaultValue: 'Browse Funds' })}</Text>
            </Pressable>
            <Pressable style={[styles.lightButton, { backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 0 }]} onPress={() => navigation.navigate('Portfolio', { tab: 'Overview' })}>
              <Text style={[styles.lightButtonText, { color: '#fff' }]}>{t('dash.viewDetails', { defaultValue: 'View Details' })}</Text>
              </Pressable>
          </View>
        </View>

        {/* Goals Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('port.myGoals', { defaultValue: 'My Goals' })}</Text>
          {goals.length > 0 && (
            <Pressable onPress={() => navigation.navigate('GoalSelection')}>
              <Text style={styles.linkText}>{t('goals.createNewGoal', { defaultValue: '+ Plan Goal' })}</Text>
            </Pressable>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3C3985" style={{ marginTop: 24 }} />
        ) : goals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emoji}>🎯</Text>
            <Text style={styles.emptyTitle}>{t('goals.noGoalsTitle', { defaultValue: 'No goals created yet' })}</Text>
            <Text style={styles.emptyDesc}>
              {t('goals.noGoalsDesc', { defaultValue: 'Start planning for your future by setting a financial goal.' })}
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('GoalSelection')}>
              <Text style={styles.primaryButtonText}>{t('goals.planAGoal', { defaultValue: 'Plan a Goal' })}</Text>
            </Pressable>
          </View>
        ) : (
          goals.slice(0, 2).map(g => {
            const p = g.progressPercentage || 0;
            const currentSaved = g.currentSavings || g.currentInvestmentValue || 0;
            return (
              <Pressable 
                key={g.id} 
                style={styles.card}
                onPress={() => navigation.navigate('GoalDetails', { goalId: g.id, goalData: g })}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{g.name}</Text>
                    <Text style={styles.cardSubtitle}>{g.timePeriod} {t('common.years', { defaultValue: 'Years' })} · {g.bucketName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.targetAmount}>₹{g.targetAmount?.toLocaleString('en-IN')}</Text>
                    <Text style={styles.targetLabel}>{t('dash.target', { defaultValue: 'TARGET' }).toUpperCase()}</Text>
                  </View>
                </View>
                <View style={{ marginBottom: 4 }}>
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
            <Pressable onPress={() => navigation.navigate('Portfolio', { tab: 'Goals' })} style={{ paddingVertical: 12, alignItems: 'center', backgroundColor: '#F8F9FB', marginTop: -8, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' }}>
              <Text style={{ color: '#3C3985', fontSize: 14, fontWeight: '800' }}>{t('dash.seeMoreGoals', { defaultValue: 'See more goals' })} →</Text>
            </Pressable>
          )}

        {/* SIP Orders Section */}
        {sipPlans.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>{t('dash.yourOrders', { defaultValue: 'Your Orders' })}</Text>
            <View style={{ gap: 12 }}>
              {sipPlans.map(p => (
                <View key={p.id} style={styles.card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.cardTitle, { flex: 1 }]} numberOfLines={1}>{p.fundName}</Text>
                    <View style={styles.badgeSuccess}><Text style={styles.badgeSuccessText}>{p.statusLabel ? t(`status.${p.statusLabel.toLowerCase()}`, { defaultValue: p.statusLabel }) : ''}</Text></View>
                  </View>
                  <Text style={styles.cardSubtitle}>₹{p.amount.toLocaleString('en-IN')} • {p.kind === 'plan' ? `${t('dash.monthly', { defaultValue: 'monthly' })} • ${t('dash.day', { defaultValue: 'day' })} ${p.installmentDay}` : t('dash.oneTime', { defaultValue: 'one-time' })}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Recommended Funds */}
        <View style={[styles.sectionHeader, { marginTop: 24, alignItems: 'flex-start' }]}>
  <View style={{ flex: 1 }}>
    <Text style={styles.sectionTitle}>{t('dash.forYourRiskProfile', { defaultValue: 'For your risk profile' })}</Text>
    <Text style={[styles.cardSubtitle, { marginTop: 4, fontWeight: '700' }]}>{t('dash.basedOnProfile', { defaultValue: 'Based on: {{profile}}', profile }).replace(/\{\{?profile\}\}?/g, profile)}</Text>
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

        <View style={{ gap: 12 }}>
          {recommendedFunds.map(fund => (
            <Pressable key={fund.schemeCode} style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]} onPress={() => navigation.navigate('FundDetail', { schemeCode: fund.schemeCode })}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{fund.name}</Text>
                <Text style={[styles.badgeGray, { alignSelf: 'flex-start', marginTop: 4 }]}>{fund.category ? t(`category.${fund.category.toLowerCase().replace(/\s+/g, '')}`, { defaultValue: fund.category }) : ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.targetAmount}>₹{fund.nav ? parseFloat(fund.nav).toFixed(2) : t('dash.na', { defaultValue: 'N/A' })}</Text>
                <Text style={{ color: '#CBD5E0', fontSize: 18, fontWeight: '800' }}>→</Text>
              </View>
            </Pressable>
            ))}
            
          </View>

        {/* Safety Banner */}
        <View style={styles.safetyBanner}>
          {/* Says only what is true of how orders are placed: through Cybrilla, paid from
              the investor's own bank account, units held in their name. The old copy
              named BSE StarMF, which this app does not use. */}
          <Text style={styles.safetyTitle}>🛡️ Where your money goes</Text>
          <Text style={styles.safetyDesc}>
            Orders are placed with the fund house through our transaction partner, Cybrilla. You pay from your own bank
            account, and units are allotted in your name by the fund house.
          </Text>
        </View>

        {/* Learn Section */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <Text style={styles.sectionTitle}>📚 {t('dash.learnAndGrow', { defaultValue: 'Learn & Grow' })}</Text>
        </View>
        <Pressable style={styles.learnBanner} onPress={() => navigation.navigate('Learn')}>
          <View style={styles.learnBannerIconWrapper}>
            <Text style={{ fontSize: 36 }}>🎓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.learnBannerTitle}>{t('dash.academyTitle', { defaultValue: 'TechArtha Academy' })}</Text>
            <Text style={styles.learnBannerDesc}>{t('dash.academyDesc', { defaultValue: 'Master the basics of mutual funds, SIPs, and risk management with our bite-sized lessons.' })}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24 }}>
              <Text style={styles.linkText}>{t('dash.startLearning', { defaultValue: 'Start Learning' })}</Text>
              <Text style={[styles.linkText, { marginLeft: 4 }]}>→</Text>
            </View>
          </View>
        </Pressable>
        <View style={{ height: 40 }} />

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  home: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 12 },
  eyebrow: { color: '#F7941E', fontSize: 14, letterSpacing: 1.5, fontWeight: '900', marginTop: 14 },
  homeTitle: { color: '#102A54', fontSize: 32, textTransform: 'capitalize', fontWeight: '800', marginTop: 7 },
  homeSub: { color: '#4A5568', fontSize: 15, marginTop: 7 },
  balanceCard: { backgroundColor: '#3C3985', borderRadius: 16, padding: 23, marginTop: 26, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  balanceLabel: { color: '#EBEBFA', fontSize: 12, letterSpacing: 1, fontWeight: '700' },
  balance: { color: '#fff', fontSize: 39, fontWeight: '800', marginTop: 7 },
  balanceSub: { color: '#EBEBFA', marginTop: 2 },
  lightButton: { backgroundColor: '#fff', borderRadius: 16, alignSelf: 'flex-start', paddingHorizontal: 15, paddingVertical: 11, marginTop: 18 },
  lightButtonText: { color: '#3C3985', fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 32, marginBottom: 16 },
  sectionTitle: { color: '#102A54', fontSize: 20, textTransform: 'capitalize', fontWeight: '800' },
  linkText: { color: '#3C3985', fontSize: 14, fontWeight: '700' },
  emptyCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  emoji: { fontSize: 40, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#102A54', marginBottom: 8 },
  emptyDesc: { fontSize: 12, color: '#718096', textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  primaryButton: { backgroundColor: '#3C3985', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#102A54', textTransform: 'capitalize', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#718096', fontWeight: '500' },
  targetAmount: { fontSize: 16, fontWeight: '800', color: '#3C3985' },
  targetLabel: { fontSize: 10, color: '#A0AEC0', fontWeight: '700', marginTop: 2 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  savedText: { fontSize: 12, fontWeight: '700', color: '#3C3985' },
  percentText: { fontSize: 12, fontWeight: '700', color: '#718096' },
  progressBarBg: { height: 8, backgroundColor: '#EDF2F7', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#3C3985', borderRadius: 4 },
  badgeSuccess: { backgroundColor: '#F0FFF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeSuccessText: { color: '#276749', fontSize: 10, fontWeight: '700' },
  badgeGray: { backgroundColor: '#F7FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, color: '#718096', fontSize: 10, fontWeight: '700', overflow: 'hidden' },
  safetyBanner: { backgroundColor: '#EBEBFA', borderRadius: 16, padding: 16, marginTop: 24 },
  safetyTitle: { color: '#3C3985', fontWeight: '800', fontSize: 14 },
  safetyDesc: { color: '#3C3985', opacity: 0.8, fontSize: 11, marginTop: 4, lineHeight: 16, fontWeight: '600' },
  learnBanner: { backgroundColor: '#fff', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  learnBannerIconWrapper: { backgroundColor: '#EBEBFA', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  learnBannerTitle: { color: '#102A54', fontSize: 16, fontWeight: '800' },
  learnBannerDesc: { color: '#718096', fontSize: 12, marginTop: 4, lineHeight: 18 }
});
