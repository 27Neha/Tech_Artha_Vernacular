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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Header } from '../components/Header';
import { PortfolioChart } from '../components/PortfolioChart';
import { authStore } from '../store/auth';
import { API_URL } from '../services/api/client';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

interface HomeScreenProps {
  name?: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ name }) => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();

  // User state
  const [goals, setGoals] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [profile, setProfile] = useState('Moderate');
  const [profileData, setProfileData] = useState<any>(null);
  const [userProfileInfo, setUserProfileInfo] = useState<any>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [riskModalVisible, setRiskModalVisible] = useState(false);

  // Greeting computation based on local time
  const timeGreeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = useMemo(() => {
    if (name?.trim()) return name.trim().split(' ')[0];
    if (userProfileInfo?.name?.trim()) return userProfileInfo.name.trim().split(' ')[0];
    return 'Investor';
  }, [name, userProfileInfo]);

  const fetchData = useCallback(async () => {
    try {
      const token = authStore.accessToken;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [goalsRes, portRes, profileRes] = await Promise.all([
        fetch(`${API_URL}/goals`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_URL}/portfolio`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_URL}/auth/profile`, { headers: authHeaders }).catch(() => null),
      ]);

      if (goalsRes?.ok) {
        const g = await goalsRes.json();
        setGoals(Array.isArray(g) ? g : []);
      }
      if (portRes?.ok) {
        setPortfolio(await portRes.json());
      }
      if (profileRes?.ok) {
        const p = await profileRes.json();
        setUserProfileInfo(p);
        const category: string | undefined = p?.riskProfile?.category;
        if (category) {
          const formatted = category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, ' ');
          setProfile(formatted);
          setProfileData(p.riskProfile);
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

  // Portfolio calculations
  const invested = portfolio?.totals?.invested;
  const current = portfolio?.totals?.current;
  const gain = current != null && invested != null ? current - invested : null;
  const gainPercent = invested && invested > 0 && gain != null ? (gain / invested) * 100 : null;
  const hasInvestments = portfolio?.status === 'OK' && current != null && current > 0;

  // Risk profile spectrum visual indicator
  const riskIndex = useMemo(() => {
    const p = profile.toLowerCase();
    if (p.includes('conservative')) return 0;
    if (p.includes('moderately low')) return 1;
    if (p.includes('moderate')) return 2;
    if (p.includes('moderately high')) return 3;
    if (p.includes('aggressive')) return 4;
    return 2;
  }, [profile]);

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3C3985']} />
        }
      >
        {/* ========================================================
            SECTION 1: GREETING & QUICK ACTIONS
           ======================================================== */}
        <View style={styles.greetingHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.timeGreetingText}>{timeGreeting.toUpperCase()}, {displayName} 👋</Text>
            <Text style={styles.journeySubtext}>Your financial journey is moving forward.</Text>
          </View>
        </View>

        {/* ========================================================
            SECTION 2: MY INVESTMENT DASHBOARD
           ======================================================== */}
        <View style={styles.dashboardCard}>
          <View style={styles.dashboardTopRow}>
            <View>
              <Text style={styles.dashboardEyebrow}>MY INVESTMENT DASHBOARD</Text>
              <Text style={styles.asOnText}>
                {portfolio?.asOn ? `As on ${new Date(portfolio.asOn).toLocaleDateString('en-IN')}` : 'Verified Folio Status'}
              </Text>
            </View>
            <View style={styles.regBadge}>
              <Text style={styles.regBadgeText}>AMFI Registered</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.cardLoader}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : !hasInvestments ? (
            /* Attractive Empty State (No fabricated numbers) */
            <View style={styles.emptyPortfolioBox}>
              <View style={styles.emptySparkleRow}>
                <Ionicons name="sparkles" size={18} color="#F7941E" />
                <Text style={styles.emptyPortfolioTitle}>Your investment journey starts here</Text>
              </View>
              <Text style={styles.emptyPortfolioDesc}>
                Begin investing systematically in direct, commission-free mutual funds aligned with your life milestones.
              </Text>
              <View style={styles.emptyActionsRow}>
                <Pressable
                  style={styles.startInvestingBtn}
                  onPress={() => navigation.navigate('Funds')}
                >
                  <Text style={styles.startInvestingText}>Explore Funds</Text>
                  <Ionicons name="arrow-forward" size={14} color="#3C3985" />
                </Pressable>
                <Pressable
                  style={styles.planGoalOutlineBtn}
                  onPress={() => navigation.navigate('GoalSelection')}
                >
                  <Text style={styles.planGoalOutlineText}>Plan a Goal</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            /* Real Portfolio Numbers */
            <View style={styles.portfolioStatsBox}>
              <View style={styles.valueRow}>
                <View>
                  <Text style={styles.portfolioCurrentLabel}>CURRENT VALUE</Text>
                  <Text style={styles.portfolioCurrentValue}>
                    ₹{Math.round(current).toLocaleString('en-IN')}
                  </Text>
                </View>
                {gain != null && (
                  <View style={[styles.gainBadge, { backgroundColor: gain >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}>
                    <Ionicons
                      name={gain >= 0 ? 'trending-up' : 'trending-down'}
                      size={14}
                      color={gain >= 0 ? '#10B981' : '#EF4444'}
                    />
                    <Text style={[styles.gainText, { color: gain >= 0 ? '#10B981' : '#EF4444' }]}>
                      {gain >= 0 ? '+' : ''}₹{Math.abs(Math.round(gain)).toLocaleString('en-IN')} ({gainPercent ? `${gain >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%` : ''})
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.portfolioMetaRow}>
                <Text style={styles.investedMetaText}>
                  Invested: ₹{Math.round(invested).toLocaleString('en-IN')}
                </Text>
                <Pressable
                  onPress={() => navigation.navigate('Portfolio', { tab: 'overview' })}
                  style={styles.viewPortfolioLink}
                >
                  <Text style={styles.viewPortfolioText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={13} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* ========================================================
            SECTION 3: MY GOALS
           ======================================================== */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>My Goals</Text>
            <Text style={styles.sectionSubtitle}>Milestone-based systematic investing</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Goals')}
            style={styles.seeAllBtn}
          >
            <Text style={styles.seeAllText}>View All</Text>
            <Ionicons name="arrow-forward" size={12} color="#3C3985" />
          </Pressable>
        </View>

        {goals.length === 0 ? (
          <View style={styles.emptyGoalCard}>
            <View style={styles.emptyGoalCircle}>
              <Ionicons name="flag-outline" size={24} color="#3C3985" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyGoalTitle}>Plan Your First Milestone</Text>
              <Text style={styles.emptyGoalSub}>
                Give your monthly SIPs a purpose like retirement, buying a home, or child education.
              </Text>
            </View>
            <Pressable
              style={styles.planBtnCompact}
              onPress={() => navigation.navigate('GoalSelection')}
            >
              <Text style={styles.planBtnText}>+ Plan</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.goalsList}>
            {goals.slice(0, 2).map((g) => {
              const p = g.progressPercentage || (g.targetAmount > 0 ? ((g.currentSavings || 0) / g.targetAmount) * 100 : 0);
              const currentSaved = g.currentSavings || g.currentInvestmentValue || 0;
              return (
                <Pressable
                  key={g.id}
                  style={styles.goalCard}
                  onPress={() => navigation.navigate('GoalDetails', { goalId: g.id, goalData: g })}
                >
                  <View style={styles.goalCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalCardName}>{g.name}</Text>
                      <Text style={styles.goalCardHorizon}>
                        {g.timePeriod} Years • {g.bucketName || 'Balanced Bucket'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.goalCardTarget}>₹{Number(g.targetAmount).toLocaleString('en-IN')}</Text>
                      <Text style={styles.goalCardTargetLabel}>TARGET</Text>
                    </View>
                  </View>

                  <View style={styles.goalCardProgressRow}>
                    <Text style={styles.goalSavedAmount}>
                      ₹{currentSaved.toLocaleString('en-IN')} accumulated
                    </Text>
                    <Text style={styles.goalPercentText}>{p.toFixed(1)}%</Text>
                  </View>

                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(p, 100)}%` }]} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ========================================================
            SECTION 4: MY RISK PROFILE ("Your Investment Personality")
           ======================================================== */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Your Investment Personality</Text>
            <Text style={styles.sectionSubtitle}>Assessed risk capacity & volatility preferences</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('RiskAssessment')}
            style={styles.retakeBtn}
          >
            <Text style={styles.retakeText}>Retake</Text>
          </Pressable>
        </View>

        <View style={styles.riskCard}>
          <View style={styles.riskTopRow}>
            <View style={styles.riskPill}>
              <View style={styles.riskDot} />
              <Text style={styles.riskPillText}>{profile.toUpperCase()} INVESTOR</Text>
            </View>
            <Text style={styles.riskDateText}>
              Assessed {profileData?.updatedAt ? new Date(profileData.updatedAt).toLocaleDateString('en-IN') : 'Recently'}
            </Text>
          </View>

          {/* 5-Step Visual Risk Spectrum Bar */}
          <View style={styles.spectrumContainer}>
            <View style={styles.spectrumLabels}>
              <Text style={styles.spectrumLabelLeft}>Lower Volatility</Text>
              <Text style={styles.spectrumLabelCenter}>Moderate</Text>
              <Text style={styles.spectrumLabelRight}>Higher Volatility</Text>
            </View>
            <View style={styles.spectrumTrack}>
              {[0, 1, 2, 3, 4].map((step) => {
                const isActive = step === riskIndex;
                return (
                  <View
                    key={step}
                    style={[
                      styles.spectrumSegment,
                      isActive && styles.spectrumSegmentActive,
                    ]}
                  />
                );
              })}
            </View>
          </View>

          <Text style={styles.riskExplanationText}>
            You prefer balanced growth with measured risk exposure. Your portfolio is geared toward diversified equity cushioned with defensive instruments to soften market drawdowns.
          </Text>

          <View style={styles.riskActionRow}>
            <Pressable
              style={styles.understandBtn}
              onPress={() => setRiskModalVisible(true)}
            >
              <Ionicons name="information-circle-outline" size={15} color="#3C3985" />
              <Text style={styles.understandBtnText}>Understand my risk profile</Text>
            </Pressable>
            <Pressable
              style={styles.viewBucketsBtn}
              onPress={() => navigation.navigate('InvestmentBuckets')}
            >
              <Text style={styles.viewBucketsText}>View Suited Buckets</Text>
              <Ionicons name="chevron-forward" size={13} color="#3C3985" />
            </Pressable>
          </View>
        </View>

        {/* ========================================================
            SECTION 5: ARTHAVERSE DISCOVERY BANNER (HERO CTA)
           ======================================================== */}
        <Pressable
          style={styles.arthaVerseHeroBanner}
          onPress={() => navigation.navigate('Explore')}
        >
          <View style={styles.arthaVerseContent}>
            <View style={styles.bannerTagRow}>
              <View style={styles.bannerOrangeDot} />
              <Text style={styles.bannerEyebrow}>DEDICATED DISCOVERY DESTINATION</Text>
            </View>

            <Text style={styles.bannerTitle}>Welcome to ArthaVerse</Text>
            <Text style={styles.bannerSub}>
              Markets, vetted fund intelligence & financial knowledge — all in one dedicated place.
            </Text>

            <View style={styles.bannerCtaRow}>
              <View style={styles.bannerExploreBtn}>
                <Text style={styles.bannerExploreText}>Explore ArthaVerse</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.bannerMotto}>Explore. Understand. Grow.</Text>
            </View>
          </View>
        </Pressable>

        {/* ========================================================
            SECTION 6: CONTINUE YOUR JOURNEY (QUICK SHORTCUTS)
           ======================================================== */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Continue Your Journey</Text>
            <Text style={styles.sectionSubtitle}>Personalized steps for your portfolio</Text>
          </View>
        </View>

        <View style={styles.shortcutsGrid}>
          <Pressable
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('Funds', { query: 'Index' })}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="trending-up-outline" size={18} color="#4F46E5" />
            </View>
            <Text style={styles.shortcutTitle}>Top Index Funds</Text>
            <Text style={styles.shortcutSub}>Low-cost NIFTY 50 tracking</Text>
          </Pressable>

          <Pressable
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('GoalSelection')}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#FAF5FF' }]}>
              <Ionicons name="flag-outline" size={18} color="#7E22CE" />
            </View>
            <Text style={styles.shortcutTitle}>Set a Goal</Text>
            <Text style={styles.shortcutSub}>Milestone planning</Text>
          </Pressable>

          <Pressable
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('Explore')}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="school-outline" size={18} color="#16A34A" />
            </View>
            <Text style={styles.shortcutTitle}>ArthaPlay Quiz</Text>
            <Text style={styles.shortcutSub}>Earn knowledge badges</Text>
          </Pressable>

          <Pressable
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('RiskAssessment')}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="speedometer-outline" size={18} color="#EA580C" />
            </View>
            <Text style={styles.shortcutTitle}>Risk Calibration</Text>
            <Text style={styles.shortcutSub}>Review your suitability</Text>
          </Pressable>
        </View>

        {/* ========================================================
            SECTION 7: INVESTOR PROTECTION & COMPLIANCE
           ======================================================== */}
        <View style={styles.safetyCard}>
          <View style={styles.safetyHeader}>
            <Ionicons name="shield-checkmark" size={17} color="#3C3985" />
            <Text style={styles.safetyTitle}>Direct Investor Protection</Text>
          </View>
          <Text style={styles.safetyText}>
            Orders are executed directly with asset management companies through Cybrilla. Investments are held in your own name and folio under AMFI-registered mutual fund frameworks.
          </Text>
        </View>

        <View style={styles.complianceFooter}>
          <Text style={styles.complianceText}>
            Mutual fund investments are subject to market risks. Read all scheme related documents carefully before investing. Past performance is not indicative of future returns.
          </Text>
          <Text style={[styles.complianceText, { marginTop: 4, fontWeight: '700' }]}>
            TechArtha 2.0 • AMFI-Registered Mutual Fund Distributor
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Understand Risk Profile Modal */}
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
                <Text style={styles.modalHeading}>Understanding Your Risk Profile</Text>
                <Text style={styles.modalSubheading}>Assessed Level: {profile}</Text>
              </View>
              <Pressable onPress={() => setRiskModalVisible(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSecTitle}>WHAT THIS PROFILE MEANS</Text>
                <Text style={styles.modalSecBody}>
                  A Moderate profile balances wealth accumulation with capital stability. You are willing to endure minor short-term fluctuations to achieve inflation-beating long-term returns.
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSecTitle}>WHAT VOLATILITY MEANS</Text>
                <Text style={styles.modalSecBody}>
                  Volatility refers to temporary price movements. High volatility means sharp ups and downs; low volatility means steady, conservative growth. Volatility is not a permanent loss unless you panic-sell during dips.
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSecTitle}>TIME HORIZON MATTERS</Text>
                <Text style={styles.modalSecBody}>
                  Money needed within 1–3 years belongs in low-volatility debt funds. Equities require 5+ years so market cycles have enough time to average out short-term corrections.
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSecTitle}>RISK DISCLOSURE</Text>
                <Text style={styles.modalSecBody}>
                  This profile provides educational suitability context based on your assessment answers. It is not an individual financial guarantee or a prediction of future returns.
                </Text>
              </View>
            </ScrollView>

            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setRiskModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Understood</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FD' },
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
  greetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeGreetingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F7941E',
    letterSpacing: 0.8,
  },
  journeySubtext: {
    fontSize: 16,
    fontWeight: '900',
    color: '#102A54',
    marginTop: 2,
  },
  quickActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#3C3985',
  },
  dashboardCard: {
    backgroundColor: '#3C3985',
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#3C3985',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  dashboardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  dashboardEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 0.8,
  },
  asOnText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  regBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  regBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardLoader: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyPortfolioBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  emptySparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  emptyPortfolioTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyPortfolioDesc: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 17,
    marginBottom: 14,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  startInvestingBtn: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  startInvestingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3C3985',
  },
  planGoalOutlineBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  planGoalOutlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  portfolioStatsBox: {
    gap: 12,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  portfolioCurrentLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 0.6,
  },
  portfolioCurrentValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  gainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  gainText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  portfolioMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  investedMetaText: {
    fontSize: 11.5,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  viewPortfolioLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewPortfolioText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102A54',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3C3985',
  },
  retakeBtn: {
    paddingVertical: 4,
  },
  retakeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3C3985',
  },
  emptyGoalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  emptyGoalCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EBEBFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGoalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 2,
  },
  emptyGoalSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  planBtnCompact: {
    backgroundColor: '#3C3985',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  planBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  goalsList: {
    gap: 10,
    marginBottom: 20,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  goalCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  goalCardName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#102A54',
  },
  goalCardHorizon: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  goalCardTarget: {
    fontSize: 15,
    fontWeight: '900',
    color: '#102A54',
  },
  goalCardTargetLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  goalCardProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  goalSavedAmount: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  goalPercentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C3985',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3C3985',
    borderRadius: 3,
  },
  riskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  riskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBEBFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3C3985',
  },
  riskPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C3985',
  },
  riskDateText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  spectrumContainer: {
    marginBottom: 12,
  },
  spectrumLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  spectrumLabelLeft: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#10B981',
  },
  spectrumLabelCenter: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#F59E0B',
  },
  spectrumLabelRight: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  spectrumTrack: {
    flexDirection: 'row',
    gap: 4,
  },
  spectrumSegment: {
    flex: 1,
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
  },
  spectrumSegmentActive: {
    backgroundColor: '#3C3985',
  },
  riskExplanationText: {
    fontSize: 12.5,
    color: '#4A5568',
    lineHeight: 18,
    marginBottom: 14,
  },
  riskActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  understandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  understandBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#3C3985',
  },
  viewBucketsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewBucketsText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#3C3985',
  },
  arthaVerseHeroBanner: {
    backgroundColor: '#1E1B4B',
    borderRadius: 22,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#3730A3',
  },
  arthaVerseContent: {
    gap: 6,
  },
  bannerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerOrangeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F7941E',
  },
  bannerEyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#F7941E',
    letterSpacing: 0.8,
  },
  bannerTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  bannerSub: {
    fontSize: 12.5,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  bannerCtaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  bannerExploreBtn: {
    backgroundColor: '#4338CA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  bannerExploreText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerMotto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A5B4FC',
    fontStyle: 'italic',
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  shortcutCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shortcutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 2,
  },
  shortcutSub: {
    fontSize: 10.5,
    color: '#64748B',
  },
  safetyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  safetyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#102A54',
  },
  safetyText: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  complianceFooter: {
    padding: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
  },
  complianceText: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 84, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '900',
    color: '#102A54',
  },
  modalSubheading: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalSection: {
    marginBottom: 12,
  },
  modalSecTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#3C3985',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  modalSecBody: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },
  modalCloseBtn: {
    backgroundColor: '#3C3985',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8F9FD',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 2,
  },
  notifBody: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
});
