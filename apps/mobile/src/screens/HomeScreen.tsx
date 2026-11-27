import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { PortfolioChart } from '../components/PortfolioChart';
import { RiskometerGauge } from '../components/RiskometerGauge';
import { GoalProgressRing } from '../components/GoalProgressRing';
import { Floating3DCard } from '../components/Floating3DCard';
import { authStore } from '../store/auth';
import { API_URL } from '../services/api/client';
import {
  formatIndianCompactCurrency,
  normalizeRiskProfile,
} from '../utils/fundAnalytics';
import type { MarketOverviewResponse } from '../types/market';

interface HomeScreenProps {
  name?: string;
}

const QUICK_ACTIONS: {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  iconColor: string;
  route: string;
  params?: Record<string, any>;
}[] = [
  {
    id: 'invest',
    label: 'Invest',
    icon: 'add-circle-outline',
    tint: '#EEEDFA',
    iconColor: '#36358D',
    route: 'Funds',
  },
  {
    id: 'sip',
    label: 'Start SIP',
    icon: 'repeat-outline',
    tint: '#FFF4E8',
    iconColor: '#DD6B20',
    route: 'InvestmentBuckets',
  },
  {
    id: 'holdings',
    label: 'Holdings',
    icon: 'pie-chart-outline',
    tint: '#ECFDF5',
    iconColor: '#059669',
    route: 'Portfolio',
    params: { tab: 'holdings' },
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: 'receipt-outline',
    tint: '#F0F9FF',
    iconColor: '#0284C7',
    route: 'Portfolio',
    params: { tab: 'transactions' },
  },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ name }) => {
  const navigation = useNavigation<any>();

  // Real API-backed state
  const [goals, setGoals] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [userProfileInfo, setUserProfileInfo] = useState<any>(null);
  const [marketSnapshot, setMarketSnapshot] = useState<MarketOverviewResponse | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [riskModalVisible, setRiskModalVisible] = useState(false);
  const [latestRisk, setLatestRisk] = useState<any>(null);

  const timeGreeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = useMemo(() => {
    const candidate =
      name?.trim() ||
      userProfileInfo?.profile?.fullName?.trim() ||
      userProfileInfo?.name?.trim();
    return candidate ? candidate.split(' ')[0] : 'Investor';
  }, [name, userProfileInfo]);

  const avatarInitial = displayName.charAt(0).toUpperCase();

  const fetchData = useCallback(async () => {
    try {
      const token = authStore.accessToken;
      const authHeaders: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const [goalsRes, portRes, profileRes, marketRes, riskRes] = await Promise.all([
        fetch(`${API_URL}/goals`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_URL}/portfolio`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_URL}/auth/profile`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_URL}/market/overview`).catch(() => null),
        fetch(`${API_URL}/risk/latest`, { headers: authHeaders }).catch(() => null),
      ]);

      if (goalsRes?.ok) {
        const g = await goalsRes.json();
        setGoals(Array.isArray(g) ? g : Array.isArray(g?.data) ? g.data : []);
      }
      if (portRes?.ok) {
        setPortfolio(await portRes.json());
      }
      if (profileRes?.ok) {
        setUserProfileInfo(await profileRes.json());
      }
      if (marketRes?.ok) {
        setMarketSnapshot(await marketRes.json());
      }
      if (riskRes?.ok) {
        const latestRiskData = await riskRes.json().catch(() => null);
        if (latestRiskData?.category && typeof latestRiskData?.score === 'number') {
          setLatestRisk(latestRiskData);
        }
      }
    } catch (e) {
      console.log('Error fetching home screen data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Real portfolio metrics (no fabricated numbers)
  const invested = portfolio?.totals?.invested ?? null;
  const current = portfolio?.totals?.current ?? null;
  const gain =
    portfolio?.totals?.gain != null
      ? portfolio.totals.gain
      : current != null && invested != null
        ? current - invested
        : null;
  const gainPercent =
    invested != null && invested > 0 && gain != null
      ? (gain / invested) * 100
      : null;
  const hasInvestments =
    portfolio?.status === 'OK' && current != null && current > 0;
  const portfolioHistory = Array.isArray(portfolio?.history)
    ? portfolio.history
    : [];

  // Real assessed risk profile only (never invented)
  const activeRiskData = latestRisk || userProfileInfo?.riskProfile;
  const riskProfile = useMemo(
    () =>
      normalizeRiskProfile(
        activeRiskData?.category,
        activeRiskData?.score,
      ),
    [activeRiskData, userProfileInfo],
  );

  const marketIndices = useMemo(() => {
    if (!marketSnapshot) return [];
    return [marketSnapshot.nifty50, marketSnapshot.sensex].filter(Boolean);
  }, [marketSnapshot]);

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <Header />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#36358D']}
          />
        }
      >
        {/* ========================================================
            1. COMPACT PERSONALIZED GREETING + PROFILE ACCESS
           ======================================================== */}
        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingEyebrow}>{timeGreeting.toUpperCase()}</Text>
            <Text style={styles.greetingName} numberOfLines={1}>
              {displayName}
            </Text>
          </View>

          <Pressable
            testID="home-profile-shortcut"
            style={styles.avatarBtn}
            onPress={() => navigation.navigate('Profile')}
            accessibilityLabel="Open Profile"
            accessibilityRole="button"
          >
            <Text style={styles.avatarInitial}>{avatarInitial}</Text>
          </Pressable>
        </View>

        {/* ========================================================
            2. PORTFOLIO OVERVIEW HERO CARD
           ======================================================== */}
        <View style={styles.heroCard} testID="home-portfolio-hero">
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="homePortfolioGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#232262" />
                  <Stop offset="55%" stopColor="#36358D" />
                  <Stop offset="100%" stopColor="#524CB4" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#homePortfolioGrad)" />
              <Circle cx="94%" cy="10%" r="82" fill="#FFFFFF" opacity="0.07" />
              <Circle cx="10%" cy="95%" r="64" fill="#F7941D" opacity="0.14" />
            </Svg>
          </View>

          <View style={styles.heroTopSheen} pointerEvents="none" />

          <View style={styles.heroHeaderRow}>
            <View>
              <Text style={styles.heroEyebrow}>PORTFOLIO VALUE</Text>
              <Text style={styles.heroAsOn}>
                {portfolio?.asOn
                  ? `As on ${new Date(portfolio.asOn).toLocaleDateString('en-IN')}`
                  : 'AMFI Registered Folio'}
              </Text>
            </View>
            <Pressable
              style={styles.heroDetailPill}
              onPress={() => navigation.navigate('Portfolio', { tab: 'overview' })}
            >
              <Text style={styles.heroDetailText}>Details</Text>
              <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.heroLoader}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : !hasInvestments ? (
            <View style={styles.emptyPortfolioBox}>
              <Text style={styles.emptyHeroValue}>₹0</Text>
              <Text style={styles.emptyHeroSub}>
                Start your direct mutual fund portfolio with a SIP or lump-sum.
              </Text>
              <View style={styles.emptyActionsRow}>
                <Pressable
                  style={styles.primaryHeroBtn}
                  onPress={() => navigation.navigate('Funds')}
                >
                  <Text style={styles.primaryHeroBtnText}>Explore Funds</Text>
                  <Ionicons name="arrow-forward" size={13} color="#36358D" />
                </Pressable>
                <Pressable
                  style={styles.secondaryHeroBtn}
                  onPress={() => navigation.navigate('GoalSelection')}
                >
                  <Text style={styles.secondaryHeroBtnText}>Plan Goal</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.heroNumbersWrap}>
              <View style={styles.heroPrimaryRow}>
                <Text style={styles.heroCurrentValue}>
                  ₹{Math.round(current).toLocaleString('en-IN')}
                </Text>

                {gain != null && (
                  <View
                    style={[
                      styles.returnsPill,
                      {
                        backgroundColor:
                          gain >= 0
                            ? 'rgba(16, 185, 129, 0.22)'
                            : 'rgba(239, 68, 68, 0.24)',
                      },
                    ]}
                  >
                    <Ionicons
                      name={gain >= 0 ? 'trending-up' : 'trending-down'}
                      size={13}
                      color={gain >= 0 ? '#34D399' : '#FCA5A5'}
                    />
                    <Text
                      style={[
                        styles.returnsPillText,
                        { color: gain >= 0 ? '#34D399' : '#FCA5A5' },
                      ]}
                    >
                      {gain >= 0 ? '+' : '-'}₹{Math.abs(Math.round(gain)).toLocaleString('en-IN')}
                      {gainPercent != null
                        ? ` (${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(1)}%)`
                        : ''}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.heroSubStatsRow}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Invested</Text>
                  <Text style={styles.heroStatVal}>
                    {invested != null ? `₹${Math.round(invested).toLocaleString('en-IN')}` : '—'}
                  </Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Abs. Returns</Text>
                  <Text
                    style={[
                      styles.heroStatVal,
                      gain != null && { color: gain >= 0 ? '#34D399' : '#FCA5A5' },
                    ]}
                  >
                    {gain != null
                      ? `${gain >= 0 ? '+' : '-'}₹${Math.abs(Math.round(gain)).toLocaleString('en-IN')}`
                      : '—'}
                  </Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Return %</Text>
                  <Text
                    style={[
                      styles.heroStatVal,
                      gainPercent != null && {
                        color: gainPercent >= 0 ? '#34D399' : '#FCA5A5',
                      },
                    ]}
                  >
                    {gainPercent != null
                      ? `${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%`
                      : '—'}
                  </Text>
                </View>
              </View>

              {/* Interactive Portfolio Growth Curve (or honest Invested vs Current bar) */}
              <PortfolioChart
                history={portfolioHistory}
                investedValue={invested}
                currentValue={current}
                height={110}
                variant="dark"
              />
            </View>
          )}
        </View>

        {/* ========================================================
            3. QUICK ACTIONS ROW
           ======================================================== */}
        <View style={styles.quickActionsRow} testID="home-quick-actions">
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              testID={`quick-action-${action.id}`}
              style={({ pressed }) => [
                styles.quickActionTile,
                pressed && styles.quickActionPressed,
              ]}
              onPress={() => navigation.navigate(action.route, action.params)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <View style={[styles.quickActionIconBox, { backgroundColor: action.tint }]}>
                <Ionicons name={action.icon} size={20} color={action.iconColor} />
              </View>
              <Text style={styles.quickActionLabel} numberOfLines={1}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ========================================================
            3B. VISIBLE ARTHAVERSE 3D FLOATING TABS (ALL 5 DESTINATIONS)
           ======================================================== */}
        <View style={styles.sectionHeader}>
          <View style={styles.arthaSectionTitleRow}>
            <View style={styles.arthaOrangeDot} />
            <Text style={styles.sectionTitle}>ArthaVerse 3D Hub</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Explore')}
            style={styles.linkBtn}
          >
            <Text style={styles.linkBtnText}>Open All</Text>
            <Ionicons name="chevron-forward" size={13} color="#36358D" />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.floatingTabsScroll}
          testID="home-arthaverse-5tabs"
        >
          {[
            {
              id: 'market-pulse',
              title: 'Market Pulse',
              subtitle: 'NIFTY 50, SENSEX & sectors',
              icon: 'pulse-outline' as const,
              accent: '#F7941D',
              onPress: () => navigation.navigate('Explore', { section: 'markets' }),
            },
            {
              id: 'fund-studio',
              title: 'Fund Studio',
              subtitle: '8 SEBI fund collections',
              icon: 'layers-outline' as const,
              accent: '#A78BFA',
              onPress: () => navigation.navigate('Explore', { section: 'studio' }),
            },
            {
              id: 'fund-intelligence',
              title: 'Fund Intelligence',
              subtitle: 'NAV charts & comparison',
              icon: 'analytics-outline' as const,
              accent: '#34D399',
              onPress: () => navigation.navigate('Funds'),
            },
            {
              id: 'arthaplay',
              title: 'ArthaPlay',
              subtitle: 'SIP studio & daily quiz',
              icon: 'game-controller-outline' as const,
              accent: '#FBBF24',
              onPress: () => navigation.navigate('Explore', { section: 'play' }),
            },
            {
              id: 'artha-academy',
              title: 'Artha Academy',
              subtitle: 'Micro-lessons & portals',
              icon: 'school-outline' as const,
              accent: '#60A5FA',
              onPress: () => navigation.navigate('Explore', { section: 'academy' }),
            },
          ].map((card, idx) => (
            <Floating3DCard
              key={card.id}
              testID={`home-3d-tab-${card.id}`}
              variant="tab3d"
              title={card.title}
              subtitle={card.subtitle}
              icon={card.icon}
              accentColor={card.accent}
              floatDelay={idx * 240}
              onPress={card.onPress}
            />
          ))}
        </ScrollView>

        {/* ========================================================
            4. FINANCIAL GOALS (VISUAL PROGRESS RINGS)
           ======================================================== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Financial Goals</Text>
          <Pressable
            onPress={() => navigation.navigate('Goals')}
            style={styles.linkBtn}
          >
            <Text style={styles.linkBtnText}>View All</Text>
            <Ionicons name="chevron-forward" size={13} color="#36358D" />
          </Pressable>
        </View>

        {goals.length === 0 ? (
          <Pressable
            style={styles.emptyGoalCard}
            onPress={() => navigation.navigate('GoalSelection')}
          >
            <GoalProgressRing percentage={0} size={48} strokeWidth={4.5} />
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyGoalTitle}>Set your first goal</Text>
              <Text style={styles.emptyGoalSub}>Track SIP progress visually.</Text>
            </View>
            <View style={styles.compactPrimaryPill}>
              <Text style={styles.compactPrimaryPillText}>+ Plan</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.goalsList}>
            {goals.slice(0, 3).map((g) => {
              const target = Number(g.targetAmount) || 0;
              const saved = Number(g.currentSavings ?? g.currentInvestmentValue ?? 0);
              const pct =
                g.progressPercentage != null
                  ? Number(g.progressPercentage)
                  : target > 0
                    ? (saved / target) * 100
                    : 0;
              return (
                <Pressable
                  key={g.id}
                  style={styles.goalCard}
                  onPress={() =>
                    navigation.navigate('GoalDetails', { goalId: g.id, goalData: g })
                  }
                >
                  <GoalProgressRing
                    percentage={pct}
                    size={54}
                    strokeWidth={5}
                    color="#36358D"
                  />
                  <View style={styles.goalCardInfo}>
                    <View style={styles.goalTopLine}>
                      <Text style={styles.goalName} numberOfLines={1}>
                        {g.name}
                      </Text>
                      <Text style={styles.goalTargetVal}>
                        {formatIndianCompactCurrency(target)}
                      </Text>
                    </View>
                    <View style={styles.goalMetaRow}>
                      <Text style={styles.goalSavedVal}>
                        Saved {formatIndianCompactCurrency(saved)}
                      </Text>
                      {g.timePeriod ? (
                        <View style={styles.goalHorizonPill}>
                          <Text style={styles.goalHorizonText}>{g.timePeriod}Y</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.goalTrack}>
                      <View
                        style={[
                          styles.goalFill,
                          { width: `${Math.min(100, Math.max(2, pct))}%` },
                        ]}
                      />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ========================================================
            5. RISK PROFILE (COMPACT VISUAL RISKOMETER)
           ======================================================== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Risk Profile</Text>
        </View>

        {riskProfile ? (
          <View style={styles.riskCard} testID="home-riskometer-card">
            <View style={styles.riskTopRow}>
              <View style={styles.riskCategoryPill}>
                <View style={[styles.riskDot, { backgroundColor: riskProfile.color }]} />
                <Text style={styles.riskCategoryText}>{riskProfile.label}</Text>
              </View>
              <Pressable onPress={() => setRiskModalVisible(true)} hitSlop={8}>
                <Text style={styles.readMoreLink}>Read More</Text>
              </Pressable>
            </View>

            <View style={styles.gaugeCenter}>
              <RiskometerGauge
                score={riskProfile.score}
                category={riskProfile.key}
                size={236}
                showLabels={true}
              />
            </View>

            <Text style={styles.riskConciseSummary}>{riskProfile.shortSummary}</Text>

            <View style={styles.riskFooterRow}>
              <Pressable
                style={styles.riskSecondaryBtn}
                onPress={() => navigation.navigate('RiskAssessment')}
              >
                <Text style={styles.riskSecondaryText}>Re-evaluate</Text>
              </Pressable>
              <Pressable
                style={styles.riskPrimaryBtn}
                onPress={() => navigation.navigate('InvestmentBuckets')}
              >
                <Text style={styles.riskPrimaryText}>Suited Buckets</Text>
                <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.riskCard} testID="home-riskometer-pending-card">
            <View style={styles.riskTopRow}>
              <View style={[styles.riskCategoryPill, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
                <View style={[styles.riskDot, { backgroundColor: '#94A3B8' }]} />
                <Text style={[styles.riskCategoryText, { color: '#64748B' }]}>Pending Assessment</Text>
              </View>
              <Pressable onPress={() => navigation.navigate('RiskAssessment')} hitSlop={8}>
                <Text style={styles.readMoreLink}>Assess Now</Text>
              </Pressable>
            </View>

            <View style={styles.gaugeCenter}>
              {/* Neutral 5-tier Riskometer Gauge showing pending status */}
              <RiskometerGauge
                score={36}
                category="MODERATE"
                size={236}
                showLabels={true}
              />
            </View>

            <Text style={styles.riskConciseSummary}>
              You skipped risk profiling during onboarding. Complete your 2-minute suitability check to unlock your verified investor category and tailor-made asset allocation.
            </Text>

            <View style={styles.riskFooterRow}>
              <Pressable
                style={[styles.riskPrimaryBtn, { flex: 1, backgroundColor: '#36358D' }]}
                onPress={() => navigation.navigate('RiskAssessment')}
              >
                <Text style={styles.riskPrimaryText}>Complete Risk Profiling</Text>
                <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        )}

        {/* ========================================================
            6. MARKET SNAPSHOT (COMPACT NIFTY 50 & SENSEX)
           ======================================================== */}
        {marketIndices.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Market Snapshot</Text>
              <Pressable
                onPress={() => navigation.navigate('Explore')}
                style={styles.linkBtn}
              >
                <Text style={styles.linkBtnText}>View All</Text>
                <Ionicons name="chevron-forward" size={13} color="#36358D" />
              </Pressable>
            </View>

            <View style={styles.marketRow} testID="home-market-snapshot">
              {marketIndices.map((idx) => {
                const up = idx.change >= 0;
                const tone = up ? '#059669' : '#DC2626';
                const bg = up ? '#ECFDF5' : '#FEF2F2';
                return (
                  <Pressable
                    key={idx.symbol}
                    style={styles.indexCard}
                    onPress={() => navigation.navigate('Explore')}
                  >
                    <View style={styles.indexTopRow}>
                      <Text style={styles.indexName}>{idx.name}</Text>
                      <Ionicons
                        name={up ? 'trending-up' : 'trending-down'}
                        size={15}
                        color={tone}
                      />
                    </View>
                    <Text style={styles.indexValue}>
                      {Math.round(idx.currentValue).toLocaleString('en-IN')}
                    </Text>
                    <View style={[styles.indexDeltaPill, { backgroundColor: bg }]}>
                      <Text style={[styles.indexDeltaText, { color: tone }]}>
                        {up ? '+' : ''}
                        {idx.changePercent.toFixed(2)}%
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* ========================================================
            7. FLOATING 3D ARTHAVERSE DISCOVERY ENTRY POINT
           ======================================================== */}
        <View style={styles.discoveryWrap}>
          <Floating3DCard
            testID="home-arthaverse-card"
            variant="hero"
            eyebrow="DISCOVERY HUB"
            title="Explore ArthaVerse"
            subtitle="Discover markets, funds and insights."
            ctaLabel="Explore ArthaVerse"
            badgeText="Pulse • Studio • Play"
            icon="planet-outline"
            onPress={() => navigation.navigate('Explore')}
          />
        </View>

        {/* Regulatory Disclaimer (Preserved intact, concise) */}
        <View style={styles.complianceFooter}>
          <Text style={styles.complianceText}>
            Mutual fund investments are subject to market risks. Read all scheme related documents carefully before investing. Past performance is not indicative of future returns.
          </Text>
          <Text style={styles.complianceBrand}>
            TechArtha • AMFI-Registered Mutual Fund Distributor
          </Text>
        </View>
      </ScrollView>

      {/* Expandable Risk Profile Details Modal */}
      <Modal
        visible={riskModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRiskModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeading}>Your Risk Profile</Text>
                <Text style={styles.modalSubheading}>
                  Assessed: {riskProfile?.label} (Score {riskProfile?.score})
                </Text>
              </View>
              <Pressable onPress={() => setRiskModalVisible(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSecTitle}>SUMMARY</Text>
              <Text style={styles.modalSecBody}>{riskProfile?.shortSummary}</Text>
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSecTitle}>DISCLOSURE</Text>
              <Text style={styles.modalSecBody}>
                Derived strictly from your risk assessment responses to guide category suitability. Not a guarantee of returns.
              </Text>
            </View>

            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setRiskModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7FC' },
  container: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 32 },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  greetingEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F7941D',
    letterSpacing: 0.9,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#102A54',
    letterSpacing: -0.3,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#36358D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E4FA',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#232262',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 7,
  },
  heroTopSheen: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C7D2FE',
    letterSpacing: 0.9,
  },
  heroAsOn: {
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 2,
  },
  heroDetailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  heroDetailText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroLoader: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyPortfolioBox: {
    gap: 10,
  },
  emptyHeroValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  emptyHeroSub: {
    fontSize: 12.5,
    color: '#E2E4FA',
    lineHeight: 18,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primaryHeroBtn: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 11,
  },
  primaryHeroBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#36358D',
  },
  secondaryHeroBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 11,
  },
  secondaryHeroBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroNumbersWrap: {
    gap: 12,
  },
  heroPrimaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroCurrentValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  returnsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  returnsPillText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  heroSubStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroStatLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  heroStatVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 22,
  },
  quickActionTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 3,
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionPressed: {
    transform: [{ scale: 0.96 }],
  },
  quickActionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#102A54',
    textAlign: 'center',
  },
  arthaSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  arthaOrangeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F7941D',
  },
  floatingTabsScroll: {
    gap: 11,
    paddingTop: 5,
    paddingBottom: 18,
    paddingRight: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#102A54',
    letterSpacing: -0.2,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 3,
  },
  linkBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#36358D',
  },
  emptyGoalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    marginBottom: 20,
  },
  emptyGoalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
  },
  emptyGoalSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  compactPrimaryPill: {
    backgroundColor: '#36358D',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  compactPrimaryPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  goalsList: {
    gap: 10,
    marginBottom: 20,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  goalCardInfo: {
    flex: 1,
    gap: 5,
  },
  goalTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  goalName: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '800',
    color: '#102A54',
  },
  goalTargetVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#36358D',
  },
  goalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalSavedVal: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  goalHorizonPill: {
    backgroundColor: '#F0EFFB',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  goalHorizonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#36358D',
  },
  goalTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EEF0FA',
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#36358D',
  },
  riskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    marginBottom: 20,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  riskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F4F4FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  riskDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  riskCategoryText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#102A54',
  },
  readMoreLink: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#36358D',
  },
  gaugeCenter: {
    alignItems: 'center',
    marginVertical: 4,
  },
  riskConciseSummary: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  riskFooterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  riskSecondaryBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#D8DBF5',
    alignItems: 'center',
  },
  riskSecondaryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#36358D',
  },
  riskPrimaryBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: '#36358D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  riskPrimaryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  unassessedRiskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    marginBottom: 20,
  },
  unassessedIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#EEEDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unassessedTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#102A54',
  },
  unassessedSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  marketRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  indexCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  indexTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  indexName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  indexValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102A54',
    marginBottom: 6,
  },
  indexDeltaPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  indexDeltaText: {
    fontSize: 11,
    fontWeight: '800',
  },
  discoveryWrap: {
    marginBottom: 18,
  },
  complianceFooter: {
    paddingHorizontal: 6,
    paddingTop: 4,
    alignItems: 'center',
  },
  complianceText: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 15,
  },
  complianceBrand: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 84, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '900',
    color: '#102A54',
  },
  modalSubheading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#36358D',
    marginTop: 2,
  },
  modalSection: {
    marginBottom: 12,
  },
  modalSecTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  modalSecBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  modalCloseBtn: {
    backgroundColor: '#36358D',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  modalCloseText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default HomeScreen;
