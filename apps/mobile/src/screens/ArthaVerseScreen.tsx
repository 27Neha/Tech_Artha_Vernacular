import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Header } from '../components/Header';
import { MarketPulseCard } from '../components/MarketPulseCard';
import { MarketBriefCard } from '../components/MarketBriefCard';
import { MarketStoriesSection } from '../components/MarketStoriesSection';
import { MarketDetailModal } from '../components/MarketDetailModal';
import { API_URL } from '../services/api/client';
import { Ionicons } from '@expo/vector-icons';
import type {
  DailyMoneyLesson,
  MarketNewsItem,
  MarketOverviewResponse,
  MarketQuiz,
  PersonalMarketBrief,
} from '../types/market';

type SubSectionTab = 'all' | 'markets' | 'news' | 'explorer' | 'play' | 'academy' | 'research';

interface CategoryDetail {
  id: string;
  name: string;
  tagline: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge: string;
  bgTint: string;
  borderColor: string;
  iconColor: string;
  query: string;
  objective: string;
  typicalHorizon: string;
  volatilityRating: 'Historically lower volatility' | 'Moderate volatility' | 'Higher volatility';
  volatilityExplanation: string;
  growthPotential: string;
  suitability: string;
  limitations: string;
  benchmark: string;
  sebiDefinition: string;
}

const CATEGORIES: CategoryDetail[] = [
  {
    id: 'large-cap',
    name: 'Large Cap Funds',
    tagline: 'Top 100 bluechip market leaders',
    icon: 'business-outline',
    badge: 'Historically Lower Volatility',
    bgTint: '#F0F9FF',
    borderColor: '#BAE6FD',
    iconColor: '#0284C7',
    query: 'Large Cap',
    objective: 'Generate steady long-term capital appreciation by investing predominantly in top 100 Indian companies by market capitalization.',
    typicalHorizon: '3 – 5+ years',
    volatilityRating: 'Historically lower volatility',
    volatilityExplanation: 'Large established enterprises with proven balance sheets. Exhibits lower drawdown compared to mid or small caps during broad market corrections.',
    growthPotential: 'Reflects broader corporate India GDP expansion; steady wealth compounders (non-guaranteed).',
    suitability: 'First-time investors seeking equity exposure with relatively lower fluctuation.',
    limitations: 'May underperform fast-growing mid/small caps in aggressive bull markets.',
    benchmark: 'NIFTY 50 TRI / BSE SENSEX TRI',
    sebiDefinition: 'Minimum 80% investment in equity and equity-related instruments of large-cap companies (1st to 100th company in market cap).',
  },
  {
    id: 'mid-cap',
    name: 'Mid Cap Funds',
    tagline: 'Fast-growing established companies',
    icon: 'rocket-outline',
    badge: 'Moderate Volatility',
    bgTint: '#FDF4FF',
    borderColor: '#F5D0FE',
    iconColor: '#A855F7',
    query: 'Mid Cap',
    objective: 'Participate in fast-growing mid-sized Indian companies (101st to 250th in market capitalization).',
    typicalHorizon: '5 – 7+ years',
    volatilityRating: 'Moderate volatility',
    volatilityExplanation: 'Medium-sized companies experience higher cyclical swings than large caps during economic transitions.',
    growthPotential: 'Strong potential to graduate into future bluechips; substantial earnings expansion potential.',
    suitability: 'Investors comfortable with short-term market swings in exchange for long-term growth.',
    limitations: 'Sensitive to economic slowdowns and interest rate cycles.',
    benchmark: 'NIFTY Midcap 150 TRI',
    sebiDefinition: 'Minimum 65% investment in equity instruments of mid-cap companies (101st to 250th in market cap).',
  },
  {
    id: 'small-cap',
    name: 'Small Cap Funds',
    tagline: 'Emerging high-potential businesses',
    icon: 'flash-outline',
    badge: 'Higher Volatility',
    bgTint: '#FFF7ED',
    borderColor: '#FED7AA',
    iconColor: '#EA580C',
    query: 'Small Cap',
    objective: 'High growth seeking capital appreciation by investing in dynamic small-cap firms (251st company onward).',
    typicalHorizon: '7 – 10+ years',
    volatilityRating: 'Higher volatility',
    volatilityExplanation: 'Small businesses face sharp drawdowns in bear markets and liquidity constraints; requires patience.',
    growthPotential: 'High growth runway if underlying businesses execute successfully; substantial compounding.',
    suitability: 'Aggressive investors with a long investment horizon and ability to withstand sharp temporary paper drawdowns.',
    limitations: 'High vulnerability to credit tightness and macro stress; past volatility does not guarantee future stability.',
    benchmark: 'NIFTY Smallcap 250 TRI',
    sebiDefinition: 'Minimum 65% investment in equity and equity-related instruments of small-cap companies.',
  },
  {
    id: 'flexi-cap',
    name: 'Flexi Cap Funds',
    tagline: 'Dynamic allocation across all market caps',
    icon: 'pie-chart-outline',
    badge: 'All-Weather',
    bgTint: '#F0FDF4',
    borderColor: '#BBF7D0',
    iconColor: '#16A34A',
    query: 'Flexi Cap',
    objective: 'Unconstrained investment across large, mid, and small-cap companies based on fund manager discretion and market valuations.',
    typicalHorizon: '5+ years',
    volatilityRating: 'Moderate volatility',
    volatilityExplanation: 'Blended risk profile adjusting dynamically to market opportunities.',
    growthPotential: 'Captures winners across any capitalization tier without regulatory lock-ins.',
    suitability: 'Core equity holding for investors seeking hands-off portfolio diversification.',
    limitations: 'High dependence on fund manager style and sector rotation skill.',
    benchmark: 'NIFTY 500 TRI',
    sebiDefinition: 'Minimum 65% in equity across large, mid, and small-cap stocks with no fixed sub-allocation limits.',
  },
  {
    id: 'multi-cap',
    name: 'Multi Cap Funds',
    tagline: 'Mandatory 25% in Large, Mid & Small',
    icon: 'grid-outline',
    badge: 'Disciplined Mix',
    bgTint: '#FAF5FF',
    borderColor: '#E9D5FF',
    iconColor: '#9333EA',
    query: 'Multi Cap',
    objective: 'Disciplined diversification ensuring mandatory exposure across large, mid, and small companies at all times.',
    typicalHorizon: '5 – 7+ years',
    volatilityRating: 'Moderate volatility',
    volatilityExplanation: 'Enforces 25% minimum in small-caps and mid-caps each, increasing upside potential but also volatility.',
    growthPotential: 'Ensures participation across the entire spectrum of Indian businesses.',
    suitability: 'Investors wanting guaranteed exposure to emerging enterprises alongside stable bluechips.',
    limitations: 'Mandatory allocations must be maintained even when small or mid caps are richly valued.',
    benchmark: 'NIFTY 500 Multicap 50:25:25 TRI',
    sebiDefinition: 'Minimum 75% in equity: min 25% in large cap, min 25% in mid cap, and min 25% in small cap.',
  },
  {
    id: 'large-mid',
    name: 'Large & Mid Cap Funds',
    tagline: 'Stability of Top 100 + Growth of Midcaps',
    icon: 'git-merge-outline',
    badge: 'Balanced Growth',
    bgTint: '#EFF6FF',
    borderColor: '#BFDBFE',
    iconColor: '#2563EB',
    query: 'Large & Mid Cap',
    objective: 'Combine safety of large companies with explosive growth potential of mid-sized champions.',
    typicalHorizon: '5+ years',
    volatilityRating: 'Moderate volatility',
    volatilityExplanation: 'Cushioned by bluechips while benefiting from mid-cap growth phases.',
    growthPotential: 'Consistent wealth generation with balanced risk-reward ratio.',
    suitability: 'Investors seeking more growth than pure large caps without the severity of pure small caps.',
    limitations: 'Lower resilience than pure large-caps during severe economic downturns.',
    benchmark: 'NIFTY LargeMidcap 250 TRI',
    sebiDefinition: 'Minimum 35% in large-cap stocks and minimum 35% in mid-cap stocks.',
  },
  {
    id: 'index-funds',
    name: 'Index Funds',
    tagline: 'Low-cost passive tracking of NIFTY 50',
    icon: 'trending-up-outline',
    badge: 'Lowest Cost',
    bgTint: '#EEF2FF',
    borderColor: '#C7D2FE',
    iconColor: '#4F46E5',
    query: 'Index Fund',
    objective: 'Replicate the performance of an underlying benchmark index (e.g. NIFTY 50 or SENSEX) with minimal tracking error.',
    typicalHorizon: '3 – 5+ years',
    volatilityRating: 'Historically lower volatility',
    volatilityExplanation: 'Mirrors the volatility of the underlying index; zero fund manager bias or selection risk.',
    growthPotential: 'Captures the exact weighted growth of India’s top corporations over decades.',
    suitability: 'Cost-conscious investors who believe in indexing without paying active management fees.',
    limitations: 'Cannot outperform the benchmark; fully exposed during market declines.',
    benchmark: 'NIFTY 50 Index / BSE SENSEX',
    sebiDefinition: 'Passive portfolio investing at least 95% in securities of the specified underlying index.',
  },
  {
    id: 'debt',
    name: 'Debt & Corporate Bond Funds',
    tagline: 'Capital preservation & regular income',
    icon: 'shield-checkmark-outline',
    badge: 'High Safety',
    bgTint: '#F8FAFC',
    borderColor: '#E2E8F0',
    iconColor: '#475569',
    query: 'Debt',
    objective: 'Preserve capital and generate regular yield by investing in government securities, corporate bonds, and money market instruments.',
    typicalHorizon: '1 – 3 years',
    volatilityRating: 'Historically lower volatility',
    volatilityExplanation: 'Low price volatility; influenced primarily by interest rate movements and credit ratings.',
    growthPotential: 'Predictable yields reflecting prevailing market interest rates; non-speculative.',
    suitability: 'Conservative investors, emergency cushions, and short-term financial goals.',
    limitations: 'Subject to interest rate cycles and credit default risk of bond issuers.',
    benchmark: 'CRISIL Composite Bond Fund Index',
    sebiDefinition: 'Investments in fixed-income debt securities and money market instruments.',
  },
  {
    id: 'liquid',
    name: 'Liquid Funds',
    tagline: 'Ideal parking ground for emergency funds',
    icon: 'water-outline',
    badge: 'Highest Liquidity',
    bgTint: '#F0FDFA',
    borderColor: '#99F6E4',
    iconColor: '#0D9488',
    query: 'Liquid',
    objective: 'Provide high liquidity and capital stability for surplus cash with maturities up to 91 days.',
    typicalHorizon: '1 day – 3 months',
    volatilityRating: 'Historically lower volatility',
    volatilityExplanation: 'Virtually negligible price fluctuation; high safety and rapid redemption.',
    growthPotential: 'Yields slightly above bank savings account rates while maintaining daily liquidity.',
    suitability: 'Emergency reserves and parking capital before deploying via systematic transfer plans (STP).',
    limitations: 'Returns are modest and do not beat high inflation over multi-year horizons.',
    benchmark: 'CRISIL Liquid Debt Index',
    sebiDefinition: 'Investment in debt and money market securities with maturity up to 91 days only.',
  },
  {
    id: 'hybrid',
    name: 'Hybrid & Balanced Funds',
    tagline: 'Equity growth cushioned with debt safety',
    icon: 'scale-outline',
    badge: 'Balanced Mix',
    bgTint: '#FAF5FF',
    borderColor: '#E9D5FF',
    iconColor: '#7E22CE',
    query: 'Hybrid',
    objective: 'Combine growth of equities with downside cushion of debt instruments in a single fund.',
    typicalHorizon: '3+ years',
    volatilityRating: 'Moderate volatility',
    volatilityExplanation: 'Lower volatility than pure equity funds; rebalances between equity and debt dynamically.',
    growthPotential: 'Wealth growth with softened volatility drawdowns during bear markets.',
    suitability: 'Moderate investors who wish to participate in equities without stomach-churning dips.',
    limitations: 'May lag pure equities during furious bull runs.',
    benchmark: 'CRISIL Hybrid 35+65 Aggressive Index',
    sebiDefinition: 'Investment in a mix of equity and debt instruments as per SEBI asset allocation mandates.',
  },
  {
    id: 'elss',
    name: 'ELSS Tax Saver Funds',
    tagline: 'Section 80C tax deduction with 3-yr lockin',
    icon: 'wallet-outline',
    badge: 'Save ₹46,800',
    bgTint: '#FEFCE8',
    borderColor: '#FEF08A',
    iconColor: '#CA8A04',
    query: 'ELSS',
    objective: 'Dual benefit of tax deduction under Section 80C (up to ₹1.5 Lakh) and equity wealth compounding.',
    typicalHorizon: '3 – 5+ years (Mandatory 3-year lock-in)',
    volatilityRating: 'Moderate volatility',
    volatilityExplanation: 'Subject to equity market movements; mandatory 3-year lock-in promotes disciplined holding.',
    growthPotential: 'Shortest lock-in period among all 80C tax-saving instruments (compared to PPF/FD 5-15 years).',
    suitability: 'Taxpayers under the Old Tax Regime seeking to reduce tax liability while building equity.',
    limitations: 'Investments cannot be redeemed before 3 completed years under any circumstances.',
    benchmark: 'NIFTY 500 TRI',
    sebiDefinition: 'Equity Linked Savings Scheme investing at least 80% in equities with a statutory 3-year lock-in.',
  },
  {
    id: 'sectoral',
    name: 'Sectoral Funds',
    tagline: 'High-conviction exposure to specific industries',
    icon: 'construct-outline',
    badge: 'High Concentration',
    bgTint: '#FFF1F2',
    borderColor: '#FECDD3',
    iconColor: '#E11D48',
    query: 'Sectoral',
    objective: 'Focus investments into a single economic sector such as Banking, IT, Healthcare, or Infrastructure.',
    typicalHorizon: '5+ years (tactical)',
    volatilityRating: 'Higher volatility',
    volatilityExplanation: 'Extreme cyclicality; lacks cross-sector diversification. When the sector faces headwinds, NAVs fall steeply.',
    growthPotential: 'Exceptional returns during sector up-cycles and secular industry tailwinds.',
    suitability: 'Sophisticated investors with deep sector knowledge and high risk absorption capability.',
    limitations: 'High concentration risk; not recommended as a core portfolio holding.',
    benchmark: 'Respective Sector Index (e.g. NIFTY Bank TRI)',
    sebiDefinition: 'Minimum 80% investment in equity instruments of a specific defined economic sector.',
  },
  {
    id: 'thematic',
    name: 'Thematic Funds',
    tagline: 'Macro trends like Manufacturing or Green Energy',
    icon: 'leaf-outline',
    badge: 'Macro Trend',
    bgTint: '#ECFDF5',
    borderColor: '#A7F3D0',
    iconColor: '#059669',
    query: 'Thematic',
    objective: 'Invest across multiple sectors tied together by an overarching structural economic theme (e.g. India Consumption, Defense, Green Energy).',
    typicalHorizon: '5+ years',
    volatilityRating: 'Higher volatility',
    volatilityExplanation: 'Broader than sectoral funds, but still concentrated around specific economic drivers.',
    growthPotential: 'Captures multi-decade megatrends in Indian economic transformation.',
    suitability: 'Experienced investors wanting satellite exposure to structural government policies.',
    limitations: 'Themes may take years to play out; valuation bubbles can occur during hype cycles.',
    benchmark: 'NIFTY Thematic Indices',
    sebiDefinition: 'Minimum 80% investment in equities conforming to the specific stated theme.',
  },
];

interface AcademyLesson {
  id: string;
  topic: string;
  title: string;
  readTime: string;
  summary: string;
  body: string[];
  takeaways: string[];
}

const ACADEMY_LESSONS: AcademyLesson[] = [
  {
    id: 'sip-vs-lumpsum',
    topic: 'Investing Fundamentals',
    title: 'SIP vs Lump Sum: Which is Better for You?',
    readTime: '2 min read',
    summary: 'Systematic Investment Plans (SIP) remove the impossible challenge of timing the market by investing fixed sums every month.',
    body: [
      'Timing the stock market is notoriously difficult, even for experienced fund managers. When you invest a lump sum, you risk deploying capital at market peaks.',
      'A Systematic Investment Plan (SIP) automatically invests a fixed amount on a chosen date every month. When prices are high, your SIP buys fewer units; when prices fall, your SIP buys more units automatically.',
      'This process—called Rupee Cost Averaging—smooths out purchase costs and cultivates investing discipline without emotional anxiety.',
    ],
    takeaways: [
      'SIP builds wealth through consistent discipline, not market guessing.',
      'Rupee Cost Averaging turns market dips into unit-accumulation opportunities.',
      'Lump-sum investments are best suited for debt funds or staggered STP deployments.',
    ],
  },
  {
    id: 'understanding-nav',
    topic: 'Mutual Fund Mechanics',
    title: 'Understanding NAV: Why ₹10 NAV is Not Cheaper than ₹500 NAV',
    readTime: '2 min read',
    summary: 'Net Asset Value (NAV) represents the market value per unit. A lower NAV does not mean a fund is cheap or will grow faster.',
    body: [
      'A common retail investor misconception is thinking a mutual fund with a ₹10 NAV is "cheaper" than a fund with a ₹500 NAV.',
      'NAV simply equals: (Total Value of Stocks + Cash - Expenses) ÷ Total Number of Units Issued.',
      'If you invest ₹10,000 in a ₹10 NAV fund, you get 1,000 units. If the underlying stocks rise 10%, your investment becomes ₹11,000.',
      'If you invest ₹10,000 in a ₹500 NAV fund, you get 20 units. If its underlying stocks rise 10%, your investment also becomes ₹11,000! Both grow at the exact same rate regardless of starting NAV.',
    ],
    takeaways: [
      'NAV is an accounting unit, not a stock price.',
      'Focus on the fund portfolio quality, track record, and expense ratio, not whether the NAV is ₹10 or ₹500.',
    ],
  },
  {
    id: 'expense-ratio',
    topic: 'Costs & Returns',
    title: 'Expense Ratio Demystified: The Cost of Compounding',
    readTime: '3 min read',
    summary: 'The Total Expense Ratio (TER) is the annual percentage fee deducted daily from a mutual fund’s assets to manage the portfolio.',
    body: [
      'Every mutual fund charges an annual fee covering management, operations, audit, and distribution. This fee is known as the Total Expense Ratio (TER).',
      'SEBI imposes strict statutory caps on expense ratios: larger funds must reduce their expense ratios progressively as their AUM grows.',
      'All published NAVs and historical mutual fund returns are already net of expense ratios—there are no separate hidden bills sent to investors.',
      'Direct mutual fund plans have lower expense ratios (often 0.5% to 1.0% lower) than Regular plans because distributor commissions are not deducted.',
    ],
    takeaways: [
      'Expense ratios are factored into daily NAVs automatically.',
      'Direct plans compound faster over 15–20 years because of lower expense ratios.',
      'Always compare expense ratios within the same category (e.g. Large Cap vs Large Cap).',
    ],
  },
  {
    id: 'riskometer-guide',
    topic: 'SEBI Investor Protection',
    title: 'How the 6-Level SEBI Riskometer Protects You',
    readTime: '2 min read',
    summary: 'SEBI mandates every scheme display a 6-tier Riskometer based on concrete portfolio liquidity, credit risk, and price volatility.',
    body: [
      'Under SEBI regulations, every mutual fund scheme must clearly show its risk level on a 6-tiered gauge: Low, Low to Moderate, Moderate, Moderately High, High, and Very High.',
      'This rating is not subjective: it is calculated mathematically every month based on the underlying portfolio’s liquidity score, credit quality, and stock volatility.',
      'If a fund’s portfolio risk shifts, the fund house must inform all unitholders and update the Riskometer immediately.',
    ],
    takeaways: [
      'Always check the scheme Riskometer before investing.',
      'Ensure the fund’s Riskometer matches your personal assessed risk profile.',
      'The Riskometer is reviewed every month by the AMC under statutory guidelines.',
    ],
  },
];

interface JourneyChallenge {
  id: string;
  title: string;
  duration: string;
  badge: string;
  completed: boolean;
  lessonsCount: number;
}

const JOURNEY_CHALLENGES: JourneyChallenge[] = [
  { id: 'c1', title: 'Understand SIP in 3 Lessons', duration: '6 mins', badge: 'SIP Starter', completed: true, lessonsCount: 3 },
  { id: 'c2', title: 'Learn the Basics of NIFTY 50', duration: '5 mins', badge: 'Market Explorer', completed: true, lessonsCount: 2 },
  { id: 'c3', title: 'Mastering Risk & Volatility', duration: '8 mins', badge: 'Risk Reader', completed: false, lessonsCount: 4 },
  { id: 'c4', title: 'The Power of Diversification', duration: '5 mins', badge: 'Diversification Learner', completed: false, lessonsCount: 3 },
  { id: 'c5', title: 'How to Read a Fund Factsheet', duration: '7 mins', badge: 'Fund Researcher', completed: false, lessonsCount: 3 },
];

export const ArthaVerseScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  // State
  const [activeTab, setActiveTab] = useState<SubSectionTab>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Market intelligence data
  const [marketOverview, setMarketOverview] = useState<MarketOverviewResponse | null>(null);
  const [marketNews, setMarketNews] = useState<MarketNewsItem[]>([]);
  const [personalBrief, setPersonalBrief] = useState<PersonalMarketBrief | null>(null);
  const [dailyLesson, setDailyLesson] = useState<DailyMoneyLesson | null>(null);
  const [marketQuiz, setMarketQuiz] = useState<MarketQuiz | null>(null);

  // Interactive UI modals
  const [marketModalVisible, setMarketModalVisible] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'mood'>('overview');
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<CategoryDetail | null>(null);
  const [selectedAcademyLesson, setSelectedAcademyLesson] = useState<AcademyLesson | null>(null);

  // ArthaPlay state
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState<string | null>(null);
  const [streakDays, setStreakDays] = useState(5);
  const [knowledgePoints, setKnowledgePoints] = useState(350);

  const fetchData = useCallback(async () => {
    try {
      const [marketOverviewRes, marketNewsRes, marketDailyRes, briefRes] = await Promise.all([
        fetch(`${API_URL}/market/overview`).catch(() => null),
        fetch(`${API_URL}/market/news`).catch(() => null),
        fetch(`${API_URL}/market/daily`).catch(() => null),
        fetch(`${API_URL}/market/brief?riskProfile=Moderate`).catch(() => null),
      ]);

      if (marketOverviewRes?.ok) setMarketOverview(await marketOverviewRes.json());
      if (marketNewsRes?.ok) setMarketNews(await marketNewsRes.json());
      if (marketDailyRes?.ok) {
        const d = await marketDailyRes.json();
        setDailyLesson(d.lesson);
        setMarketQuiz(d.quiz);
      }
      if (briefRes?.ok) setPersonalBrief(await briefRes.json());
    } catch (e) {
      console.log('Error fetching ArthaVerse data', e);
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleOpenSourceUrl = async (url: string) => {
    try {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
    } catch (e) {
      console.log('Error opening URL', e);
    }
  };

  const handleSelectFundCategory = (query: string) => {
    setSelectedCategoryDetail(null);
    navigation.navigate('Funds', { query });
  };

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
        {/* 1. Branded ArthaVerse Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.sparkleDot} />
              <Text style={styles.heroEyebrow}>ARTHAVERSE DESTINATION</Text>
            </View>
            <Text style={styles.heroTitle}>Explore the World of Investing</Text>
            <Text style={styles.heroSubtitle}>
              Live Indian markets, vetted fund intelligence, verified news & interactive financial education.
            </Text>
          </View>
        </View>

        {/* 2. Top Segmented Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subFilterScroll}
        >
          {[
            { id: 'all', label: 'All Destination' },
            { id: 'markets', label: 'Market Boulevard' },
            { id: 'news', label: 'What’s Moving' },
            { id: 'explorer', label: 'Category Explorer' },
            { id: 'play', label: 'ArthaPlay' },
            { id: 'academy', label: 'Artha Academy' },
            { id: 'research', label: 'Research & Sources' },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id as SubSectionTab)}
                style={[styles.subTabPill, isSelected && styles.subTabPillActive]}
              >
                <Text style={[styles.subTabText, isSelected && styles.subTabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 3. SECTION: MARKET BOULEVARD */}
        {(activeTab === 'all' || activeTab === 'markets') && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Market Boulevard</Text>
                <Text style={styles.sectionSubtitle}>Verified Indian Benchmark Indices & Sector Pulse</Text>
              </View>
              <Pressable
                style={styles.sourceTag}
                onPress={() => handleOpenSourceUrl('https://www.nseindia.com')}
              >
                <Ionicons name="open-outline" size={11} color="#3C3985" />
                <Text style={styles.sourceTagText}>NSE Official</Text>
              </Pressable>
            </View>

            <MarketPulseCard
              data={marketOverview}
              loading={loading}
              onExplorePress={() => {
                setActiveModalTab('overview');
                setMarketModalVisible(true);
              }}
              onMoodPress={() => {
                setActiveModalTab('mood');
                setMarketModalVisible(true);
              }}
            />

            {/* Contextual Link */}
            <Pressable
              style={styles.contextualLinkRow}
              onPress={() => handleOpenSourceUrl('https://www.nseindia.com/products-services/indices-nifty50-index')}
            >
              <Ionicons name="information-circle-outline" size={14} color="#3C3985" />
              <Text style={styles.contextualLinkText}>
                Explore the official index methodology on NSE Indices →
              </Text>
            </Pressable>
          </View>
        )}

        {/* 4. SECTION: YOUR MARKET BRIEF */}
        {(activeTab === 'all' || activeTab === 'news') && (
          <View style={styles.sectionWrap}>
            <MarketBriefCard
              brief={personalBrief}
              onExploreCategory={(cat) => handleSelectFundCategory(cat.split(' ')[0])}
            />
          </View>
        )}

        {/* 5. SECTION: WHAT'S MOVING THE MARKET (NEWS) */}
        {(activeTab === 'all' || activeTab === 'news') && (
          <View style={styles.sectionWrap}>
            <MarketStoriesSection news={marketNews} />
          </View>
        )}

        {/* 6. SECTION: INVESTMENT EXPLORER (13 MUTUAL FUND CATEGORIES) */}
        {(activeTab === 'all' || activeTab === 'explorer') && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Investment Explorer</Text>
                <Text style={styles.sectionSubtitle}>
                  13 SEBI-classified fund categories with risk & horizon guidance
                </Text>
              </View>
              <Pressable
                style={styles.sourceTag}
                onPress={() => handleOpenSourceUrl('https://www.amfiindia.com/investor-corner/knowledge-center/types-of-funds.html')}
              >
                <Ionicons name="open-outline" size={11} color="#3C3985" />
                <Text style={styles.sourceTagText}>SEBI / AMFI</Text>
              </Pressable>
            </View>

            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={styles.catCard}
                  onPress={() => setSelectedCategoryDetail(cat)}
                >
                  <View style={styles.catCardTop}>
                    <View style={[styles.catIconWrap, { backgroundColor: cat.bgTint, borderColor: cat.borderColor }]}>
                      <Ionicons name={cat.icon} size={18} color={cat.iconColor} />
                    </View>
                    <View style={[styles.catBadge, { backgroundColor: cat.bgTint }]}>
                      <Text style={[styles.catBadgeText, { color: cat.iconColor }]}>{cat.badge}</Text>
                    </View>
                  </View>

                  <Text style={styles.catCardTitle}>{cat.name}</Text>
                  <Text style={styles.catCardTagline} numberOfLines={2}>
                    {cat.tagline}
                  </Text>

                  <View style={styles.catCardFooter}>
                    <Text style={styles.horizonText}>⏱️ {cat.typicalHorizon}</Text>
                    <Pressable
                      style={styles.viewFundsPill}
                      onPress={() => handleSelectFundCategory(cat.query)}
                    >
                      <Text style={styles.viewFundsText}>View Funds</Text>
                      <Ionicons name="chevron-forward" size={11} color="#3C3985" />
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Contextual Link */}
            <Pressable
              style={styles.contextualLinkRow}
              onPress={() => handleOpenSourceUrl('https://www.amfiindia.com/investor-corner/knowledge-center/understanding-mutual-funds.html')}
            >
              <Ionicons name="book-outline" size={14} color="#3C3985" />
              <Text style={styles.contextualLinkText}>
                Learn how SEBI classifies mutual fund categories on AMFI →
              </Text>
            </Pressable>
          </View>
        )}

        {/* 7. SECTION: PROFESSIONAL GAMIFICATION (ARTHAPLAY) */}
        {(activeTab === 'all' || activeTab === 'play') && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>ArthaPlay</Text>
                <Text style={styles.sectionSubtitle}>
                  Bite-sized challenges & knowledge streaks (strictly educational)
                </Text>
              </View>
            </View>

            {/* Gamification Stats Card */}
            <View style={styles.playStatsCard}>
              <View style={styles.statPill}>
                <Text style={styles.statEmoji}>🔥</Text>
                <View>
                  <Text style={styles.statVal}>{streakDays} Days</Text>
                  <Text style={styles.statSub}>Learning Streak</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statPill}>
                <Text style={styles.statEmoji}>⭐</Text>
                <View>
                  <Text style={styles.statVal}>{knowledgePoints} KP</Text>
                  <Text style={styles.statSub}>Knowledge Points</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statPill}>
                <Text style={styles.statEmoji}>🏅</Text>
                <View>
                  <Text style={styles.statVal}>2 Badges</Text>
                  <Text style={styles.statSub}>Milestones</Text>
                </View>
              </View>
            </View>

            {/* Daily Interactive Finance Question */}
            {marketQuiz && (
              <View style={styles.quizBox}>
                <View style={styles.quizHeader}>
                  <Ionicons name="sparkles" size={16} color="#7E22CE" />
                  <Text style={styles.quizEyebrow}>DAILY FINANCE CHECKPOINT</Text>
                </View>
                <Text style={styles.quizQuestion}>{marketQuiz.question}</Text>

                <View style={styles.quizOptions}>
                  {marketQuiz.options.map((opt) => {
                    const isSelected = selectedQuizOption === opt.id;
                    let border = '#E2E8F0';
                    let bg = '#FFFFFF';
                    if (quizAnswered) {
                      if (opt.isCorrect) {
                        border = '#10B981';
                        bg = '#ECFDF5';
                      } else if (isSelected && !opt.isCorrect) {
                        border = '#EF4444';
                        bg = '#FEF2F2';
                      }
                    }

                    return (
                      <Pressable
                        key={opt.id}
                        style={[styles.quizOptionRow, { borderColor: border, backgroundColor: bg }]}
                        onPress={() => {
                          setSelectedQuizOption(opt.id);
                          setQuizAnswered(true);
                          if (opt.isCorrect) setKnowledgePoints((prev) => prev + 25);
                        }}
                        disabled={quizAnswered}
                      >
                        <Text style={styles.quizOptionText}>{opt.text}</Text>
                        {quizAnswered && opt.isCorrect && (
                          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                        )}
                        {quizAnswered && isSelected && !opt.isCorrect && (
                          <Ionicons name="close-circle" size={18} color="#EF4444" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {quizAnswered && (
                  <View style={styles.quizExplainer}>
                    <Text style={styles.quizExplainerTitle}>💡 WHY THIS MATTERS</Text>
                    <Text style={styles.quizExplainerBody}>{marketQuiz.explanation}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Learning Journey Challenges */}
            <View style={styles.challengesContainer}>
              <Text style={styles.challengesTitle}>Investment Journey Challenges</Text>
              {JOURNEY_CHALLENGES.map((ch) => (
                <View key={ch.id} style={styles.challengeItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.challengeItemTitle}>{ch.title}</Text>
                    <Text style={styles.challengeMeta}>
                      ⏱️ {ch.duration} • Badge: <Text style={{ fontWeight: '700', color: '#3C3985' }}>{ch.badge}</Text>
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.challengeBadge,
                      { backgroundColor: ch.completed ? '#ECFDF5' : '#F1F5F9' },
                    ]}
                  >
                    <Ionicons
                      name={ch.completed ? 'checkmark-circle' : 'time-outline'}
                      size={16}
                      color={ch.completed ? '#10B981' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.challengeBadgeText,
                        { color: ch.completed ? '#065F46' : '#64748B' },
                      ]}
                    >
                      {ch.completed ? 'Completed' : 'Start'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Ethical Compliance Banner */}
            <View style={styles.ethicalNotice}>
              <Text style={styles.ethicalNoticeText}>
                🛡️ TechArtha Gamification Ethics: Points and badges reward educational curiosity only. We never incentivize financial deposits, trade frequency, or leverage.
              </Text>
            </View>
          </View>
        )}

        {/* 8. SECTION: ARTHA ACADEMY */}
        {(activeTab === 'all' || activeTab === 'academy') && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Artha Academy</Text>
                <Text style={styles.sectionSubtitle}>
                  Bite-sized financial lessons written in simple plain English
                </Text>
              </View>
            </View>

            <View style={styles.academyList}>
              {ACADEMY_LESSONS.map((lesson) => (
                <Pressable
                  key={lesson.id}
                  style={styles.academyCard}
                  onPress={() => setSelectedAcademyLesson(lesson)}
                >
                  <View style={styles.academyCardTop}>
                    <Text style={styles.academyTopic}>{lesson.topic}</Text>
                    <Text style={styles.academyReadTime}>{lesson.readTime}</Text>
                  </View>
                  <Text style={styles.academyTitle}>{lesson.title}</Text>
                  <Text style={styles.academySummary} numberOfLines={2}>
                    {lesson.summary}
                  </Text>
                  <View style={styles.academyCardFooter}>
                    <Text style={styles.readLessonText}>Read Lesson in 2 Mins</Text>
                    <Ionicons name="arrow-forward" size={13} color="#3C3985" />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* 9. SECTION: RESEARCH & OFFICIAL RESOURCES */}
        {(activeTab === 'all' || activeTab === 'research') && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Research & Official Resources</Text>
                <Text style={styles.sectionSubtitle}>
                  Direct links to authoritative regulatory & exchange resources
                </Text>
              </View>
            </View>

            <View style={styles.resourcesList}>
              {[
                {
                  title: 'SEBI Investor Education Platform',
                  subtitle: 'Official regulatory guidelines, investor rights, and grievance redressal via SCORES.',
                  url: 'https://investor.sebi.gov.in',
                  badge: 'Regulator',
                },
                {
                  title: 'AMFI Mutual Funds Sahi Hai',
                  subtitle: 'Industry-wide knowledge portal, scheme classification rules, and SIP calculators.',
                  url: 'https://www.amfiindia.com',
                  badge: 'Industry Body',
                },
                {
                  title: 'NSE India Indices Portal',
                  subtitle: 'Real-time factsheets, index governance, P/E ratios, and methodology documents.',
                  url: 'https://www.nseindia.com',
                  badge: 'Stock Exchange',
                },
                {
                  title: 'Reserve Bank of India Monetary Policy',
                  subtitle: 'Repo rate decisions, inflation targets, liquidity framework, and financial stability reports.',
                  url: 'https://www.rbi.org.in',
                  badge: 'Central Bank',
                },
              ].map((res, i) => (
                <Pressable
                  key={i}
                  style={styles.resourceCard}
                  onPress={() => handleOpenSourceUrl(res.url)}
                >
                  <View style={styles.resourceTop}>
                    <Text style={styles.resourceName}>{res.title}</Text>
                    <View style={styles.resourceBadge}>
                      <Text style={styles.resourceBadgeText}>{res.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.resourceDesc}>{res.subtitle}</Text>
                  <View style={styles.resourceFooter}>
                    <Text style={styles.visitLinkText}>Visit Official Portal</Text>
                    <Ionicons name="open-outline" size={13} color="#3C3985" />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Compliance Footer */}
        <View style={styles.complianceFooter}>
          <Text style={styles.complianceText}>
            Mutual fund investments are subject to market risks. Read all scheme related documents carefully before investing. Past performance is not indicative of future returns.
          </Text>
          <Text style={[styles.complianceText, { marginTop: 4, fontWeight: '700' }]}>
            TechArtha 2.0 • AMFI-Registered Mutual Fund Distributor • Cybrilla Technology Partner
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Comprehensive Category Detail Modal */}
      <Modal
        visible={!!selectedCategoryDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCategoryDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.categoryModalBox}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalCategoryTitle}>{selectedCategoryDetail?.name}</Text>
                <Text style={styles.modalCategorySubtitle}>{selectedCategoryDetail?.tagline}</Text>
              </View>
              <Pressable onPress={() => setSelectedCategoryDetail(null)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
              <View style={styles.modalMetaPills}>
                <View style={styles.pillItem}>
                  <Text style={styles.pillLabel}>HORIZON</Text>
                  <Text style={styles.pillVal}>{selectedCategoryDetail?.typicalHorizon}</Text>
                </View>
                <View style={styles.pillItem}>
                  <Text style={styles.pillLabel}>VOLATILITY</Text>
                  <Text style={styles.pillVal}>{selectedCategoryDetail?.volatilityRating}</Text>
                </View>
              </View>

              <View style={styles.modalDetailSection}>
                <Text style={styles.modalSectionHeading}>INVESTMENT OBJECTIVE</Text>
                <Text style={styles.modalSectionBody}>{selectedCategoryDetail?.objective}</Text>
              </View>

              <View style={styles.modalDetailSection}>
                <Text style={styles.modalSectionHeading}>SEBI OFFICIAL DEFINITION</Text>
                <Text style={styles.modalSectionBody}>{selectedCategoryDetail?.sebiDefinition}</Text>
              </View>

              <View style={styles.modalDetailSection}>
                <Text style={styles.modalSectionHeading}>VOLATILITY & RISK PROFILE</Text>
                <Text style={styles.modalSectionBody}>{selectedCategoryDetail?.volatilityExplanation}</Text>
                <Text style={styles.disclaimerNote}>
                  Note: Past volatility is calculated based on historical cycles and does not guarantee future stability.
                </Text>
              </View>

              <View style={styles.modalDetailSection}>
                <Text style={styles.modalSectionHeading}>SUITABILITY & HORIZON</Text>
                <Text style={styles.modalSectionBody}>{selectedCategoryDetail?.suitability}</Text>
              </View>

              <View style={styles.modalDetailSection}>
                <Text style={styles.modalSectionHeading}>BENCHMARK</Text>
                <Text style={styles.modalSectionBody}>{selectedCategoryDetail?.benchmark}</Text>
              </View>
            </ScrollView>

            <Pressable
              style={styles.modalViewFundsBtn}
              onPress={() => selectedCategoryDetail && handleSelectFundCategory(selectedCategoryDetail.query)}
            >
              <Text style={styles.modalViewFundsText}>Explore {selectedCategoryDetail?.name}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Academy Lesson Reader Modal */}
      <Modal
        visible={!!selectedAcademyLesson}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAcademyLesson(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.categoryModalBox}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.academyTopicBadge}>{selectedAcademyLesson?.topic}</Text>
                <Text style={styles.modalCategoryTitle}>{selectedAcademyLesson?.title}</Text>
              </View>
              <Pressable onPress={() => setSelectedAcademyLesson(null)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
              <Text style={styles.lessonReadTimeMeta}>⏱️ {selectedAcademyLesson?.readTime} • Verified Financial Education</Text>

              {selectedAcademyLesson?.body.map((p, idx) => (
                <Text key={idx} style={styles.lessonParagraph}>
                  {p}
                </Text>
              ))}

              <View style={styles.lessonTakeawaysBox}>
                <Text style={styles.lessonTakeawaysTitle}>📌 KEY TAKEAWAYS</Text>
                {selectedAcademyLesson?.takeaways.map((pt, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Ionicons name="checkmark" size={14} color="#3C3985" />
                    <Text style={styles.bulletText}>{pt}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <Pressable
              style={styles.modalViewFundsBtn}
              onPress={() => setSelectedAcademyLesson(null)}
            >
              <Text style={styles.modalViewFundsText}>Done Reading</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Market Details Modal */}
      <MarketDetailModal
        visible={marketModalVisible}
        onClose={() => setMarketModalVisible(false)}
        data={marketOverview}
        activeTab={activeModalTab}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FD' },
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
  heroBanner: {
    backgroundColor: '#3C3985',
    borderRadius: 22,
    padding: 22,
    marginBottom: 16,
    shadowColor: '#3C3985',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  heroContent: {
    gap: 6,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sparkleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F7941E',
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F7941E',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  subFilterScroll: {
    paddingBottom: 14,
    gap: 8,
  },
  subTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subTabPillActive: {
    backgroundColor: '#3C3985',
    borderColor: '#3C3985',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#FFFFFF',
  },
  sectionWrap: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#102A54',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EBEBFA',
  },
  sourceTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3C3985',
  },
  contextualLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  contextualLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3C3985',
    textDecorationLine: 'underline',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  catCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
  },
  catCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  catCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 4,
  },
  catCardTagline: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 10,
    height: 30,
  },
  catCardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  horizonText: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  viewFundsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewFundsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C3985',
  },
  playStatsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statEmoji: {
    fontSize: 20,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#102A54',
  },
  statSub: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  quizBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 14,
  },
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  quizEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7E22CE',
    letterSpacing: 0.8,
  },
  quizQuestion: {
    fontSize: 15,
    fontWeight: '800',
    color: '#102A54',
    lineHeight: 21,
    marginBottom: 12,
  },
  quizOptions: {
    gap: 8,
    marginBottom: 10,
  },
  quizOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  quizOptionText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  quizExplainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D8B4FE',
    marginTop: 6,
  },
  quizExplainerTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#3C3985',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  quizExplainerBody: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  challengesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    marginBottom: 12,
  },
  challengesTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 4,
  },
  challengeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  challengeItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#102A54',
  },
  challengeMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  challengeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  challengeBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  ethicalNotice: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ethicalNoticeText: {
    fontSize: 10.5,
    color: '#64748B',
    lineHeight: 15,
  },
  academyList: {
    gap: 12,
  },
  academyCard: {
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
  academyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  academyTopic: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3C3985',
    textTransform: 'uppercase',
  },
  academyReadTime: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  academyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 4,
  },
  academySummary: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 16,
    marginBottom: 10,
  },
  academyCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  readLessonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C3985',
  },
  resourcesList: {
    gap: 10,
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resourceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resourceName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
    flex: 1,
    marginRight: 8,
  },
  resourceBadge: {
    backgroundColor: '#EBEBFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  resourceBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#3C3985',
  },
  resourceDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 8,
  },
  resourceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visitLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C3985',
  },
  complianceFooter: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
  },
  complianceText: {
    fontSize: 10.5,
    color: '#64748B',
    lineHeight: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 84, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  categoryModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  modalCategoryTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#102A54',
  },
  modalCategorySubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalMetaPills: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  pillItem: {
    flex: 1,
    backgroundColor: '#F8F9FD',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  pillVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#102A54',
    marginTop: 2,
  },
  modalDetailSection: {
    marginBottom: 14,
  },
  modalSectionHeading: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3C3985',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  modalSectionBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  disclaimerNote: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalViewFundsBtn: {
    backgroundColor: '#3C3985',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 10,
  },
  modalViewFundsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  academyTopicBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3C3985',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  lessonReadTimeMeta: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 14,
  },
  lessonParagraph: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 21,
    marginBottom: 12,
  },
  lessonTakeawaysBox: {
    backgroundColor: '#F8F9FD',
    borderRadius: 14,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lessonTakeawaysTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3C3985',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bulletText: {
    flex: 1,
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 17,
  },
});
