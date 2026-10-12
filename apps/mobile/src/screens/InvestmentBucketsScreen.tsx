import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../components/Header';
import { SearchIcon } from '../components/Icons';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api/client';
import { authStore } from '../store/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const DEFAULT_BUCKETS = [
  {
    id: 'stable',
    name: 'Stable Income Bucket',
    bucketRiskLevel: 'Conservative',
    explanation: 'Conservative mix of liquid and short-term debt funds. Best for capital safety.',
    recommended: false,
    horizon: '1-3 yrs',
    allocation: { equity: 15, debt: 85, liquid: 0 },
    recommendedFunds: [
      { schemeCode: 146716, name: 'ICICI Pru Retirement Fund Hybrid', category: 'Conservative Hybrid', nav: '...' },
      { schemeCode: 101933, name: 'SBI Magnum Gilt Fund', category: 'Gilt Fund', nav: '...' },
      { schemeCode: 118987, name: 'HDFC Corporate Bond Fund', category: 'Corporate Bond', nav: '...' },
    ],
  },
  {
    id: 'balanced',
    name: 'Balanced Growth Bucket',
    bucketRiskLevel: 'Moderate',
    explanation: 'Perfect balance of equity for growth and debt for stability.',
    recommended: true,
    horizon: '3-7 yrs',
    allocation: { equity: 60, debt: 40, liquid: 0 },
    recommendedFunds: [
      { schemeCode: 120579, name: "ICICI Prudential Children's Fund", category: 'Solution Oriented', nav: '...' },
      { schemeCode: 100119, name: 'HDFC Balanced Advantage Fund', category: 'Dynamic Asset Allocation', nav: '...' },
      { schemeCode: 118968, name: 'HDFC Balanced Advantage Direct', category: 'Dynamic Asset Allocation', nav: '...' },
    ],
  },
  {
    id: 'high',
    name: 'High Growth Bucket',
    bucketRiskLevel: 'Aggressive',
    explanation: 'High equity exposure for maximum long-term wealth creation.',
    recommended: false,
    horizon: '7+ yrs',
    allocation: { equity: 85, debt: 15, liquid: 0 },
    recommendedFunds: [
      { schemeCode: 152365, name: 'ICICI Pru Nifty50 Value 20 Index', category: 'Index Fund', nav: '...' },
      { schemeCode: 122639, name: 'Parag Parikh Flexi Cap Fund', category: 'Flexi Cap Fund', nav: '...' },
      { schemeCode: 125354, name: 'Axis Small Cap Fund', category: 'Small Cap Fund', nav: '...' },
    ],
  },
];

export const InvestmentBucketsScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [buckets, setBuckets] = useState<any[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [investModal, setInvestModal] = useState(false);
  const [investingBucket, setInvestingBucket] = useState<string | null>(null);
  const [investForm, setInvestForm] = useState({
    amount: '150000',
    gender: 'male',
    email: 'investor@techartha.com',
    bankAccountHolderName: 'TechArtha User',
    bankAccountNumber: '1234567890',
    ifscCode: 'HDFC0001234',
    addressLine1: 'MG Road',
    postalCode: '400001',
  });
  const [investing, setInvesting] = useState(false);
  const [investSuccess, setInvestSuccess] = useState<any>(null);

  const loadBuckets = useCallback(async () => {
    try {
      const response = await api.get<any>('/buckets').catch(async () => {
        const token = authStore.accessToken;
        const res = await fetch(`${API_URL}/buckets`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        return res.ok ? await res.json() : null;
      });

      const list = Array.isArray(response)
        ? response
        : response?.buckets?.length
        ? response.buckets
        : DEFAULT_BUCKETS;

      setBuckets(list);
      const rec = list.find((b: any) => b.recommended) || list[0];
      if (rec) setSelectedBucket(rec.id);
    } catch {
      setBuckets(DEFAULT_BUCKETS);
      setSelectedBucket('balanced');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBuckets();
  }, [loadBuckets]);

  const handleInvest = async () => {
    setInvesting(true);
    try {
      const token = authStore.accessToken;
      const res = await fetch(`${API_URL}/buckets/${investingBucket}/invest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: Number(investForm.amount),
          gender: investForm.gender,
          email: investForm.email,
          bankAccountHolderName: investForm.bankAccountHolderName,
          bankAccountNumber: investForm.bankAccountNumber,
          ifscCode: investForm.ifscCode,
          addressLine1: investForm.addressLine1,
          postalCode: investForm.postalCode,
        }),
      });
      if (res.ok) {
        setInvestSuccess(await res.json());
      } else {
        Alert.alert('Error', 'Failed to place investment order.');
      }
    } catch {
      Alert.alert('Error', 'Network error.');
    } finally {
      setInvesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="" />
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={styles.headerTitle}>{t('buckets.title', { defaultValue: 'Choose your Bucket' })}</Text>
        <Text style={styles.subtitle}>
          {t('buckets.subtitle', { defaultValue: 'Buckets are curated investment mixes suited to your risk profile and goal.' })}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: 16 }}>
          <Pressable
            onPress={() => navigation.navigate('Funds')}
            style={styles.searchBar}
          >
            <View style={{ marginRight: 10 }}><SearchIcon /></View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#9CA3AF' }}>
              {t('buckets.searchPlaceholder', { defaultValue: 'Search for specific mutual funds...' })}
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3C3985" style={{ marginTop: 40 }} />
        ) : (
          buckets.map((bucket) => {
            const isSelected = selectedBucket === bucket.id;
            return (
              <Pressable
                key={bucket.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelectedBucket(isSelected ? null : bucket.id)}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{t(`buckets.${bucket.id}.name`, { defaultValue: bucket.name })}</Text>
                    {bucket.bucketRiskLevel ? (
                      <View style={styles.riskBadge}>
                        <Text style={styles.riskBadgeText}>
                          {t(`buckets.${bucket.id}.risk`, { defaultValue: bucket.bucketRiskLevel }).toUpperCase()}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {bucket.recommended ? (
                    <View style={styles.recBadge}>
                      <Text style={styles.recText}>⭐ Recommended</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.desc}>
                  {t(`buckets.${bucket.id}.desc`, { defaultValue: bucket.explanation })}
                </Text>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>EQUITY</Text>
                    <Text style={styles.statValue}>{bucket.allocation?.equity ?? 0}%</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>DEBT</Text>
                    <Text style={styles.statValue}>{bucket.allocation?.debt ?? 0}%</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>HORIZON</Text>
                    <Text style={styles.statValue}>{bucket.horizon || '3-5 yrs'}</Text>
                  </View>
                </View>

                {bucket.recommendedFunds?.length ? (
                  <View style={styles.fundsWrapper}>
                    <Text style={styles.fundsLabel}>
                      {t('buckets.fundsInBucket', { defaultValue: 'FUNDS IN THIS BUCKET' })}
                    </Text>
                    {bucket.recommendedFunds.map((f: any, i: number) => (
                      <View key={f.schemeCode || i} style={styles.fundRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.fundName} numberOfLines={1}>{f.name || `Scheme ${f.schemeCode}`}</Text>
                          {f.category ? <Text style={styles.fundCategory}>{f.category}</Text> : null}
                        </View>
                        <Text style={styles.fundNav}>
                          {f.nav ? `₹${parseFloat(f.nav).toFixed(2)}` : (f.latestNav ? `₹${parseFloat(f.latestNav).toFixed(2)}` : '—')}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {isSelected && (
                  <View style={{ marginTop: 16 }}>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                      <Pressable
                        style={styles.outlineBtn}
                        onPress={() => {
                          const recFunds = bucket.recommendedFunds || [];
                          const count = recFunds.length || 1;
                          const basePct = Math.floor(100 / count);
                          const mapped = recFunds.map((f: any, idx: number) => ({
                            schemeCode: f.schemeCode,
                            name: f.name,
                            category: f.category,
                            allocation: idx === count - 1 ? 100 - basePct * (count - 1) : basePct,
                          }));
                          navigation.navigate('CustomBucket', { funds: mapped });
                        }}
                      >
                        <Text style={styles.outlineBtnTxt}>{t('buckets.customize', { defaultValue: 'Customize' })}</Text>
                      </Pressable>

                      <Pressable
                        style={styles.primaryBtnFlex}
                        onPress={() =>
                          navigation.navigate('PlanSummary', {
                            bucket: bucket.id,
                            bucketName: bucket.name,
                            goal: route.params?.goal,
                            targetAmount: route.params?.targetAmount,
                            timePeriod: route.params?.timePeriod,
                            inflationRate: route.params?.inflationRate,
                            customAdjustments: route.params?.customAdjustments,
                          })
                        }
                      >
                        <Text style={styles.primaryBtnTxt}>{t('buckets.select', { defaultValue: 'Select Bucket' })}</Text>
                      </Pressable>
                    </View>

                    <Pressable
                      style={styles.investBtn}
                      onPress={() => {
                        setInvestingBucket(bucket.id);
                        setInvestSuccess(null);
                        setInvestModal(true);
                      }}
                    >
                      <Text style={styles.primaryBtnTxt}>{t('buckets.investNow', { defaultValue: 'Invest Now (Start SIP)' })}</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            );
          })
        )}

        <Pressable
          style={styles.buildCustomBar}
          onPress={() => navigation.navigate('CustomBucket')}
        >
          <Text style={styles.buildCustomText}>+ Build Custom Bucket</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          {t('buckets.disclaimer', {
            defaultValue: 'Mutual fund investments are subject to market risks. Read all scheme related documents carefully.',
          })}
        </Text>
      </ScrollView>

      {/* Invest Modal */}
      <Modal visible={investModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {investSuccess ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>✅</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#102A54', marginBottom: 8, textAlign: 'center' }}>
                  {t('buckets.orderPlaced', { defaultValue: 'Order Placed!' })}
                </Text>
                <Text style={{ fontSize: 14, color: '#4A5568', textAlign: 'center', marginBottom: 20 }}>
                  Your investment order of ₹{investSuccess.amount} has been initiated successfully.
                </Text>
                <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, marginBottom: 20, width: '100%' }}>
                  <Text style={{ color: '#92400E', fontWeight: '700', textAlign: 'center', fontSize: 12 }}>
                    {investSuccess.statusLabel}: {investSuccess.message}
                  </Text>
                </View>
                <Pressable
                  style={styles.darkBtn}
                  onPress={() => {
                    setInvestModal(false);
                    navigation.navigate('MainTabs');
                  }}
                >
                  <Text style={styles.primaryBtnTxt}>{t('buckets.goToDash', { defaultValue: 'Go to Dashboard' })}</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#102A54', marginBottom: 16 }}>
                  {t('buckets.completeInvest', { defaultValue: 'Complete Investment' })}
                </Text>
                <Text style={styles.inputLabel}>{t('buckets.investAmt', { defaultValue: 'Investment Amount (₹)' })}</Text>
                <TextInput
                  style={styles.input}
                  value={investForm.amount}
                  onChangeText={(v) => setInvestForm({ ...investForm, amount: v })}
                  keyboardType="numeric"
                />
                <Text style={styles.inputLabel}>{t('buckets.bankHolder', { defaultValue: 'Bank Account Holder' })}</Text>
                <TextInput
                  style={styles.input}
                  value={investForm.bankAccountHolderName}
                  onChangeText={(v) => setInvestForm({ ...investForm, bankAccountHolderName: v })}
                />
                <Text style={styles.inputLabel}>{t('buckets.bankNumber', { defaultValue: 'Bank Account Number' })}</Text>
                <TextInput
                  style={styles.input}
                  value={investForm.bankAccountNumber}
                  onChangeText={(v) => setInvestForm({ ...investForm, bankAccountNumber: v })}
                />
                <Text style={styles.inputLabel}>{t('buckets.ifsc', { defaultValue: 'IFSC Code' })}</Text>
                <TextInput
                  style={styles.input}
                  value={investForm.ifscCode}
                  onChangeText={(v) => setInvestForm({ ...investForm, ifscCode: v })}
                />

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <Pressable style={[styles.outlineBtn, { flex: 1 }]} onPress={() => setInvestModal(false)}>
                    <Text style={styles.outlineBtnTxt}>{t('common.cancel', { defaultValue: 'Cancel' })}</Text>
                  </Pressable>
                  <Pressable style={[styles.darkBtn, { flex: 1, marginTop: 0 }]} onPress={handleInvest} disabled={investing}>
                    <Text style={styles.primaryBtnTxt}>
                      {investing ? t('buckets.processing', { defaultValue: 'Processing...' }) : t('buckets.confirmPay', { defaultValue: 'Confirm & Pay' })}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  headerTitle: { color: '#102A54', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#4A5568', fontSize: 13, lineHeight: 18 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  card: { backgroundColor: 'white', padding: 18, borderRadius: 16, marginBottom: 16, borderWidth: 2, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardSelected: { borderColor: '#3C3985', backgroundColor: '#FAF5FF' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: 17, fontWeight: '800', color: '#102A54', marginBottom: 4 },
  riskBadge: { backgroundColor: '#EDF2F7', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 2 },
  riskBadgeText: { fontSize: 10, fontWeight: '800', color: '#4A5568' },
  recBadge: { backgroundColor: '#EBF4FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  recText: { color: '#3182CE', fontSize: 10, fontWeight: '700' },
  desc: { color: '#4A5568', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8 },
  statLabel: { fontSize: 10, color: '#718096', marginBottom: 2, fontWeight: '700' },
  statValue: { fontSize: 13, fontWeight: '800', color: '#3C3985' },
  fundsWrapper: { padding: 12, backgroundColor: '#F8F9FB', borderRadius: 12, marginTop: 4 },
  fundsLabel: { fontSize: 10, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', marginBottom: 6 },
  fundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  fundName: { fontSize: 12, fontWeight: '700', color: '#102A54' },
  fundCategory: { fontSize: 10, color: '#9CA3AF' },
  fundNav: { fontSize: 12, fontWeight: '700', color: '#3C3985' },
  outlineBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#3C3985', alignItems: 'center', justifyContent: 'center' },
  outlineBtnTxt: { color: '#3C3985', fontSize: 14, fontWeight: '700' },
  primaryBtnFlex: { flex: 1, backgroundColor: '#3C3985', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  investBtn: { backgroundColor: '#F7941E', paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primaryBtnTxt: { color: 'white', fontSize: 14, fontWeight: '800' },
  darkBtn: { width: '100%', backgroundColor: '#102A54', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buildCustomBar: { paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: '#3C3985', borderStyle: 'dashed', backgroundColor: '#fff', marginBottom: 16 },
  buildCustomText: { color: '#3C3985', fontWeight: '800', fontSize: 14 },
  disclaimer: { fontSize: 11, color: '#A0AEC0', textAlign: 'center', marginBottom: 30, lineHeight: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#718096', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 14, color: '#102A54' },
});

export default InvestmentBucketsScreen;
