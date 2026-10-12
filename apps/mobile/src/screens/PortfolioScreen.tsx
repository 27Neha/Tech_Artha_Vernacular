import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
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

export const PortfolioScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();

  const [tab, setTab] = useState<Tab>('overview');
  
  const [investorProfile, setInvestorProfile] = useState('');
  const [portfolio, setPortfolio] = useState<any>({ totalInvested: 0, currentValue: 0, totalReturns: 0, holdings: [] });
  const [fetchingPortfolio, setFetchingPortfolio] = useState(true);
  
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
      }
    } catch (e) {
      console.error('Failed to fetch profile', e);
    }
  };

  const fetchPortfolioData = async () => {
    try {
      const token = authStore.accessToken;
      if (!token) return;
      const res = await fetch(`${API_URL}/portfolio`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) {
          setPortfolio(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch portfolio', err);
    } finally {
      setFetchingPortfolio(false);
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

  const downloadPDF = async (title: string) => {
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; padding: 40px; color: #1c1a18; }
              h1 { color: #3C3985; font-size: 24px; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px; }
              .header { margin-bottom: 30px; }
              .label { color: #718096; font-size: 12px; font-weight: bold; text-transform: uppercase; }
              .value { font-size: 14px; margin-bottom: 15px; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
              th, td { border: 1px solid #E2E8F0; padding: 12px; text-align: left; }
              th { background-color: #3C3985; color: white; font-weight: bold; }
              tr:nth-child(even) { background-color: #F8F9FB; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <div class="header">
              <p style="font-size: 14px; font-weight: bold;">CONSOLIDATED ACCOUNT STATEMENT (CAS)</p>
              <p style="color: #718096; font-size: 12px;">Date Generated: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <h3 style="margin-top: 30px;">Investor Details</h3>
            <table style="margin-top: 10px;">
              <tr>
                <td><span class="label">Name</span><br/><span class="value">TEST USER</span></td>
                <td><span class="label">PAN</span><br/><span class="value">ABCDE1234F</span></td>
              </tr>
              <tr>
                <td><span class="label">Email</span><br/><span class="value">test@techartha.com</span></td>
                <td><span class="label">Mobile</span><br/><span class="value">+91 9876543210</span></td>
              </tr>
            </table>

            <h3 style="margin-top: 40px;">Portfolio Summary</h3>
            <table>
              <tr>
                <th>Scheme Name</th>
                <th>Folio</th>
                <th>Units</th>
                <th>NAV (Rs)</th>
                <th>Current Value (Rs)</th>
              </tr>
              <tr>
                <td>Stable Income Fund</td>
                <td>10982312</td>
                <td>25.500</td>
                <td>169.41</td>
                <td>4,320.00</td>
              </tr>
              <tr>
                <td>Multi-Cap Growth Fund</td>
                <td>88273611</td>
                <td>15.300</td>
                <td>257.51</td>
                <td>3,940.00</td>
              </tr>
              <tr>
                <td>Liquid Safety Fund</td>
                <td>99128374</td>
                <td>66.210</td>
                <td>32.88</td>
                <td>2,177.00</td>
              </tr>
            </table>
            
            <p style="margin-top: 40px; font-size: 10px; color: #A0AEC0; text-align: center;">This is a system generated document. Powered by TechArtha.</p>
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

  // Helper for Circular Chart Layout
  const renderDoughnutChart = () => {
    const r = 40;
    const strokeW = 12;
    const c = 2 * Math.PI * r;
    const val = Math.round(portfolio.currentValue);
    
    // We'll mimic the green/blue/purple segments from the image
    const greenD = c * 0.45;
    const blueD = c * 0.35;
    const purpleD = c * 0.20;

    return (
      <View style={styles.chartContainer}>
        <Svg width="104" height="104" viewBox="0 0 104 104">
          <Circle cx="52" cy="52" r={r} stroke="#2D3748" strokeWidth={strokeW} fill="transparent" />
          {val > 0 && (
            <>
              <Circle cx="52" cy="52" r={r} stroke="#38B2AC" strokeWidth={strokeW} strokeDasharray={`${greenD} ${c}`} strokeLinecap="round" fill="transparent" rotation="-90" origin="52, 52" />
              <Circle cx="52" cy="52" r={r} stroke="#4299E1" strokeWidth={strokeW} strokeDasharray={`${blueD} ${c}`} strokeDashoffset={-greenD} strokeLinecap="round" fill="transparent" rotation="-90" origin="52, 52" />
              <Circle cx="52" cy="52" r={r} stroke="#9F7AEA" strokeWidth={strokeW} strokeDasharray={`${purpleD} ${c}`} strokeDashoffset={-(greenD + blueD)} strokeLinecap="round" fill="transparent" rotation="-90" origin="52, 52" />
            </>
          )}
        </Svg>
        <View style={styles.chartCenter}>
          <Text style={styles.chartCenterValue}>₹{val >= 1000 ? (val/1000).toFixed(1) + 'K' : val}</Text>
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
                    <Text style={styles.statValue}>₹{Math.round(portfolio.totalInvested).toLocaleString('en-IN')}</Text>
                  </View>
                  
                  <View style={styles.statGroup}>
                    <Text style={styles.statLabel}>TOTAL RETURNS</Text>
                    <Text style={styles.statValue}>
                      +₹{Math.round(portfolio.totalReturns).toLocaleString('en-IN')} (0%)
                    </Text>
                  </View>
                </View>
              </View>
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

              {portfolio.totalInvested === 0 ? (
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
                  
                  <View style={styles.riskRow}>
                    <Text style={styles.riskLabel}>{t('port.investorRiskProfile', { defaultValue: 'Investor Profile' })}</Text>
                    <Text style={[styles.riskValue, { color: '#102A54' }]}>{investorProfile || 'Not Assessed'}</Text>
                  </View>
                  <View style={[styles.riskRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.riskLabel}>{t('port.riskAlignment', { defaultValue: 'Alignment' })}</Text>
                    <Text style={[styles.riskValue, { color: '#38A169' }]}>{t('port.optimal', { defaultValue: 'Optimal' })}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {tab === 'holdings' && (
            <View style={styles.content}>
              {renderEmptyState(
                'briefcase-outline', 
                t('port.noHoldings', { defaultValue: 'No Holdings Yet' }), 
                t('port.activeInvestmentsHere', { defaultValue: 'Your active investments will appear here.' }),
                t('port.exploreFunds', { defaultValue: 'Explore Funds' }),
                () => navigation.navigate('Funds')
              )}
            </View>
          )}

          {tab === 'transactions' && (
            <View style={styles.content}>
              {renderEmptyState(
                'list-outline', 
                t('port.noTransactions', { defaultValue: 'No Transactions Found' }), 
                t('port.transactionHistoryHere', { defaultValue: 'Your investment history and logs will appear here.' }),
                t('port.exploreFunds', { defaultValue: 'Explore Funds' }),
                () => navigation.navigate('Funds')
              )}
            </View>
          )}

          {tab === 'sips' && (
            <View style={styles.content}>
              {renderEmptyState(
                'calendar-outline', 
                t('port.noSips', { defaultValue: 'No Active SIPs' }), 
                t('port.activeSipsHere', { defaultValue: 'Your active Systematic Investment Plans will be tracked here.' }),
                t('port.exploreFunds', { defaultValue: 'Explore Funds' }),
                () => navigation.navigate('Funds')
              )}
            </View>
          )}

          {tab === 'statements' && (
            <View style={styles.content}>
              <View style={styles.statementList}>
                {[
                  { title: 'Account Statement', desc: 'Summary of all folios and holdings', icon: 'document-text-outline' as any },
                  { title: 'Transaction Statement', desc: 'Detailed log of all purchases and redemptions', icon: 'receipt-outline' as any },
                  { title: 'Capital Gains Statement', desc: 'For tax filing purposes (ITR)', icon: 'trending-up-outline' as any },
                  { title: 'SIP Statement', desc: 'Log of all active and completed SIPs', icon: 'calendar-outline' as any }
                ].map((st, idx) => (
                  <Pressable key={idx} style={styles.statementCard} onPress={() => downloadPDF(st.title)}>
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

