import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { authStore } from '../store/auth';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Header } from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

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

  const [tab, setTab] = useState<Tab>('overview');
  
  const [investorProfile, setInvestorProfile] = useState('');
  const [investor, setInvestor] = useState<{ name?: string; pan?: string; email?: string; mobile?: string }>({});
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [fetchingPortfolio, setFetchingPortfolio] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

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

  // Current value at the centre. A single ring: the allocation across asset classes is
  // not something the holdings report gives us, so no split is drawn.
  const renderDoughnutChart = () => {
    const r = 40;
    const strokeW = 12;
    const val = Math.round(totals?.current ?? 0);

    return (
      <View style={styles.chartContainer}>
        <Svg width="104" height="104" viewBox="0 0 104 104">
          <Circle cx="52" cy="52" r={r} stroke={val > 0 ? '#38B2AC' : '#2D3748'} strokeWidth={strokeW} fill="transparent" />
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
    let color = '#38A169'; // Green
    let bg = '#C6F6D5';
    let icon = 'shield-checkmark';

    if (cat === 'CONSERVATIVE') {
      label = 'Conservative';
      desc = 'You prioritize capital preservation over high returns. You prefer stable, low-risk investments.';
      color = '#38A169'; // Green
      bg = '#C6F6D5';
      icon = 'lock-closed';
    } else if (cat === 'AGGRESSIVE') {
      label = 'Aggressive';
      desc = 'You are willing to accept higher market volatility for the potential of significant long-term growth.';
      color = '#38A169'; // Green
      bg = '#C6F6D5';
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
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      
      <Header title="Portfolio" />
      
      <ScrollView stickyHeaderIndices={[2]} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={styles.headerTitle}>{t('port.title', { defaultValue: 'Portfolio' })}</Text>
        </View>

        <View style={styles.fixedSummaryContainer}>
          {fetchingPortfolio ? (
            <ActivityIndicator size="small" color="#3C3985" style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>{t('dash.investmentJourney', { defaultValue: 'Your Investment Journey' })}</Text>
              
              <View style={styles.heroRow}>
                {renderDoughnutChart()}
                
                <View style={styles.heroStats}>
                  <View style={styles.statGroup}>
                    <Text style={styles.statLabel}>AMOUNT INVESTED</Text>
                    <Text style={styles.statValue}>{rupees(totals?.invested)}</Text>
                  </View>
                  
                  <View style={styles.statGroup}>
                    <Text style={styles.statLabel}>TOTAL RETURNS</Text>
                    <Text style={styles.statValue}>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
            {TABS.map(tOption => (
              <Pressable key={tOption} onPress={() => setTab(tOption)} style={[styles.tab, tab === tOption && styles.activeTab]}>
                <Text style={[styles.tabText, tab === tOption && styles.activeTabText]}>
                  {tOption === 'goals' ? 'Goals' : tOption}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
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
                holdings.map((h) => (
                  <View key={`${h.folioNumber}-${h.schemeIsin}`} style={styles.goalCard}>
                    <Text style={styles.goalName}>{h.schemeName ?? h.schemeIsin}</Text>
                    <Text style={styles.goalTime}>Folio {h.folioNumber}</Text>
                    <View style={styles.goalMetrics}>
                      <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Units</Text>
                        <Text style={styles.metricValue}>{h.units.toFixed(3)}</Text>
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
                      </View>
                    </View>
                  </View>
                ))
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
              {orders.length === 0 ? (
                renderEmptyState(
                  'list-outline',
                  t('port.noTransactions', { defaultValue: 'No Transactions Found' }),
                  t('port.transactionHistoryHere', { defaultValue: 'Your investment history and logs will appear here.' }),
                  t('port.exploreFunds', { defaultValue: 'Explore Funds' }),
                  () => navigation.navigate('Funds')
                )
              ) : (
                orders.map((o) => (
                  <View key={o.id} style={styles.goalCard}>
                    <View style={styles.goalRow}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={styles.goalName}>{o.fundName}</Text>
                        <Text style={styles.goalTime}>{new Date(o.createdAt).toLocaleDateString('en-IN')} · One-time</Text>
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
              )}
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

        {/* Withdrawing has to be reachable from where holdings are shown. The screen
            itself reports honestly when there is nothing to sell, so this does not need
            to be conditional on holdings we may not have loaded. */}
        <Pressable style={styles.outlineBtn} onPress={() => navigation.navigate('Redeem')}>
          <Text style={styles.outlineBtnText}>Withdraw money</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  
  headerBlock: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 10, backgroundColor: '#F8F9FB' },
  headerTitle: { color: '#102A54', fontSize: 28, fontWeight: '800' },

  fixedSummaryContainer: { paddingHorizontal: 24, paddingBottom: 24, backgroundColor: '#F8F9FB' },
  
  // Custom Hero Card based on User Uploaded Image
  heroCard: { backgroundColor: '#3A3F7A', borderRadius: 24, padding: 24, shadowColor: '#3C3985', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  heroTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 24 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  
  chartContainer: { width: 104, height: 104, justifyContent: 'center', alignItems: 'center', marginRight: 24 },
  chartCenter: { position: 'absolute', justifyContent: 'center', alignItems: 'center', backgroundColor: '#2D3261', width: 70, height: 70, borderRadius: 35 },
  chartCenterValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  chartCenterLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  
  heroStats: { flex: 1, justifyContent: 'space-between', paddingVertical: 4 },
  statGroup: { marginBottom: 16 },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  
  returnsBadgeWrap: { backgroundColor: 'rgba(72, 187, 120, 0.15)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(72, 187, 120, 0.3)' },
  returnsBadgeText: { color: '#68D391', fontSize: 12, fontWeight: '800' },

  // Risk Profile Summary Card
  riskProfileBox: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  riskProfileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  riskIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  riskProfileEyebrow: { fontSize: 10, fontWeight: '800', color: '#718096', letterSpacing: 0.5, marginBottom: 2 },
  riskProfileLabel: { fontSize: 18, fontWeight: '900' },
  riskProfileDesc: { fontSize: 13, color: '#4A5568', lineHeight: 20 },

  tabScrollContainer: { borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  tabContainer: { paddingHorizontal: 16 },
  tab: { paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#3C3985' },
  tabText: { fontSize: 14, fontWeight: '700', color: '#A0AEC0', textTransform: 'capitalize' },
  activeTabText: { color: '#3C3985' },
  
  container: { padding: 24, paddingBottom: 80 },
  content: { gap: 24 },
  
  emptyCard: { backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#E2E8F0' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EBEBFA', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#102A54', marginBottom: 12, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: '#718096', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  primaryBtn: { backgroundColor: '#3C3985', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16, width: '100%', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  
  riskCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#E2E8F0' },
  riskTitle: { fontSize: 18, fontWeight: '800', color: '#102A54', marginBottom: 12 },
  riskNote: { fontSize: 13, color: '#718096', marginBottom: 20, lineHeight: 20, backgroundColor: '#F8F9FB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  riskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  riskLabel: { fontSize: 13, fontWeight: '700', color: '#718096' },
  riskValue: { fontSize: 14, fontWeight: '800' },

  asOnText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', marginTop: 4 },
  methodBox: { backgroundColor: '#F8F9FB', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  methodTitle: { color: '#102A54', fontSize: 13, fontWeight: '800', marginBottom: 6 },
  methodText: { color: '#4A5568', fontSize: 12, lineHeight: 18 },
  statementList: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  statementCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  statementIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EBEBFA', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  statementInfo: { flex: 1, paddingRight: 16 },
  statementTitle: { fontSize: 15, fontWeight: '800', color: '#102A54', marginBottom: 4 },
  statementDesc: { fontSize: 12, color: '#718096' },
  downloadBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F7FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },

  goalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  goalName: { fontSize: 18, fontWeight: '800', color: '#102A54' },
  goalTime: { fontSize: 12, color: '#718096', marginTop: 4, fontWeight: '600' },
  statusBadge: { backgroundColor: '#EBEBFA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800', color: '#3C3985', textTransform: 'uppercase' },
  goalMetrics: { flexDirection: 'row', gap: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#EDF2F7' },
  metric: { flex: 1 },
  metricLabel: { fontSize: 10, fontWeight: '700', color: '#A0AEC0', textTransform: 'uppercase', marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: '800', color: '#102A54' },
  
  outlineBtn: { borderWidth: 2, borderColor: '#3C3985', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  outlineBtnText: { color: '#3C3985', fontSize: 14, fontWeight: '800' }
});

