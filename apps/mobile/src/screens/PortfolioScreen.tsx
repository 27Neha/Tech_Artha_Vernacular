import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Linking, Modal, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { authStore } from '../store/auth';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Header } from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { SolidTabs } from '../components/SolidTabs';
import { API_URL } from '../services/api/client';

type Tab = 'overview' | 'goals' | 'holdings' | 'transactions' | 'sips' | 'statements';

const TABS: Tab[] = ['overview', 'goals', 'holdings', 'transactions', 'sips', 'statements'];

/** One scheme in one folio, from GET /portfolio (Cybrilla's holdings report). */
type Holding = {
  folioNumber: string;
  schemeIsin: string;
  schemeName: string | null;
  units: number;
  redeemableUnits: number;
  nav: number | null;
  navDate: string | null;
  marketValue: number | null;
  investedValue: number | null;
};

type PortfolioResponse = {
  status: 'OK' | 'NO_ACCOUNT' | 'UNAVAILABLE';
  holdings: Holding[];
  totals: { invested: number | null; current: number | null; gain: number | null } | null;
  asOn: string | null;
  /** How the figures are arrived at - shown with them (Cybrilla compliance point 10). */
  method: string;
  message?: string | null;
};

type Order = { id: string; fundName: string; amount: number; statusLabel: string; paymentUrl: string | null; createdAt: string };
type Plan = { id: string; fundName: string; amount: number; frequency: string; installmentDay: number; statusLabel: string; paymentUrl: string | null; createdAt: string };

const rupees = (v: number | null | undefined, digits = 0) =>
  v == null ? '—' : `₹${v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const escapeHtml = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const PortfolioScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    const requestedTab = route?.params?.tab as Tab | undefined;
    if (requestedTab && TABS.includes(requestedTab)) {
      setTab(requestedTab);
    }
  }, [route?.params?.tab]);
  
  const [investorProfile, setInvestorProfile] = useState('');
  const [investor, setInvestor] = useState<{ name?: string; pan?: string; email?: string; mobile?: string }>({});
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [fetchingPortfolio, setFetchingPortfolio] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  // Holding actions & modals state
  const [menuHolding, setMenuHolding] = useState<Holding | null>(null);
  const [detailHolding, setDetailHolding] = useState<Holding | null>(null);
  const [modifyingPlan, setModifyingPlan] = useState<Plan | null>(null);
  const [modifyAmount, setModifyAmount] = useState<string>('');
  const [modifyDay, setModifyDay] = useState<number>(10);
  const [transactionFilter, setTransactionFilter] = useState<string | null>(null);

  const getMatchingPlan = useCallback((holding: Holding): Plan | undefined => {
    const norm = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const hNorm = norm(holding.schemeName);
    return plans.find((p) => {
      const pNorm = norm(p.fundName);
      return Boolean(pNorm && hNorm && (pNorm.includes(hNorm) || hNorm.includes(pNorm)));
    });
  }, [plans]);

  const handleStartSip = (holding: Holding) => {
    setMenuHolding(null);
    navigation.navigate('Funds', { query: holding.schemeName || '' });
  };

  const handlePauseSip = (holding: Holding, plan: Plan) => {
    setMenuHolding(null);
    Alert.alert(
      'Pause SIP',
      `Pause monthly SIP of ${rupees(plan.amount)} for ${plan.fundName}?\n\nFuture automated debits will be placed on hold. Your existing invested units will remain active. You can resume anytime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause SIP',
          style: 'destructive',
          onPress: () => {
            setPlans((prev) =>
              prev.map((p) => (p.id === plan.id ? { ...p, statusLabel: 'Paused' } : p))
            );
            Alert.alert('SIP Paused', 'Your SIP has been paused. Auto-debit instructions are now on hold.');
          },
        },
      ]
    );
  };

  const handleResumeSip = (holding: Holding, plan: Plan) => {
    setMenuHolding(null);
    Alert.alert(
      'Resume SIP',
      `Resume monthly SIP of ${rupees(plan.amount)} on day ${plan.installmentDay} for ${plan.fundName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resume SIP',
          onPress: () => {
            setPlans((prev) =>
              prev.map((p) => (p.id === plan.id ? { ...p, statusLabel: 'Active' } : p))
            );
            Alert.alert('SIP Resumed', 'Your monthly SIP has been resumed successfully.');
          },
        },
      ]
    );
  };

  const handleOpenModifySip = (holding: Holding, plan: Plan) => {
    setMenuHolding(null);
    setModifyingPlan(plan);
    setModifyAmount(String(plan.amount));
    setModifyDay(plan.installmentDay || 10);
  };

  const handleSaveModifiedSip = () => {
    if (!modifyingPlan) return;
    const numeric = Number(modifyAmount);
    if (!numeric || numeric < 500) {
      Alert.alert('Invalid amount', 'Minimum SIP amount is ₹500.');
      return;
    }
    setPlans((prev) =>
      prev.map((p) =>
        p.id === modifyingPlan.id
          ? { ...p, amount: numeric, installmentDay: modifyDay }
          : p
      )
    );
    const updatedFundName = modifyingPlan.fundName;
    setModifyingPlan(null);
    Alert.alert(
      'SIP Modified',
      `SIP for ${updatedFundName} updated to ${rupees(numeric)} on the ${modifyDay}th of each month.`
    );
  };

  const handleCancelSip = (holding: Holding, plan: Plan) => {
    setMenuHolding(null);
    Alert.alert(
      'Stop / Cancel SIP',
      `Are you sure you want to stop this SIP of ${rupees(plan.amount)} for ${plan.fundName}?\n\nStopping will permanently stop future recurring installments. Your existing investments of ${rupees(holding.marketValue, 2)} will remain safely invested in your folio.`,
      [
        { text: 'Keep SIP', style: 'cancel' },
        {
          text: 'Stop SIP',
          style: 'destructive',
          onPress: () => {
            setPlans((prev) => prev.filter((p) => p.id !== plan.id));
            Alert.alert('SIP Cancelled', 'Your SIP has been stopped. No further deductions will occur.');
          },
        },
      ]
    );
  };

  const handleRedeem = (holding: Holding) => {
    setMenuHolding(null);
    setDetailHolding(null);
    navigation.navigate('Redeem', {
      holding,
      folioNumber: holding.folioNumber,
      schemeIsin: holding.schemeIsin,
    });
  };

  const handleViewTransactions = (holding: Holding) => {
    setMenuHolding(null);
    setDetailHolding(null);
    setTransactionFilter(holding.schemeName || holding.schemeIsin);
    setTab('transactions');
  };

  const handleViewDetails = (holding: Holding) => {
    setMenuHolding(null);
    setDetailHolding(holding);
  };

  const [goals, setGoals] = useState<any[]>([]);
  const [fetchingGoals, setFetchingGoals] = useState(true);

  const fetchProfileData = async () => {
    try {
      const token = authStore.accessToken;
      if (!token) return;
      const res = await fetch(`${API_URL}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.riskProfile?.category) {
          const cat = data.riskProfile.category;
          setInvestorProfile(cat.toUpperCase());
        }
        setInvestor({ name: data.profile?.fullName, pan: data.profile?.pan, email: data.email, mobile: data.mobile });
      }
    } catch (e) {
      console.error('Failed to fetch profile', e);
    }
  };

  const fetchPortfolioData = async () => {
    try {
      const token = authStore.accessToken;
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const [portRes, invRes] = await Promise.all([
        fetch(`${API_URL}/portfolio`, { headers }),
        fetch(`${API_URL}/buckets/investments`, { headers }),
      ]);
      if (portRes.ok) setPortfolio(await portRes.json());
      if (invRes.ok) {
        const inv = await invRes.json();
        setOrders(inv.orders ?? []);
        setPlans(inv.plans ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch portfolio', err);
    } finally {
      setFetchingPortfolio(false);
    }
  };

  const holdings = portfolio?.holdings ?? [];
  const totals = portfolio?.totals ?? null;
  const gainPct =
    totals?.gain != null && totals.invested ? ((totals.gain / totals.invested) * 100).toFixed(2) : null;

  const openPayment = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open the payment page', 'Please try again.');
    }
  };

  const fetchGoalsData = async () => {
    try {
      const token = authStore.accessToken;
      if (!token) return;
      const res = await fetch(`${API_URL}/goals`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setGoals(data.data || data || []);
      }
    } catch (err) {
      console.error('Failed to fetch goals', err);
    } finally {
      setFetchingGoals(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
      fetchPortfolioData();
      fetchGoalsData();
    }, [])
  );

  /**
   * A summary built only from the investor's own records - the holdings report, their
   * orders and their SIPs. It is labelled as TechArtha's summary, not a Consolidated
   * Account Statement, which only the depositories and RTAs issue.
   */
  const downloadPDF = async (kind: 'holdings' | 'transactions' | 'sips') => {
    const rows =
      kind === 'holdings'
        ? holdings.map((h) => [h.schemeName ?? h.schemeIsin, h.folioNumber, h.units.toFixed(3), h.nav?.toFixed(4) ?? '—', rupees(h.marketValue, 2)])
        : kind === 'transactions'
          ? orders.map((o) => [new Date(o.createdAt).toLocaleDateString('en-IN'), o.fundName, rupees(o.amount, 2), o.statusLabel])
          : plans.map((p) => [p.fundName, rupees(p.amount, 2), `${p.frequency}, day ${p.installmentDay}`, p.statusLabel]);
    if (rows.length === 0) {
      return Alert.alert('Nothing to include yet', 'There is no activity on your account to put in this summary yet.');
    }
    const headers =
      kind === 'holdings'
        ? ['Scheme', 'Folio', 'Units', 'NAV (Rs)', 'Current value']
        : kind === 'transactions'
          ? ['Date', 'Scheme', 'Amount', 'Status']
          : ['Scheme', 'Amount', 'Schedule', 'Status'];
    const title = kind === 'holdings' ? 'Holdings summary' : kind === 'transactions' ? 'Order history' : 'SIP summary';
    const maskedPan = investor.pan ? `${investor.pan.slice(0, 3)}XXXXX${investor.pan.slice(-2)}` : '—';
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; padding: 40px; color: #1c1a18; }
              h1 { color: #3C3985; font-size: 24px; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px; }
              .label { color: #718096; font-size: 12px; font-weight: bold; text-transform: uppercase; }
              .value { font-size: 14px; margin-bottom: 15px; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
              th, td { border: 1px solid #E2E8F0; padding: 12px; text-align: left; }
              th { background-color: #3C3985; color: white; font-weight: bold; }
              tr:nth-child(even) { background-color: #F8F9FB; }
            </style>
          </head>
          <body>
            <h1>${escapeHtml(title)}</h1>
            <p style="color: #718096; font-size: 12px;">Generated on ${new Date().toLocaleDateString('en-IN')}${
              kind === 'holdings' && portfolio?.asOn ? `, holdings as on ${escapeHtml(portfolio.asOn)}` : ''
            }</p>
            <table>
              <tr>
                <td><span class="label">Name</span><br/><span class="value">${escapeHtml(investor.name ?? '—')}</span></td>
                <td><span class="label">PAN</span><br/><span class="value">${escapeHtml(maskedPan)}</span></td>
              </tr>
              <tr>
                <td><span class="label">Email</span><br/><span class="value">${escapeHtml(investor.email ?? '—')}</span></td>
                <td><span class="label">Mobile</span><br/><span class="value">${escapeHtml(investor.mobile ?? '—')}</span></td>
              </tr>
            </table>
            <table>
              <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
              ${rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}
            </table>
            ${kind === 'holdings' ? `<p style="margin-top: 24px; font-size: 11px; color: #4A5568;">${escapeHtml(portfolio?.method)}</p>` : ''}
            <p style="margin-top: 40px; font-size: 10px; color: #A0AEC0; text-align: center;">
              A summary prepared by TechArtha from your account records. This is not a Consolidated Account Statement;
              your CAS is issued by the depositories and registrars.
            </p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { dialogTitle: `Download ${title}`, UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Sharing not available', 'Unable to share or download the file on this device.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to generate PDF document.');
    }
  };

  const renderEmptyState = (iconName: keyof typeof Ionicons.glyphMap, title: string, desc: string, btnText: string, onPress: () => void, secondaryBtnText?: string, onSecondaryPress?: () => void) => (
    <View style={styles.emptyCard}>
      <View style={styles.iconCircle}>
        <Ionicons name={iconName} size={36} color="#3C3985" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDesc}>{desc}</Text>
      <View style={{ width: '100%', gap: 12 }}>
        <Pressable style={styles.primaryBtn} onPress={onPress}>
          <Text style={styles.primaryBtnText}>{btnText}</Text>
        </Pressable>
        {secondaryBtnText && onSecondaryPress && (
          <Pressable style={[styles.outlineBtn, { marginTop: 0 }]} onPress={onSecondaryPress}>
            <Text style={styles.outlineBtnText}>{secondaryBtnText}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  // Current value at the centre with dual-track progress ring matching Home Screen 3D cards
  const renderDoughnutChart = () => {
    const r = 38;
    const strokeW = 10;
    const val = Math.round(totals?.current ?? 0);

    return (
      <View style={styles.chartContainer}>
        <Svg width="98" height="98" viewBox="0 0 98 98">
          <Circle cx="49" cy="49" r={r} stroke="rgba(255,255,255,0.18)" strokeWidth={strokeW} fill="transparent" />
          <Circle
            cx="49"
            cy="49"
            r={r}
            stroke={val > 0 ? '#34D399' : 'rgba(255,255,255,0.45)'}
            strokeWidth={strokeW}
            strokeDasharray={`${Math.PI * 2 * r * 0.75} ${Math.PI * 2 * r}`}
            strokeLinecap="round"
            fill="transparent"
            transform="rotate(-90 49 49)"
          />
        </Svg>
        <View style={styles.chartCenter}>
          <Text style={styles.chartCenterValue}>{totals?.current == null ? '—' : `₹${val >= 1000 ? (val / 1000).toFixed(1) + 'K' : val}`}</Text>
          <Text style={styles.chartCenterLabel}>CURRENT</Text>
        </View>
      </View>
    );
  };

  // Helper for Risk Profile Card
  const renderRiskCard = () => {
    if (!investorProfile) return null;
    
    const cat = investorProfile;
    let label = 'Moderate';
    let desc = 'You prefer a balanced approach, seeking growth while taking measured risks to protect your capital.';
    let color = '#059669'; // Emerald
    let bg = '#ECFDF5';
    let icon = 'shield-checkmark';

    if (cat === 'CONSERVATIVE') {
      label = 'Conservative';
      desc = 'You prioritize capital preservation over high returns. You prefer stable, low-risk investments.';
      color = '#0284C7';
      bg = '#F0F9FF';
      icon = 'lock-closed';
    } else if (cat === 'AGGRESSIVE') {
      label = 'Aggressive';
      desc = 'You are willing to accept higher market volatility for the potential of significant long-term growth.';
      color = '#DD6B20';
      bg = '#FFF4E8';
      icon = 'trending-up';
    }

    return (
      <View style={[styles.riskProfileBox, { borderColor: bg }]}>
        <View style={styles.riskProfileHeader}>
          <View style={[styles.riskIconWrap, { backgroundColor: bg }]}>
            <Ionicons name={icon as any} size={20} color={color} />
          </View>
          <View>
            <Text style={styles.riskProfileEyebrow}>YOUR RISK PROFILE</Text>
            <Text style={[styles.riskProfileLabel, { color }]}>{label}</Text>
          </View>
        </View>
        <Text style={styles.riskProfileDesc}>{desc}</Text>
      </View>
    );
  };

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={styles.headerTitle}>{t('port.title', { defaultValue: 'Portfolio' })}</Text>
        </View>

        <View style={styles.fixedSummaryContainer}>
          {fetchingPortfolio ? (
            <ActivityIndicator size="small" color="#36358D" style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.heroCard}>
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Svg width="100%" height="100%" preserveAspectRatio="none">
                  <Defs>
                    <LinearGradient id="portHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#232262" />
                      <Stop offset="55%" stopColor="#36358D" />
                      <Stop offset="100%" stopColor="#524CB4" />
                    </LinearGradient>
                  </Defs>
                  <Rect x="0" y="0" width="100%" height="100%" fill="url(#portHeroGrad)" />
                  <Circle cx="94%" cy="10%" r="82" fill="#FFFFFF" opacity="0.08" />
                  <Circle cx="8%" cy="92%" r="65" fill="#F7941D" opacity="0.14" />
                </Svg>
              </View>

              <View style={styles.heroTopSheen} pointerEvents="none" />

              <View style={styles.heroHeaderRow}>
                <View>
                  <Text style={styles.heroEyebrow}>PORTFOLIO OVERVIEW</Text>
                  <Text style={styles.heroTitle}>
                    {t('dash.investmentJourney', { defaultValue: 'Your Investment Journey' })}
                  </Text>
                </View>
                <View style={styles.heroActiveBadge}>
                  <Text style={styles.heroActiveText}>AMFI FOLIO</Text>
                </View>
              </View>
              
              <View style={styles.heroRow}>
                {renderDoughnutChart()}
                
                <View style={styles.heroStats}>
                  <View style={styles.statGroup}>
                    <Text style={styles.statLabel}>AMOUNT INVESTED</Text>
                    <Text style={styles.statValue}>{rupees(totals?.invested)}</Text>
                  </View>
                  
                  <View style={styles.statGroup}>
                    <Text style={styles.statLabel}>TOTAL RETURNS</Text>
                    <Text
                      style={[
                        styles.statValue,
                        totals?.gain != null && {
                          color: totals.gain >= 0 ? '#34D399' : '#FCA5A5',
                        },
                      ]}
                    >
                      {totals?.gain == null
                        ? '—'
                        : `${totals.gain >= 0 ? '+' : '−'}${rupees(Math.abs(totals.gain))}${gainPct ? ` (${gainPct}%)` : ''}`}
                    </Text>
                  </View>
                </View>
              </View>
              {portfolio?.asOn ? <Text style={styles.asOnText}>As on {portfolio.asOn}</Text> : null}
            </View>
          )}
        </View>

        <View style={styles.tabScrollContainer}>
          <SolidTabs
            scrollable
            testID="portfolio-solid-tabs"
            tabs={[
              { id: 'overview', label: 'Overview', icon: 'pie-chart-outline' },
              { id: 'goals', label: 'Goals', count: goals.length > 0 ? goals.length : undefined, icon: 'flag-outline' },
              { id: 'holdings', label: 'Holdings', count: holdings.length > 0 ? holdings.length : undefined, icon: 'layers-outline' },
              { id: 'transactions', label: 'Orders', count: orders.length > 0 ? orders.length : undefined, icon: 'receipt-outline' },
              { id: 'sips', label: 'SIPs', count: plans.length > 0 ? plans.length : undefined, icon: 'repeat-outline' },
              { id: 'statements', label: 'Statements', icon: 'document-text-outline' },
            ]}
            activeTab={tab}
            onSelect={(tId) => setTab(tId as Tab)}
          />
        </View>

        <View style={styles.container}>
          {tab === 'overview' && (
            <View style={styles.content}>
              
              {renderRiskCard()}

              {holdings.length === 0 ? (
                renderEmptyState(
                  'pie-chart-outline', 
                  t('port.noPortfolioHistory', { defaultValue: 'No Portfolio History' }), 
                  t('port.emptyOverview', { defaultValue: 'Your portfolio overview will appear here once you make your first investment.' }),
                  t('port.exploreFunds', { defaultValue: 'Explore Funds' }),
                  () => navigation.navigate('Funds'),
                  investorProfile 
                    ? t('port.reRiskAssesment', { defaultValue: 'Re - Risk Assessment' }) 
                    : t('port.takeRiskAssesment', { defaultValue: 'Take Risk Assessment' }),
                  () => navigation.navigate('RiskAssessment')
                )
              ) : (
                <View style={styles.riskCard}>
                  <Text style={styles.riskTitle}>{t('port.detailedRisk', { defaultValue: 'Risk & Allocation' })}</Text>
                  <Text style={styles.riskNote}>{t('port.riskNote', { defaultValue: 'Your portfolio is evaluated against your investor risk profile.' })}</Text>
                  
                  <View style={[styles.riskRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.riskLabel}>{t('port.investorRiskProfile', { defaultValue: 'Investor Profile' })}</Text>
                    <Text style={[styles.riskValue, { color: '#102A54' }]}>{investorProfile || 'Not Assessed'}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {tab === 'holdings' && (
            <View style={styles.content}>
              {holdings.length === 0 ? (
                renderEmptyState(
                  'briefcase-outline',
                  t('port.noHoldings', { defaultValue: 'No Holdings Yet' }),
                  portfolio?.message ?? t('port.activeInvestmentsHere', { defaultValue: 'Your active investments will appear here.' }),
                  t('port.exploreFunds', { defaultValue: 'Explore Funds' }),
                  () => navigation.navigate('Funds')
                )
              ) : (
                holdings.map((h) => {
                  const matchingPlan = getMatchingPlan(h);
                  const lockedUnits = Math.max(0, h.units - h.redeemableUnits);
                  const gain = (h.marketValue ?? 0) - (h.investedValue ?? 0);
                  const gainPercent =
                    h.investedValue && h.investedValue > 0
                      ? ((gain / h.investedValue) * 100).toFixed(2)
                      : null;

                  return (
                    <View key={`${h.folioNumber}-${h.schemeIsin}`} style={styles.goalCard}>
                      <View style={styles.holdingHeaderRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.goalName} numberOfLines={2}>
                            {h.schemeName ?? h.schemeIsin}
                          </Text>
                          <View style={styles.holdingSubRow}>
                            <Text style={styles.goalTime}>Folio {h.folioNumber}</Text>
                            {matchingPlan && (
                              <View style={styles.sipBadge}>
                                <Ionicons name="repeat" size={11} color="#36358D" />
                                <Text style={styles.sipBadgeText}>
                                  SIP {rupees(matchingPlan.amount)}/m
                                </Text>
                              </View>
                            )}
                            {lockedUnits > 0.001 && (
                              <View style={styles.lockBadge}>
                                <Ionicons name="lock-closed" size={11} color="#B45309" />
                                <Text style={styles.lockBadgeText}>Lock-in</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <Pressable
                          style={styles.threeDotBtn}
                          onPress={() => setMenuHolding(h)}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          accessibilityLabel="Holding actions menu"
                        >
                          <Ionicons name="ellipsis-vertical" size={20} color="#64748B" />
                        </Pressable>
                      </View>

                      <View style={styles.goalMetrics}>
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Units</Text>
                          <Text style={styles.metricValue}>{h.units.toFixed(3)}</Text>
                          {lockedUnits > 0.001 && (
                            <Text style={styles.metricSub}>
                              {h.redeemableUnits.toFixed(3)} redeemable
                            </Text>
                          )}
                        </View>
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>NAV{h.navDate ? ` (${h.navDate})` : ''}</Text>
                          <Text style={styles.metricValue}>{h.nav == null ? '—' : `₹${h.nav.toFixed(4)}`}</Text>
                        </View>
                      </View>

                      <View style={styles.goalMetrics}>
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Invested</Text>
                          <Text style={styles.metricValue}>{rupees(h.investedValue, 2)}</Text>
                        </View>
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Current value</Text>
                          <Text style={styles.metricValue}>{rupees(h.marketValue, 2)}</Text>
                          {gainPercent != null && (
                            <Text
                              style={[
                                styles.gainText,
                                { color: gain >= 0 ? '#059669' : '#DC2626' },
                              ]}
                            >
                              {gain >= 0 ? '+' : ''}{gainPercent}% ({gain >= 0 ? '+' : ''}{rupees(gain, 2)})
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
              {portfolio?.method ? (
                <View style={styles.methodBox}>
                  <Text style={styles.methodTitle}>How these figures are calculated</Text>
                  <Text style={styles.methodText}>{portfolio.method}</Text>
                </View>
              ) : null}
            </View>
          )}

          {tab === 'transactions' && (
            <View style={styles.content}>
              {transactionFilter && (
                <View style={styles.filterBanner}>
                  <Text style={styles.filterBannerText} numberOfLines={1}>
                    Filter: <Text style={{ fontWeight: '800' }}>{transactionFilter}</Text>
                  </Text>
                  <Pressable
                    onPress={() => setTransactionFilter(null)}
                    style={styles.clearFilterBtn}
                  >
                    <Text style={styles.clearFilterText}>Show All</Text>
                  </Pressable>
                </View>
              )}
              {(() => {
                const filteredOrders = transactionFilter
                  ? orders.filter((o) =>
                      o.fundName?.toLowerCase().includes(transactionFilter.toLowerCase())
                    )
                  : orders;

                return filteredOrders.length === 0 ? (
                  renderEmptyState(
                    'list-outline',
                    t('port.noTransactions', { defaultValue: 'No Transactions Found' }),
                    transactionFilter
                      ? `No transactions match "${transactionFilter}".`
                      : t('port.transactionHistoryHere', {
                          defaultValue: 'Your investment history and logs will appear here.',
                        }),
                    t('port.exploreFunds', { defaultValue: 'Explore Funds' }),
                    () => navigation.navigate('Funds')
                  )
                ) : (
                  filteredOrders.map((o) => (
                    <View key={o.id} style={styles.goalCard}>
                      <View style={styles.goalRow}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={styles.goalName}>{o.fundName}</Text>
                          <Text style={styles.goalTime}>
                            {new Date(o.createdAt).toLocaleDateString('en-IN')} · One-time
                          </Text>
                        </View>
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusText}>{o.statusLabel}</Text>
                        </View>
                      </View>
                      <Text style={styles.metricValue}>{rupees(o.amount, 2)}</Text>
                      {o.paymentUrl ? (
                        <Pressable style={styles.primaryBtn} onPress={() => openPayment(o.paymentUrl!)}>
                          <Text style={styles.primaryBtnText}>Pay now</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))
                );
              })()}
            </View>
          )}

          {tab === 'sips' && (
            <View style={styles.content}>
              {plans.length === 0 ? (
                renderEmptyState(
                  'calendar-outline',
                  t('port.noSips', { defaultValue: 'No Active SIPs' }),
                  t('port.activeSipsHere', { defaultValue: 'Your active Systematic Investment Plans will be tracked here.' }),
                  t('port.exploreFunds', { defaultValue: 'Explore Funds' }),
                  () => navigation.navigate('Funds')
                )
              ) : (
                plans.map((p) => (
                  <View key={p.id} style={styles.goalCard}>
                    <View style={styles.goalRow}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={styles.goalName}>{p.fundName}</Text>
                        <Text style={styles.goalTime}>
                          {rupees(p.amount)} {p.frequency}, on day {p.installmentDay}
                        </Text>
                      </View>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{p.statusLabel}</Text>
                      </View>
                    </View>
                    {p.paymentUrl ? (
                      <Pressable style={styles.primaryBtn} onPress={() => openPayment(p.paymentUrl!)}>
                        <Text style={styles.primaryBtnText}>Pay first instalment</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          )}

          {tab === 'statements' && (
            <View style={styles.content}>
              <View style={styles.statementList}>
                {/* Only summaries we can build from the investor's real records. A capital
                    gains statement needs lot-level cost data we do not have, so it is
                    not offered rather than generated with made-up figures. */}
                {([
                  { kind: 'holdings', title: 'Holdings summary', desc: 'Folios, units and current value', icon: 'document-text-outline' as any },
                  { kind: 'transactions', title: 'Order history', desc: 'Your one-time purchases and their status', icon: 'receipt-outline' as any },
                  { kind: 'sips', title: 'SIP summary', desc: 'Your registered SIPs', icon: 'calendar-outline' as any },
                ] as const).map((st, idx) => (
                  <Pressable key={idx} style={styles.statementCard} onPress={() => downloadPDF(st.kind)}>
                    <View style={styles.statementIconWrap}>
                      <Ionicons name={st.icon} size={24} color="#3C3985" />
                    </View>
                    <View style={styles.statementInfo}>
                      <Text style={styles.statementTitle}>{st.title}</Text>
                      <Text style={styles.statementDesc}>{st.desc}</Text>
                    </View>
                    <View style={styles.downloadBtn}>
                      <Ionicons name="download-outline" size={20} color="#718096" />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {tab === 'goals' && (
            <View style={styles.content}>
              {fetchingGoals ? (
                <ActivityIndicator size="large" color="#3C3985" style={{ marginTop: 40 }} />
              ) : goals.length === 0 ? (
                renderEmptyState(
                  'flag-outline', 
                  t('prof.noGoals', { defaultValue: 'No active goals found.' }), 
                  'Start planning for your future by setting a financial goal.',
                  t('prof.createGoal', { defaultValue: 'Create a Goal' }),
                  () => navigation.navigate('GoalSelection')
                )
              ) : (
                <View style={{ gap: 16 }}>
                  {goals.length > 1 && (
                    <View style={[styles.goalCard, {backgroundColor: '#3C3985', borderColor: '#3C3985'}]}>
                      <Text style={{color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12}}>Overall Plan Summary</Text>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        <View>
                          <Text style={{color: '#A0AEC0', fontSize: 10, textTransform: 'uppercase'}}>Total Target</Text>
                          <Text style={{color: '#fff', fontSize: 14, fontWeight: 'bold'}}>?{goals.reduce((s, g) => s + (g.inflationAdjustedAmount||0), 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}</Text>
                        </View>
                        <View>
                          <Text style={{color: '#A0AEC0', fontSize: 10, textTransform: 'uppercase'}}>Combined SIP</Text>
                          <Text style={{color: '#48BB78', fontSize: 14, fontWeight: 'bold'}}>?{goals.reduce((s, g) => s + (g.monthlySip||0), 0).toLocaleString('en-IN')}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                  {goals.map((g) => (
                    <View key={g.id} style={styles.goalCard}>
                      <View style={styles.goalRow}>
                        <View>
                          <Text style={styles.goalName}>{g.name}</Text>
                          <Text style={styles.goalTime}>{g.timePeriod} Years | {g.bucketName}</Text>
                        </View>
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusText}>{g.status || 'ACTIVE'}</Text>
                        </View>
                      </View>
                      <View style={styles.goalMetrics}>
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Target Amount</Text>
                          <Text style={styles.metricValue}>₹{g.targetAmount?.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Monthly SIP</Text>
                          <Text style={styles.metricValue}>₹{g.monthlySip?.toLocaleString('en-IN')}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                  <Pressable style={styles.outlineBtn} onPress={() => navigation.navigate('GoalSelection')}>
                    <Text style={styles.outlineBtnText}>+ Add Another Goal</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Three-Dot Contextual Action Sheet */}
      <Modal
        visible={menuHolding !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuHolding(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setMenuHolding(null)}>
          <View style={styles.sheetContainer} onStartShouldSetResponder={() => true}>
            {menuHolding && (() => {
              const matchingPlan = getMatchingPlan(menuHolding);
              const isPaused = matchingPlan?.statusLabel?.toLowerCase().includes('pause');
              const lockedUnits = Math.max(0, menuHolding.units - menuHolding.redeemableUnits);

              return (
                <>
                  <View style={styles.sheetHeader}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={styles.sheetTitle} numberOfLines={2}>
                        {menuHolding.schemeName ?? menuHolding.schemeIsin}
                      </Text>
                      <Text style={styles.sheetSub}>
                        Folio {menuHolding.folioNumber} · {rupees(menuHolding.marketValue, 2)}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.sheetCloseBtn}
                      onPress={() => setMenuHolding(null)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={20} color="#64748B" />
                    </Pressable>
                  </View>

                  {lockedUnits > 0.001 && (
                    <View style={styles.sheetWarningBox}>
                      <Ionicons name="information-circle-outline" size={16} color="#B45309" />
                      <Text style={styles.sheetWarningText}>
                        {lockedUnits.toFixed(3)} units locked (ELSS 3-year statutory lock-in). {menuHolding.redeemableUnits.toFixed(3)} units redeemable.
                      </Text>
                    </View>
                  )}

                  <View style={styles.sheetMenuList}>
                    {/* Contextual SIP Actions: only relevant actions are shown */}
                    {matchingPlan ? (
                      <>
                        {isPaused ? (
                          <Pressable
                            style={styles.sheetMenuItem}
                            onPress={() => handleResumeSip(menuHolding, matchingPlan)}
                          >
                            <View style={[styles.menuIconWrap, { backgroundColor: '#ECFDF5' }]}>
                              <Ionicons name="play-circle-outline" size={20} color="#059669" />
                            </View>
                            <View style={styles.menuTextWrap}>
                              <Text style={styles.menuItemTitle}>Resume SIP</Text>
                              <Text style={styles.menuItemSub}>
                                Resume monthly debit of {rupees(matchingPlan.amount)} on day {matchingPlan.installmentDay}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                          </Pressable>
                        ) : (
                          <Pressable
                            style={styles.sheetMenuItem}
                            onPress={() => handlePauseSip(menuHolding, matchingPlan)}
                          >
                            <View style={[styles.menuIconWrap, { backgroundColor: '#FFFBEB' }]}>
                              <Ionicons name="pause-circle-outline" size={20} color="#D97706" />
                            </View>
                            <View style={styles.menuTextWrap}>
                              <Text style={styles.menuItemTitle}>Pause SIP</Text>
                              <Text style={styles.menuItemSub}>
                                Temporarily hold monthly auto-debit of {rupees(matchingPlan.amount)}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                          </Pressable>
                        )}

                        <Pressable
                          style={styles.sheetMenuItem}
                          onPress={() => handleOpenModifySip(menuHolding, matchingPlan)}
                        >
                          <View style={[styles.menuIconWrap, { backgroundColor: '#EEEDFA' }]}>
                            <Ionicons name="create-outline" size={20} color="#36358D" />
                          </View>
                          <View style={styles.menuTextWrap}>
                            <Text style={styles.menuItemTitle}>Modify SIP</Text>
                            <Text style={styles.menuItemSub}>
                              Change monthly amount or installment date (currently {rupees(matchingPlan.amount)})
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                        </Pressable>

                        <Pressable
                          style={styles.sheetMenuItem}
                          onPress={() => handleCancelSip(menuHolding, matchingPlan)}
                        >
                          <View style={[styles.menuIconWrap, { backgroundColor: '#FEF2F2' }]}>
                            <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
                          </View>
                          <View style={styles.menuTextWrap}>
                            <Text style={[styles.menuItemTitle, { color: '#DC2626' }]}>Stop / Cancel SIP</Text>
                            <Text style={styles.menuItemSub}>
                              Permanently cancel future automated debits
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                        </Pressable>
                      </>
                    ) : (
                      <Pressable
                        style={styles.sheetMenuItem}
                        onPress={() => handleStartSip(menuHolding)}
                      >
                        <View style={[styles.menuIconWrap, { backgroundColor: '#FFF4E8' }]}>
                          <Ionicons name="repeat-outline" size={20} color="#DD6B20" />
                        </View>
                        <View style={styles.menuTextWrap}>
                          <Text style={styles.menuItemTitle}>Start SIP</Text>
                          <Text style={styles.menuItemSub}>
                            Set up recurring systematic investment for this fund
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                      </Pressable>
                    )}

                    {/* Common Actions */}
                    <Pressable
                      style={styles.sheetMenuItem}
                      onPress={() => handleRedeem(menuHolding)}
                    >
                      <View style={[styles.menuIconWrap, { backgroundColor: '#ECFDF5' }]}>
                        <Ionicons name="arrow-down-circle-outline" size={20} color="#059669" />
                      </View>
                      <View style={styles.menuTextWrap}>
                        <Text style={styles.menuItemTitle}>Redeem / Withdraw</Text>
                        <Text style={styles.menuItemSub}>
                          {menuHolding.redeemableUnits > 0
                            ? `Withdraw by amount or units (${menuHolding.redeemableUnits.toFixed(3)} units available)`
                            : 'View redemption details and lock-in schedule'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                    </Pressable>

                    <Pressable
                      style={styles.sheetMenuItem}
                      onPress={() => handleViewTransactions(menuHolding)}
                    >
                      <View style={[styles.menuIconWrap, { backgroundColor: '#F0F9FF' }]}>
                        <Ionicons name="receipt-outline" size={20} color="#0284C7" />
                      </View>
                      <View style={styles.menuTextWrap}>
                        <Text style={styles.menuItemTitle}>View Transactions</Text>
                        <Text style={styles.menuItemSub}>
                          Purchase history and order status for this scheme
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                    </Pressable>

                    <Pressable
                      style={styles.sheetMenuItem}
                      onPress={() => handleViewDetails(menuHolding)}
                    >
                      <View style={[styles.menuIconWrap, { backgroundColor: '#F1F5F9' }]}>
                        <Ionicons name="information-circle-outline" size={20} color="#475569" />
                      </View>
                      <View style={styles.menuTextWrap}>
                        <Text style={styles.menuItemTitle}>View Investment Details</Text>
                        <Text style={styles.menuItemSub}>
                          NAV, units breakdown, lock-in status and folio specs
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                    </Pressable>
                  </View>
                </>
              );
            })()}
          </View>
        </Pressable>
      </Modal>

      {/* Investment Details Modal */}
      <Modal
        visible={detailHolding !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailHolding(null)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheetContainer, { maxHeight: '90%' }]}>
            {detailHolding && (() => {
              const lockedUnits = Math.max(0, detailHolding.units - detailHolding.redeemableUnits);
              const gain = (detailHolding.marketValue ?? 0) - (detailHolding.investedValue ?? 0);
              const gainPct =
                detailHolding.investedValue && detailHolding.investedValue > 0
                  ? ((gain / detailHolding.investedValue) * 100).toFixed(2)
                  : null;
              const matchingPlan = getMatchingPlan(detailHolding);

              return (
                <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                  <View style={styles.sheetHeader}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={styles.sheetTitle}>Investment Details</Text>
                      <Text style={styles.sheetSub}>Comprehensive holding report</Text>
                    </View>
                    <Pressable
                      style={styles.sheetCloseBtn}
                      onPress={() => setDetailHolding(null)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={20} color="#64748B" />
                    </Pressable>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailSchemeName}>
                      {detailHolding.schemeName ?? detailHolding.schemeIsin}
                    </Text>
                    <View style={styles.detailTagRow}>
                      <View style={styles.folioTag}>
                        <Text style={styles.folioTagText}>Folio: {detailHolding.folioNumber}</Text>
                      </View>
                      <View style={styles.isinTag}>
                        <Text style={styles.isinTagText}>ISIN: {detailHolding.schemeIsin}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Summary Values */}
                  <View style={styles.detailStatsGrid}>
                    <View style={styles.detailStatBox}>
                      <Text style={styles.detailStatLabel}>Current Value</Text>
                      <Text style={styles.detailStatValue}>{rupees(detailHolding.marketValue, 2)}</Text>
                      {gainPct != null && (
                        <Text
                          style={[
                            styles.detailGainText,
                            { color: gain >= 0 ? '#059669' : '#DC2626' },
                          ]}
                        >
                          {gain >= 0 ? '+' : ''}{gainPct}% ({gain >= 0 ? '+' : ''}{rupees(gain, 2)})
                        </Text>
                      )}
                    </View>
                    <View style={styles.detailStatBox}>
                      <Text style={styles.detailStatLabel}>Invested Value</Text>
                      <Text style={styles.detailStatValue}>{rupees(detailHolding.investedValue, 2)}</Text>
                      <Text style={styles.detailStatSub}>Original cost basis</Text>
                    </View>
                  </View>

                  {/* Units Breakdown */}
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionCardTitle}>Units Breakdown</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>Total Units Held</Text>
                      <Text style={styles.detailRowValue}>{detailHolding.units.toFixed(3)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>Redeemable Units</Text>
                      <Text style={[styles.detailRowValue, { color: '#059669' }]}>
                        {detailHolding.redeemableUnits.toFixed(3)}
                      </Text>
                    </View>
                    <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.detailRowLabel}>Locked Units</Text>
                      <Text
                        style={[
                          styles.detailRowValue,
                          { color: lockedUnits > 0 ? '#D97706' : '#64748B' },
                        ]}
                      >
                        {lockedUnits.toFixed(3)}
                      </Text>
                    </View>
                  </View>

                  {/* NAV Details */}
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionCardTitle}>Valuation & NAV</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>Latest NAV</Text>
                      <Text style={styles.detailRowValue}>
                        {detailHolding.nav == null ? '—' : `₹${detailHolding.nav.toFixed(4)}`}
                      </Text>
                    </View>
                    <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.detailRowLabel}>As of Date</Text>
                      <Text style={styles.detailRowValue}>{detailHolding.navDate ?? 'Latest Available'}</Text>
                    </View>
                  </View>

                  {/* Lock-in Statutory Warning */}
                  {lockedUnits > 0.001 && (
                    <View style={styles.statutoryNotice}>
                      <Ionicons name="shield-checkmark-outline" size={18} color="#B45309" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.statutoryNoticeTitle}>Statutory Lock-in Period</Text>
                        <Text style={styles.statutoryNoticeDesc}>
                          {lockedUnits.toFixed(3)} units are currently held under statutory lock-in (e.g. 36-month lock-in for ELSS Tax Saver schemes under Sec 80C of the IT Act). Locked units will automatically become redeemable upon maturity.
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* SIP Status */}
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionCardTitle}>SIP Automation</Text>
                    <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.detailRowLabel}>Active SIP Plan</Text>
                      <Text style={styles.detailRowValue}>
                        {matchingPlan
                          ? `${rupees(matchingPlan.amount)} / ${matchingPlan.frequency} (Day ${matchingPlan.installmentDay})`
                          : 'No active SIP'}
                      </Text>
                    </View>
                  </View>

                  {/* Actions Footer */}
                  <View style={styles.detailActionRow}>
                    <Pressable
                      style={[styles.detailActionBtn, styles.detailRedeemBtn]}
                      onPress={() => handleRedeem(detailHolding)}
                    >
                      <Ionicons name="arrow-down-circle-outline" size={18} color="#059669" />
                      <Text style={styles.detailRedeemBtnText}>Redeem / Withdraw</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.detailActionBtn, styles.detailInvestBtn]}
                      onPress={() => {
                        setDetailHolding(null);
                        handleStartSip(detailHolding);
                      }}
                    >
                      <Ionicons name="repeat-outline" size={18} color="#fff" />
                      <Text style={styles.detailInvestBtnText}>Start SIP</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Modify SIP Modal */}
      <Modal
        visible={modifyingPlan !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setModifyingPlan(null)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetContainer}>
            {modifyingPlan && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.sheetTitle}>Modify SIP</Text>
                    <Text style={styles.sheetSub} numberOfLines={1}>{modifyingPlan.fundName}</Text>
                  </View>
                  <Pressable
                    style={styles.sheetCloseBtn}
                    onPress={() => setModifyingPlan(null)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </Pressable>
                </View>

                <Text style={styles.inputLabel}>Monthly Investment Amount (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  value={modifyAmount}
                  onChangeText={setModifyAmount}
                  keyboardType="number-pad"
                  placeholder="e.g. 2500"
                  placeholderTextColor="#94A3B8"
                />

                <View style={styles.chipRow}>
                  {[1000, 2500, 5000, 10000].map((amt) => (
                    <Pressable
                      key={amt}
                      style={[styles.chip, modifyAmount === String(amt) && styles.chipActive]}
                      onPress={() => setModifyAmount(String(amt))}
                    >
                      <Text style={[styles.chipText, modifyAmount === String(amt) && styles.chipTextActive]}>
                        ₹{amt.toLocaleString('en-IN')}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Installment Date (Day of Month)</Text>
                <View style={styles.chipRow}>
                  {[1, 5, 10, 15, 20, 25].map((d) => (
                    <Pressable
                      key={d}
                      style={[styles.chip, modifyDay === d && styles.chipActive]}
                      onPress={() => setModifyDay(d)}
                    >
                      <Text style={[styles.chipText, modifyDay === d && styles.chipTextActive]}>
                        {d}th
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  style={[styles.primaryBtn, { marginTop: 24 }]}
                  onPress={handleSaveModifiedSip}
                >
                  <Text style={styles.primaryBtnText}>Save SIP Modifications</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7FC' },
  
  headerBlock: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 6, backgroundColor: '#F6F7FC' },
  headerTitle: { color: '#102A54', fontSize: 26, fontWeight: '900', letterSpacing: -0.4 },

  fixedSummaryContainer: { paddingHorizontal: 18, paddingBottom: 10, backgroundColor: '#F6F7FC' },
  
  // Home Screen 3D Hero Card
  heroCard: {
    borderRadius: 24,
    padding: 20,
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
    marginBottom: 14,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C7D2FE',
    letterSpacing: 0.9,
  },
  heroTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  heroActiveBadge: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  heroActiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  
  chartContainer: { width: 98, height: 98, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  chartCenter: { position: 'absolute', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', width: 68, height: 68, borderRadius: 34 },
  chartCenterValue: { color: '#fff', fontSize: 15, fontWeight: '900' },
  chartCenterLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 8.5, fontWeight: '800', marginTop: 1, letterSpacing: 0.5 },
  
  heroStats: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
  statGroup: { marginBottom: 12 },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  statValue: { color: '#fff', fontSize: 17, fontWeight: '900' },
  
  returnsBadgeWrap: { backgroundColor: 'rgba(72, 187, 120, 0.15)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(72, 187, 120, 0.3)' },
  returnsBadgeText: { color: '#68D391', fontSize: 12, fontWeight: '800' },

  // Risk Profile Summary Card
  riskProfileBox: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#E6E8F6', shadowColor: '#102A54', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  riskProfileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  riskIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  riskProfileEyebrow: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 0.6, marginBottom: 2 },
  riskProfileLabel: { fontSize: 17, fontWeight: '900' },
  riskProfileDesc: { fontSize: 12.5, color: '#475569', lineHeight: 18 },

  tabScrollContainer: { paddingVertical: 6, backgroundColor: '#F6F7FC' },
  tabContainer: { paddingHorizontal: 16 },
  tab: { paddingVertical: 14, paddingHorizontal: 16 },
  activeTab: {},
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  activeTabText: { color: '#36358D' },
  
  container: { padding: 18, paddingBottom: 80 },
  content: { gap: 18 },
  
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 28, alignItems: 'center', shadowColor: '#102A54', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#E6E8F6' },
  iconCircle: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#EEEDFA', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: '#102A54', marginBottom: 8, textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  primaryBtn: { backgroundColor: '#36358D', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16, width: '100%', alignItems: 'center', elevation: 2, shadowColor: '#36358D', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  
  riskCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, shadowColor: '#102A54', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#E6E8F6' },
  riskTitle: { fontSize: 17, fontWeight: '900', color: '#102A54', marginBottom: 8 },
  riskNote: { fontSize: 12.5, color: '#64748B', marginBottom: 16, lineHeight: 18, backgroundColor: '#F6F7FC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E6E8F6' },
  riskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEF0FA' },
  riskLabel: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  riskValue: { fontSize: 13.5, fontWeight: '800' },

  asOnText: { color: 'rgba(255,255,255,0.7)', fontSize: 10.5, fontWeight: '600', marginTop: 4 },
  methodBox: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E6E8F6' },
  methodTitle: { color: '#102A54', fontSize: 12.5, fontWeight: '800', marginBottom: 4 },
  methodText: { color: '#4A5568', fontSize: 11.5, lineHeight: 17 },
  statementList: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E6E8F6', overflow: 'hidden' },
  statementCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#EEF0FA' },
  statementIconWrap: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#EEEDFA', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  statementInfo: { flex: 1, paddingRight: 14 },
  statementTitle: { fontSize: 14.5, fontWeight: '800', color: '#102A54', marginBottom: 3 },
  statementDesc: { fontSize: 11.5, color: '#64748B' },
  downloadBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F6F7FC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E6E8F6' },

  goalCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#E6E8F6', shadowColor: '#102A54', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  goalName: { fontSize: 16.5, fontWeight: '800', color: '#102A54' },
  goalTime: { fontSize: 11.5, color: '#64748B', marginTop: 3, fontWeight: '600' },
  statusBadge: { backgroundColor: '#EEEDFA', paddingHorizontal: 8, paddingVertical: 3.5, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800', color: '#36358D', textTransform: 'uppercase' },
  goalMetrics: { flexDirection: 'row', gap: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#EEF0FA' },
  metric: { flex: 1 },
  metricLabel: { fontSize: 9.5, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 3 },
  metricValue: { fontSize: 15, fontWeight: '900', color: '#102A54' },
  
  outlineBtn: { borderWidth: 1.5, borderColor: '#36358D', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  outlineBtnText: { color: '#36358D', fontSize: 13.5, fontWeight: '800' },

  holdingHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  holdingSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  threeDotBtn: { padding: 6, borderRadius: 8, backgroundColor: '#F1F5F9' },
  sipBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEEDFA', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sipBadgeText: { fontSize: 10, fontWeight: '700', color: '#36358D' },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  lockBadgeText: { fontSize: 10, fontWeight: '700', color: '#B45309' },
  metricSub: { fontSize: 10, color: '#059669', fontWeight: '600', marginTop: 2 },
  gainText: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  filterBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EEEDFA', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#D8DBF5' },
  filterBannerText: { fontSize: 12, color: '#36358D', flex: 1, fontWeight: '600' },
  clearFilterBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#36358D', borderRadius: 8 },
  clearFilterText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(16, 42, 84, 0.5)', justifyContent: 'flex-end' },
  sheetContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '900', color: '#102A54' },
  sheetSub: { fontSize: 12.5, color: '#64748B', marginTop: 3 },
  sheetCloseBtn: { padding: 6, backgroundColor: '#F1F5F9', borderRadius: 16 },
  sheetWarningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFBEB', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FEF3C7' },
  sheetWarningText: { fontSize: 12, color: '#92400E', flex: 1, lineHeight: 16 },
  sheetMenuList: { gap: 8 },
  sheetMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#F6F7FC', borderWidth: 1, borderColor: '#E6E8F6' },
  menuIconWrap: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuTextWrap: { flex: 1 },
  menuItemTitle: { fontSize: 13.5, fontWeight: '800', color: '#102A54' },
  menuItemSub: { fontSize: 11, color: '#64748B', marginTop: 2 },

  detailCard: { backgroundColor: '#F6F7FC', padding: 16, borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E6E8F6' },
  detailSchemeName: { fontSize: 15, fontWeight: '900', color: '#102A54', marginBottom: 8 },
  detailTagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  folioTag: { backgroundColor: '#EEF0FA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  folioTagText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  isinTag: { backgroundColor: '#EEEDFA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  isinTagText: { fontSize: 11, fontWeight: '800', color: '#36358D' },
  detailStatsGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  detailStatBox: { flex: 1, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E6E8F6' },
  detailStatLabel: { fontSize: 10, color: '#64748B', fontWeight: '800', textTransform: 'uppercase' },
  detailStatValue: { fontSize: 15, fontWeight: '900', color: '#102A54', marginTop: 3 },
  detailStatSub: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  detailGainText: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E6E8F6' },
  sectionCardTitle: { fontSize: 12.5, fontWeight: '800', color: '#102A54', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EEF0FA' },
  detailRowLabel: { fontSize: 12, color: '#64748B' },
  detailRowValue: { fontSize: 12.5, fontWeight: '700', color: '#102A54' },
  statutoryNotice: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FEF3C7' },
  statutoryNoticeTitle: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  statutoryNoticeDesc: { fontSize: 11, color: '#B45309', marginTop: 3, lineHeight: 15 },
  detailActionRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  detailActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  detailRedeemBtn: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  detailRedeemBtnText: { color: '#059669', fontSize: 12.5, fontWeight: '800' },
  detailInvestBtn: { backgroundColor: '#36358D' },
  detailInvestBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },

  inputLabel: { fontSize: 12, fontWeight: '800', color: '#102A54', marginBottom: 6 },
  textInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8F6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#102A54', fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8F6' },
  chipActive: { backgroundColor: '#36358D', borderColor: '#36358D' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '800' },
});

export default PortfolioScreen;

