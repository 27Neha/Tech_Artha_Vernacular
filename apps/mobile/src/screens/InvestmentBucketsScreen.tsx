import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from '../components/Header';
import { SearchIcon } from '../components/Icons';
import { useTranslation } from 'react-i18next';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const DEFAULT_BUCKETS = [
  {
    id: 'stable',
    name: 'Stable Income Bucket',
    bucketRiskLevel: 'Conservative',
    explanation: 'Conservative mix of liquid and short-term debt funds. Best for capital safety.',
    recommended: false,
    horizon: '1-3 yrs',
    returns: '6-8%',
    recommendedFunds: [
      { schemeCode: '146716', name: 'ICICI Pru Retirement Fund Hybrid', category: 'Conservative Hybrid', nav: '...' },
      { schemeCode: '101933', name: 'SBI Magnum Gilt Fund', category: 'Gilt Fund', nav: '...' },
      { schemeCode: '118987', name: 'HDFC Corporate Bond Fund', category: 'Corporate Bond', nav: '...' }
    ]
  },
  {
    id: 'balanced',
    name: 'Balanced Growth Bucket',
    bucketRiskLevel: 'Moderate',
    explanation: 'Perfect balance of equity for growth and debt for stability.',
    recommended: true,
    horizon: '3-7 yrs',
    returns: '10-12%',
    recommendedFunds: [
      { schemeCode: '120579', name: 'ICICI Prudential Children\'s Fund', category: 'Solution Oriented', nav: '...' },
      { schemeCode: '100119', name: 'HDFC Balanced Advantage Fund', category: 'Dynamic Asset Allocation', nav: '...' },
      { schemeCode: '118968', name: 'HDFC Balanced Advantage Direct', category: 'Dynamic Asset Allocation', nav: '...' }
    ]
  },
  {
    id: 'high',
    name: 'High Growth Bucket',
    bucketRiskLevel: 'Aggressive',
    explanation: 'High equity exposure for maximum long-term wealth creation.',
    recommended: false,
    horizon: '7+ yrs',
    returns: '12-15%',
    recommendedFunds: [
      { schemeCode: '152365', name: 'ICICI Pru Nifty50 Value 20 Index', category: 'Index Fund', nav: '...' },
      { schemeCode: '122639', name: 'Parag Parikh Flexi Cap Fund', category: 'Flexi Cap Fund', nav: '...' },
      { schemeCode: '125354', name: 'Axis Small Cap Fund', category: 'Small Cap Fund', nav: '...' }
    ]
  }
];

export const InvestmentBucketsScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [investorProfile, setInvestorProfile] = useState<string | null>(null);
  
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  const [investModal, setInvestModal] = useState(false);
  const [investingBucket, setInvestingBucket] = useState<string | null>(null);
  const [investForm, setInvestForm] = useState({ amount: '150000', gender: 'male', email: 'test@example.com', bankAccountHolderName: 'John Doe', bankAccountNumber: '1234567890', ifscCode: 'HDFC0001234', addressLine1: '123 Test St', postalCode: '400001' });
  const [investing, setInvesting] = useState(false);
  const [investSuccess, setInvestSuccess] = useState<any>(null);

  useEffect(() => {
    fetchBuckets();
  }, []);

  const fetchBuckets = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/buckets`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setInvestorProfile(data.investorProfile);
        const b = data.buckets?.length ? data.buckets : DEFAULT_BUCKETS;
        setBuckets(b);
        const rec = b.find((x: any) => x.recommended);
        if (rec) setExpandedBucket(rec.id);
      } else {
        await loadFallbackLiveNavs();
      }
    } catch (e) {
      console.log('Failed to fetch buckets');
      await loadFallbackLiveNavs();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackLiveNavs = async () => {
    const liveBuckets = JSON.parse(JSON.stringify(DEFAULT_BUCKETS));
    
    await Promise.all(liveBuckets.map(async (bucket: any) => {
      await Promise.all(bucket.recommendedFunds.map(async (fund: any) => {
        try {
          const res = await fetch(`https://api.mfapi.in/mf/${fund.schemeCode}`);
          if (res.ok) {
            const data = await res.json();
            if (data.data && data.data.length > 0) {
              fund.nav = parseFloat(data.data[0].nav).toFixed(2);
            }
          }
        } catch (err) {}
      }));
    }));
    
    setBuckets(liveBuckets);
    const rec = liveBuckets.find((x: any) => x.recommended);
    if (rec) setExpandedBucket(rec.id);
  };

  const handleInvest = async () => {
    setInvesting(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/buckets/${investingBucket}/invest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          amount: Number(investForm.amount),
          gender: investForm.gender,
          email: investForm.email,
          bankAccountHolderName: investForm.bankAccountHolderName,
          bankAccountNumber: investForm.bankAccountNumber,
          ifscCode: investForm.ifscCode,
          addressLine1: investForm.addressLine1,
          postalCode: investForm.postalCode
        })
      });
      if (res.ok) {
        setInvestSuccess(await res.json());
      } else {
        Alert.alert('Error', 'Failed to place investment order.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error.');
    } finally {
      setInvesting(false);
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
                  <Text style={{ fontSize: 10, color: '#718096', marginBottom: 4, textTransform: 'uppercase', fontWeight: '600' }}>{t('buckets.estReturns', { defaultValue: 'Est. Returns' })}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#3C3985' }}>{bucket.returns || 'Var.'}</Text>
                </View>
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
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', marginBottom: 8 }}>{t('buckets.fundsInBucket', { defaultValue: 'FUNDS IN THIS BUCKET' })}</Text>
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
                  <Pressable 
                    style={styles.darkBtn}
                    onPress={(e) => {
                      e.stopPropagation();
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
        })}
        <Text style={styles.disclaimer}>{t('buckets.disclaimer', { defaultValue: 'Mutual Fund investments are subject to market risks.' })}</Text>
      </ScrollView>

      {/* Invest Modal */}
      <Modal visible={investModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {investSuccess ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>✅</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#102A54', marginBottom: 8, textAlign: 'center' }}>{t('buckets.orderPlaced', { defaultValue: 'Order Placed!' })}</Text>
                <Text style={{ fontSize: 14, color: '#4A5568', textAlign: 'center', marginBottom: 20 }}>Your investment order of ₹{investSuccess.amount} has been initiated successfully.</Text>
                <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, marginBottom: 20, width: '100%' }}>
                  <Text style={{ color: '#92400E', fontWeight: '700', textAlign: 'center', fontSize: 12 }}>{investSuccess.statusLabel}: {investSuccess.message}</Text>
                </View>
                <Pressable style={styles.darkBtn} onPress={() => { setInvestModal(false); navigation.navigate('MainTabs'); }}>
                  <Text style={styles.primaryBtnTxt}>{t('buckets.goToDash', { defaultValue: 'Go to Dashboard' })}</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#102A54', marginBottom: 16 }}>{t('buckets.completeInvest', { defaultValue: 'Complete Investment' })}</Text>
                <Text style={styles.inputLabel}>{t('buckets.investAmt', { defaultValue: 'Investment Amount (₹)' }).replace(',1', '₹')}</Text>
                <TextInput style={styles.input} value={investForm.amount} onChangeText={(v) => setInvestForm({...investForm, amount: v})} keyboardType="numeric" />
                <Text style={styles.inputLabel}>{t('buckets.bankHolder', { defaultValue: 'Bank Account Holder' })}</Text>
                <TextInput style={styles.input} value={investForm.bankAccountHolderName} onChangeText={(v) => setInvestForm({...investForm, bankAccountHolderName: v})} />
                <Text style={styles.inputLabel}>{t('buckets.bankNumber', { defaultValue: 'Bank Account Number' })}</Text>
                <TextInput style={styles.input} value={investForm.bankAccountNumber} onChangeText={(v) => setInvestForm({...investForm, bankAccountNumber: v})} />
                <Text style={styles.inputLabel}>{t('buckets.ifsc', { defaultValue: 'IFSC Code' })}</Text>
                <TextInput style={styles.input} value={investForm.ifscCode} onChangeText={(v) => setInvestForm({...investForm, ifscCode: v})} />
                
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                  <Pressable style={[styles.outlineBtn, { flex: 1 }]} onPress={() => setInvestModal(false)}><Text style={styles.outlineBtnTxt}>{t('common.cancel', { defaultValue: 'Cancel' })}</Text></Pressable>
                  <Pressable style={[styles.darkBtn, { flex: 1, marginTop: 0 }]} onPress={handleInvest} disabled={investing}>
                    <Text style={styles.primaryBtnTxt}>{investing ? t('buckets.processing', { defaultValue: 'Processing...' }) : t('buckets.confirmPay', { defaultValue: 'Confirm & Pay' })}</Text>
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
  disclaimer: { fontSize: 10, color: '#A0AEC0', textAlign: 'center', marginTop: 8, marginBottom: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#718096', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, color: '#102A54' }
});
