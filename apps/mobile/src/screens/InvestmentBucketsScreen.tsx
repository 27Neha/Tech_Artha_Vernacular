import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { exitOnboarding } from '../utils/navigation';
import { authStore } from '../store/auth';
import { Header } from '../components/Header';
import { SearchIcon } from '../components/Icons';
import { useTranslation } from 'react-i18next';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * GET /buckets - the buckets suited to the investor's assessed risk profile.
 *
 * There is no offline fallback list. One used to stand in whenever the request failed
 * (which, while the token was read from the wrong store, was always), showing buckets
 * the server does not offer and projected returns nobody computed. If the list cannot
 * be loaded the screen says so.
 */
export const InvestmentBucketsScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [investorProfile, setInvestorProfile] = useState<string | null>(null);
  
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchBuckets();
  }, []);

  const fetchBuckets = async () => {
    setLoadError(null);
    try {
      // The session token lives in authStore (backed by SecureStore). AsyncStorage never
      // held it, so reading it from there sent every request unauthenticated.
      const token = authStore.accessToken;
      const res = await fetch(`${API_URL}/buckets`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) {
        setLoadError(res.status === 401 ? 'Please sign in again to see your buckets.' : 'Buckets could not be loaded. Please try again.');
        return;
      }
      const data = await res.json();
      setInvestorProfile(data.investorProfile);
      const b = data.buckets ?? [];
      setBuckets(b);
      if (data.investorProfile === 'ASSESSMENT_REQUIRED') {
        setLoadError('Take the risk assessment first. Buckets are offered according to your risk profile.');
      }
      const rec = b.find((x: any) => x.recommended);
      if (rec) setExpandedBucket(rec.id);
    } catch (e) {
      setLoadError('Buckets could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Header title="" />
      <View style={{ padding: 24, paddingBottom: 20 }}>
        <Text style={styles.headerTitle}>{t('buckets.title', { defaultValue: 'Choose your Bucket' })}</Text>
        <Text style={styles.subtitle}>{t('buckets.subtitle', { defaultValue: 'Buckets are curated investment mixes suited to your risk profile and goal.' })}</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={{ marginBottom: 20 }}>
          <Pressable 
            onPress={() => navigation.navigate('Funds')}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' }}
          >
            <View style={{ marginRight: 10 }}><SearchIcon /></View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#9CA3AF' }}>{t('buckets.searchPlaceholder', { defaultValue: 'Search for specific mutual funds...' })}</Text>
          </Pressable>
        </View>

        {loadError ? (
          <View style={styles.card}>
            <Text style={styles.desc}>{loadError}</Text>
            <Pressable
              style={styles.darkBtn}
              onPress={() => (investorProfile === 'ASSESSMENT_REQUIRED' ? navigation.navigate('RiskAssessment') : fetchBuckets())}
            >
              <Text style={styles.primaryBtnTxt}>{investorProfile === 'ASSESSMENT_REQUIRED' ? 'Take the risk assessment' : 'Try again'}</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator size="large" color="#3C3985" style={{ marginTop: 40 }} />
        ) : buckets.map(bucket => {
          const isExpanded = expandedBucket === bucket.id;
          return (
            <Pressable 
              key={bucket.id} 
              style={[styles.card, bucket.recommended && styles.cardSelected, isExpanded && { borderColor: '#3C3985' }]}
              onPress={() => setExpandedBucket(isExpanded ? null : bucket.id)}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{t(`buckets.${bucket.id}.name`, { defaultValue: bucket.name })}</Text>
                  {bucket.bucketRiskLevel && (
                    <View style={{ backgroundColor: '#EDF2F7', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#4A5568' }}>{t(`buckets.${bucket.id}.risk`, { defaultValue: bucket.bucketRiskLevel })}</Text>
                    </View>
                  )}
                </View>
                {bucket.recommended && <View style={styles.recBadge}><Text style={styles.recText}>⭐ Recommended</Text></View>}
              </View>
              
              <Text style={styles.desc}>{t(`buckets.${bucket.id}.desc`, { defaultValue: bucket.explanation })}</Text>
              
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <View style={{ flex: 1, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, color: '#718096', marginBottom: 4, textTransform: 'uppercase', fontWeight: '600' }}>{t('buckets.horizon', { defaultValue: 'Horizon' })}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#3C3985' }}>{bucket.horizon || 'Flex'}</Text>
                </View>
                <View style={{ flex: 1.2, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, color: '#718096', marginBottom: 4, textTransform: 'uppercase', fontWeight: '600' }}>{t('buckets.risk', { defaultValue: 'Risk' })}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#3C3985' }} numberOfLines={1} adjustsFontSizeToFit>{bucket.bucketRiskLevel ? t(`buckets.${bucket.id}.risk`, { defaultValue: bucket.bucketRiskLevel }) : 'Mixed'}</Text>
                </View>
              </View>
              
              <View style={{ marginTop: 8, marginBottom: isExpanded ? 16 : 0, padding: 12, backgroundColor: '#F8F9FB', borderRadius: 12 }}>
                {bucket.investsIn ? (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }}>Your investment goes into</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#102A54' }}>{bucket.investsIn.fundName}</Text>
                  </View>
                ) : null}
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', marginBottom: 8 }}>Similar funds, for reference only</Text>
                {(bucket.recommendedFunds || []).map((f: any, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i === bucket.recommendedFunds.length - 1 ? 0 : 1, borderBottomColor: '#E5E7EB' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#102A54', marginBottom: 2 }} numberOfLines={1}>{f.name}</Text>
                      <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{f.category}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#3C3985' }}>{f.nav ? `₹${parseFloat(f.nav).toFixed(2)}` : 'N/A'}</Text>
                    </View>
                  </View>
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
                        let funds = recFunds.map((f: any, idx: number) => ({
                          id: f.schemeCode, 
                          name: f.name, 
                          category: f.category, 
                          percentage: (idx === count - 1) ? (100 - (basePct * (count - 1))) : basePct
                        }));
                        navigation.navigate('CustomBucket', { funds });
                      }}
                    >
                      <Text style={styles.outlineBtnTxt}>{t('buckets.customize', { defaultValue: 'Customize' })}</Text>
                    </Pressable>
                    <Pressable 
                      style={styles.primaryBtnFlex}
                      onPress={(e) => {
                        e.stopPropagation();
                        navigation.navigate('PlanSummary', { bucket: bucket.id, goal: route.params?.goal, targetAmount: route.params?.targetAmount, timePeriod: route.params?.timePeriod, inflationRate: route.params?.inflationRate, customAdjustments: route.params?.customAdjustments });
                      }}
                    >
                      <Text style={styles.primaryBtnTxt}>{t('buckets.select', { defaultValue: 'Select' })}</Text>
                    </Pressable>
                  </View>
                  {/* The shared invest screen: one-time or SIP, the investor's own details,
                      and the OTP step. The old inline form here had none of the three. */}
                  <Pressable 
                    style={styles.darkBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      navigation.navigate('Invest', { bucketId: bucket.id, bucketName: bucket.name });
                    }}
                  >
                    <Text style={styles.primaryBtnTxt}>{t('buckets.investNow', { defaultValue: 'Invest now' })}</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          );
        })}
        {/* The last step of the funnel and the one most worth being able to defer:
            choosing a bucket is the decision that costs money. */}
        <Pressable style={styles.laterButton} onPress={() => exitOnboarding(navigation)}>
          <Text style={styles.laterText}>
            {t('buckets.decideLater', { defaultValue: 'Decide later - take me to my profile' })}
          </Text>
        </Pressable>

        <Text style={styles.disclaimer}>{t('buckets.disclaimer', { defaultValue: 'Mutual Fund investments are subject to market risks.' })}</Text>
      </ScrollView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  headerTitle: { color: '#102A54', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#4A5568', fontSize: 14, lineHeight: 20 },
  content: { padding: 20 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 2, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardSelected: { borderColor: '#E2E8F0', backgroundColor: '#EBEAF8' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  name: { fontSize: 18, fontWeight: '700', color: '#102A54', marginBottom: 4 },
  recBadge: { backgroundColor: '#EBF4FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  recText: { color: '#3182CE', fontSize: 10, fontWeight: '700' },
  desc: { color: '#4A5568', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  outlineBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: '#3C3985', alignItems: 'center', justifyContent: 'center' },
  outlineBtnTxt: { color: '#3C3985', fontSize: 15, fontWeight: '800' },
  primaryBtnFlex: { flex: 1, backgroundColor: '#3C3985', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  darkBtn: { width: '100%', backgroundColor: '#102A54', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  primaryBtnTxt: { color: 'white', fontSize: 15, fontWeight: '800' },
  laterButton: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  laterText: { color: '#3C3985', fontSize: 14, fontWeight: '700' },
  disclaimer: { fontSize: 10, color: '#A0AEC0', textAlign: 'center', marginTop: 8, marginBottom: 40 }
});
