import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { exitOnboarding } from '../utils/navigation';
import { authStore } from '../store/auth';
import { Header } from '../components/Header';
import { SearchIcon } from '../components/Icons';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../services/api/client';

const DEFAULT_BUCKETS = [
  {
    id: 'stable',
    name: 'Stable foundation',
    bucketRiskLevel: 'Conservative',
    recommended: false,
    horizon: '1–3 years',
    allocation: { equity: 20, debt: 55, liquid: 25 },
    explanation: 'Designed to prioritise stability and access with predominantly debt and liquid mutual funds.',
    investsIn: {
      fundName: 'ICICI Prudential Retirement Fund Hybrid Conservative Plan',
      schemeIsin: 'INF109KC1TY0',
    },
    recommendedFunds: [
      { schemeCode: '146716', name: 'ICICI Pru Retirement Fund Hybrid Conservative Plan', category: 'Conservative Hybrid', nav: null },
      { schemeCode: '118987', name: 'HDFC Corporate Bond Fund - Direct Plan - Growth', category: 'Corporate Bond', nav: null },
      { schemeCode: '119551', name: 'Aditya Birla Sun Life Liquid Fund - Direct - Growth', category: 'Liquid Fund', nav: null },
      { schemeCode: '119934', name: 'Kotak Bond Short Term Fund - Direct Plan - Growth', category: 'Short Duration Debt', nav: null },
    ],
  },
  {
    id: 'balanced',
    name: 'Balanced growth',
    bucketRiskLevel: 'Moderate',
    recommended: true,
    horizon: '3–7 years',
    allocation: { equity: 55, debt: 35, liquid: 10 },
    explanation: 'Balances long-term growth potential with stabilising debt assets for medium-to-long horizons.',
    investsIn: {
      fundName: "ICICI Prudential Children's Fund",
      schemeIsin: 'INF109K01605',
    },
    recommendedFunds: [
      { schemeCode: '120579', name: "ICICI Prudential Children's Fund - Direct Plan", category: 'Solution Oriented', nav: null },
      { schemeCode: '118968', name: 'HDFC Balanced Advantage Fund - Direct Plan - Growth', category: 'Dynamic Asset Allocation', nav: null },
      { schemeCode: '119718', name: 'SBI Equity Hybrid Fund - Direct Plan - Growth', category: 'Aggressive Hybrid', nav: null },
      { schemeCode: '120166', name: 'Kotak Flexicap Fund - Direct Plan - Growth', category: 'Flexi Cap Fund', nav: null },
    ],
  },
  {
    id: 'growth',
    name: 'Long-term growth',
    bucketRiskLevel: 'Aggressive',
    recommended: false,
    horizon: '7+ years',
    allocation: { equity: 75, debt: 20, liquid: 5 },
    explanation: 'Built for a long horizon and the ability to accept larger temporary fluctuations for higher equity growth.',
    investsIn: {
      fundName: 'ICICI Prudential Nifty50 Value 20 Index Fund',
      schemeIsin: 'INF109KC19T7',
    },
    recommendedFunds: [
      { schemeCode: '152365', name: 'ICICI Prudential Nifty50 Value 20 Index Fund - Direct', category: 'Index Fund', nav: null },
      { schemeCode: '122639', name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth', category: 'Flexi Cap Fund', nav: null },
      { schemeCode: '118989', name: 'HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth', category: 'Mid Cap Fund', nav: null },
      { schemeCode: '125354', name: 'Axis Small Cap Fund - Direct Plan - Growth', category: 'Small Cap Fund', nav: null },
    ],
  },
];


const fetchLiveNavForFunds = async (bucketList: any[]): Promise<any[]> => {
  try {
    const updated = await Promise.all(
      bucketList.map(async (bucket) => {
        if (!Array.isArray(bucket.recommendedFunds)) return bucket;
        const fundsWithNav = await Promise.all(
          bucket.recommendedFunds.map(async (fund: any) => {
            if (fund.nav && fund.nav !== '0.00' && fund.nav !== '--.--') return fund;
            try {
              const res = await fetch(`https://api.mfapi.in/mf/${fund.schemeCode}/latest`);
              if (res.ok) {
                const d = await res.json();
                if (d?.data?.[0]?.nav) {
                  return { ...fund, nav: d.data[0].nav, navDate: d.data[0].date };
                }
              }
            } catch {
              // fallback
            }
            return fund;
          })
        );
        return { ...bucket, recommendedFunds: fundsWithNav };
      })
    );
    return updated;
  } catch {
    return bucketList;
  }
};

export const InvestmentBucketsScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [buckets, setBuckets] = useState<any[]>(DEFAULT_BUCKETS);
  const [loading, setLoading] = useState(false);
  const [investorProfile, setInvestorProfile] = useState<string | null>(
    route.params?.category || 'MODERATE'
  );
  const [expandedBucket, setExpandedBucket] = useState<string | null>('balanced');

  useEffect(() => {
    fetchBuckets();
  }, [route.params?.category]);

  const fetchBuckets = async () => {
    try {
      const token = authStore.accessToken;
      const res = await fetch(`${API_URL}/buckets`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (data?.investorProfile && data.investorProfile !== 'ASSESSMENT_REQUIRED') {
          setInvestorProfile(data.investorProfile);
        }
        if (Array.isArray(data?.buckets) && data.buckets.length > 0) {
          // Ensure every bucket has recommendedFunds populated
          const merged = data.buckets.map((b: any) => {
            const fallback = DEFAULT_BUCKETS.find((d) => d.id === b.id);
            return {
              ...fallback,
              ...b,
              investsIn: b.investsIn || fallback?.investsIn || null,
              recommendedFunds:
                Array.isArray(b.recommendedFunds) && b.recommendedFunds.length > 0
                  ? b.recommendedFunds
                  : fallback?.recommendedFunds || [],
            };
          });
          setBuckets(merged);
          fetchLiveNavForFunds(merged).then((live) => setBuckets(live));
          const rec = merged.find((x: any) => x.recommended);
          if (rec) setExpandedBucket(rec.id);
          return;
        }
      }
    } catch {
      // Keep curated DEFAULT_BUCKETS active
    } finally {
      setLoading(false);
    }

    // Apply risk profile highlighting on DEFAULT_BUCKETS if route param was passed
    const cat = String(route.params?.category || investorProfile || 'MODERATE').toUpperCase();
    const updated = DEFAULT_BUCKETS.map((b) => {
      const isRec =
        ((cat === 'CONSERVATIVE' || cat === 'MODERATELY_LOW') && b.id === 'stable') ||
        (cat === 'MODERATE' && b.id === 'balanced') ||
        ((cat === 'AGGRESSIVE' || cat === 'MODERATELY_HIGH') && b.id === 'growth');
      return { ...b, recommended: isRec };
    });
    setBuckets(updated);
    fetchLiveNavForFunds(updated).then((live) => setBuckets(live));
    const rec = updated.find((x) => x.recommended) || updated[1];
    if (rec) setExpandedBucket(rec.id);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Header title="" />
      <View style={styles.topSection}>
        <Text style={styles.headerTitle}>{t('buckets.title', { defaultValue: 'Choose your Bucket' })}</Text>
        <Text style={styles.subtitle}>
          {t('buckets.subtitle', {
            defaultValue: 'Buckets are curated investment mixes suited to your risk profile and goal.',
          })}
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ marginBottom: 20 }}>
          <Pressable
            onPress={() => navigation.navigate('Funds')}
            style={styles.searchBar}
          >
            <View style={{ marginRight: 10 }}>
              <SearchIcon />
            </View>
            <Text style={styles.searchPlaceholder} numberOfLines={1}>
              {t('buckets.searchPlaceholder', { defaultValue: 'Search for specific mutual funds...' })}
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3C3985" style={{ marginTop: 40 }} />
        ) : (
          buckets.map((bucket) => {
            const isExpanded = expandedBucket === bucket.id;
            const alloc = bucket.allocation || { equity: 50, debt: 40, liquid: 10 };
            return (
              <Pressable
                key={bucket.id}
                style={[
                  styles.card,
                  bucket.recommended && styles.cardSelected,
                  isExpanded && { borderColor: '#3C3985' },
                ]}
                onPress={() => setExpandedBucket(isExpanded ? null : bucket.id)}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.name}>
                      {t(`buckets.${bucket.id}.name`, { defaultValue: bucket.name })}
                    </Text>
                    {bucket.bucketRiskLevel && (
                      <View style={styles.riskTag}>
                        <Text style={styles.riskTagText}>
                          {t(`buckets.${bucket.id}.risk`, { defaultValue: bucket.bucketRiskLevel })}
                        </Text>
                      </View>
                    )}
                  </View>
                  {bucket.recommended && (
                    <View style={styles.recBadge}>
                      <Text style={styles.recText}>Profile Match</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.desc}>
                  {t(`buckets.${bucket.id}.desc`, { defaultValue: bucket.explanation })}
                </Text>

                {/* Asset Allocation Mix */}
                <View style={styles.metaRow}>
                  <View style={styles.metaBox}>
                    <Text style={styles.metaLabel}>
                      {t('buckets.horizon', { defaultValue: 'Horizon' })}
                    </Text>
                    <Text style={styles.metaValue}>{bucket.horizon || '3–5 years'}</Text>
                  </View>
                  <View style={[styles.metaBox, { flex: 1.4 }]}>
                    <Text style={styles.metaLabel}>Asset Mix</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>
                      Eq {alloc.equity}% • Debt {alloc.debt}% • Liq {alloc.liquid}%
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    marginTop: 4,
                    marginBottom: isExpanded ? 16 : 0,
                    padding: 12,
                    backgroundColor: '#F8F9FB',
                    borderRadius: 12,
                  }}
                >
                  {bucket.investsIn ? (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.fundSectionLabel}>Your investment goes into</Text>
                      <Text style={styles.primaryFundName}>{bucket.investsIn.fundName}</Text>
                    </View>
                  ) : null}

                  <Text style={[styles.fundSectionLabel, { marginBottom: 8 }]}>
                    Curated funds in this bucket ({(bucket.recommendedFunds || []).length})
                  </Text>
                  {(bucket.recommendedFunds || []).map((f: any, i: number) => (
                    <Pressable
                      key={f.schemeCode || i}
                      onPress={() => {
                        if (f.schemeCode) {
                          navigation.navigate('FundDetail', { schemeCode: String(f.schemeCode) });
                        }
                      }}
                      style={[
                        styles.fundRow,
                        i === (bucket.recommendedFunds || []).length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.fundNameText} numberOfLines={1}>
                          {f.name}
                        </Text>
                        <Text style={styles.fundCategoryText}>{f.category}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.fundNavText}>
                          {f.nav ? `₹${parseFloat(f.nav).toFixed(2)}` : 'View'}
                        </Text>
                        <Text style={{ fontSize: 9, color: '#64748B', fontWeight: '600' }}>NAV</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>

                {isExpanded && (
                  <View style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                      <Pressable
                        style={styles.outlineBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          const recFunds = bucket.recommendedFunds || [];
                          const count = recFunds.length || 1;
                          const basePct = Math.floor(100 / count);
                          const funds = recFunds.map((f: any, idx: number) => ({
                            id: f.schemeCode,
                            schemeCode: f.schemeCode,
                            name: f.name,
                            category: f.category,
                            percentage:
                              idx === count - 1 ? 100 - basePct * (count - 1) : basePct,
                            allocation:
                              idx === count - 1 ? 100 - basePct * (count - 1) : basePct,
                          }));
                          navigation.navigate('CustomBucket', { funds });
                        }}
                      >
                        <Text style={styles.outlineBtnTxt}>
                          {t('buckets.customize', { defaultValue: 'Customize' })}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.primaryBtnFlex}
                        onPress={(e) => {
                          e.stopPropagation();
                          navigation.navigate('PlanSummary', {
                            bucket: bucket.id,
                            bucketName: bucket.name,
                            goal: route.params?.goal,
                            targetAmount: route.params?.targetAmount,
                            timePeriod: route.params?.timePeriod,
                            inflationRate: route.params?.inflationRate,
                            customAdjustments: route.params?.customAdjustments,
                          });
                        }}
                      >
                        <Text style={styles.primaryBtnTxt}>
                          {t('buckets.select', { defaultValue: 'Select Plan' })}
                        </Text>
                      </Pressable>
                    </View>

                    <Pressable
                      style={styles.darkBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        navigation.navigate('Invest', {
                          bucketId: bucket.id,
                          bucketName: bucket.name,
                        });
                      }}
                    >
                      <Text style={styles.primaryBtnTxt}>
                        {t('buckets.investNow', { defaultValue: 'Invest now' })}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            );
          })
        )}

        <Pressable style={styles.laterButton} onPress={() => exitOnboarding(navigation)}>
          <Text style={styles.laterText}>
            {t('buckets.decideLater', { defaultValue: 'Decide later - take me to my dashboard' })}
          </Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          {t('buckets.disclaimer', {
            defaultValue: 'Mutual Fund investments are subject to market risks.',
          })}
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  topSection: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { color: '#102A54', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: '#4A5568', fontSize: 13.5, lineHeight: 19 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchPlaceholder: { flex: 1, fontSize: 14, fontWeight: '700', color: '#9CA3AF' },
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  cardSelected: { borderColor: '#3C3985', backgroundColor: '#FDFDFF' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: { fontSize: 18, fontWeight: '800', color: '#102A54' },
  riskTag: {
    backgroundColor: '#EDF2F7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  riskTagText: { fontSize: 10, fontWeight: '800', color: '#4A5568' },
  recBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  recText: { color: '#EA580C', fontSize: 11, fontWeight: '800' },
  desc: { color: '#4A5568', fontSize: 13.5, lineHeight: 19, marginBottom: 14 },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metaBox: { flex: 1, backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8 },
  metaLabel: {
    fontSize: 10,
    color: '#718096',
    marginBottom: 3,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  metaValue: { fontSize: 13, fontWeight: '800', color: '#3C3985' },
  fundSectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  primaryFundName: { fontSize: 13.5, fontWeight: '800', color: '#102A54' },
  fundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  fundNameText: { fontSize: 13, fontWeight: '700', color: '#102A54', marginBottom: 2 },
  fundCategoryText: { fontSize: 11, color: '#64748B' },
  fundNavText: { fontSize: 13, fontWeight: '800', color: '#3C3985' },
  outlineBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#3C3985',
    alignItems: 'center',
  },
  outlineBtnTxt: { color: '#3C3985', fontWeight: '700', fontSize: 14 },
  primaryBtnFlex: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#3C3985',
    alignItems: 'center',
  },
  primaryBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  darkBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#102A54',
    alignItems: 'center',
  },
  laterButton: { paddingVertical: 14, alignItems: 'center' },
  laterText: { color: '#4A5568', fontSize: 13.5, fontWeight: '700' },
  disclaimer: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
});
