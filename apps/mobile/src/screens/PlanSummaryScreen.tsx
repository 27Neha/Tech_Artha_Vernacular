import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../components/Header';
import { authStore } from '../store/auth';
import { useTranslation } from 'react-i18next';

const SIP_DATES = [1, 5, 10, 15, 20, 25];

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const PlanSummaryScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  // The investor picks the SIP date; none is pre-selected.
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [simulation, setSimulation] = useState<any>(null);

  const goal = route.params?.goal || 'Home';
  const bucket = route.params?.bucket || 'balanced';
  const targetAmount = route.params?.targetAmount || 1500000;
  const timePeriod = route.params?.timePeriod || 8;
  const inflationRate = route.params?.inflationRate || 6;
  const customAdjustments = route.params?.customAdjustments || [];

  useEffect(() => {
    const fetchSimulation = async () => {
      try {
        const token = authStore.accessToken;
        const res = await fetch(`${API_URL}/goals/simulate`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
          body: JSON.stringify({ targetAmount, timePeriod, inflationRate, customAdjustments }) 
        });
        if (res.ok) {
          const data = await res.json();
          setSimulation(data);
        }
      } catch (err) {
        console.log('Error simulating goal', err);
      }
    };
    fetchSimulation();
  }, [targetAmount, timePeriod, inflationRate]);

  const monthlySIP = simulation ? simulation.scenarios.find((s: any) => s.label === 'Base illustration')?.monthlyContribution : 0;
  const adjustedTarget = simulation ? simulation.adjustedTargetAmount : targetAmount;

  const handleConfirm = async () => {
    if (selectedDate === null) {
      Alert.alert('Choose a SIP date', 'Choose the day of the month your SIP instalment should be collected.');
      return;
    }
    if (!consent) {
      Alert.alert(t('plan.consentRequired', { defaultValue: 'Consent Required' }), t('plan.pleaseAccept', { defaultValue: 'Please accept the consent to proceed.' }));
      return;
    }
    
    setLoading(true);
    try {
      const token = authStore.accessToken;
      const response = await fetch(`${API_URL}/goals/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: goal,
          targetAmount,
          timePeriod,
          inflationRate,
          bucketName: bucket,
          sipDate: selectedDate,
          consent
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Could not save your plan.');

      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e) {
      Alert.alert('Could not save your plan', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Header title="" />
        <View style={{ padding: 24, paddingBottom: 20 }}>
          <Text style={styles.headerTitle}>{t('plan.title', { defaultValue: 'Your Investment Plan' })}</Text>
        </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.label}>{t('plan.goal', { defaultValue: 'GOAL' })}</Text><Text style={styles.value}>{goal.charAt(0).toUpperCase() + goal.slice(1)}</Text></View>
          <View style={styles.divider} />
          <View style={styles.row}><Text style={styles.label}>{t('plan.targetAmount', { defaultValue: 'Today\'s Target Amount' })}</Text><Text style={styles.value}>₹{targetAmount.toLocaleString('en-IN')}</Text></View>
          <View style={styles.divider} />
          <View style={styles.row}><Text style={styles.label}>{t('plan.inflationAdjusted', { defaultValue: 'Inflation Adjusted Target' })}</Text><Text style={styles.value}>₹{Math.round(adjustedTarget).toLocaleString('en-IN')}</Text></View>
          <View style={styles.divider} />
          <View style={styles.row}><Text style={styles.label}>{t('plan.timePeriod', { defaultValue: 'Time Period' })}</Text><Text style={styles.value}>{timePeriod} years</Text></View>
          <View style={styles.divider} />
          <View style={styles.row}><Text style={styles.label}>{t('plan.investmentBucket', { defaultValue: 'Investment Bucket' })}</Text><Text style={styles.value}>{bucket === 'high' ? 'High Growth' : bucket === 'stable' ? 'Stable Income' : 'Balanced Growth'} Bucket</Text></View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>{t('plan.monthlySip', { defaultValue: 'Monthly SIP' })}</Text>
            {simulation ? (
              <Text style={[styles.value, { color: '#3C3985', fontSize: 18 }]}>₹{monthlySIP.toLocaleString('en-IN')} / mo</Text>
            ) : (
              <ActivityIndicator size="small" color="#3C3985" />
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('plan.chooseDate', { defaultValue: 'SIP Date' })}</Text>
        <View style={styles.dateGrid}>
          {SIP_DATES.map(date => (
            <Pressable 
              key={date} 
              style={[styles.dateCircle, selectedDate === date && styles.dateCircleSelected]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[styles.dateText, selectedDate === date && styles.dateTextSelected]}>{date}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>{t('plan.marketRiskDisclaimer', { defaultValue: '⚠️ Important: Mutual fund investments are subject to market risks. Returns shown are illustrative only.' })}</Text>
        </View>

        <Pressable style={styles.checkboxRow} onPress={() => setConsent(!consent)}>
          <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
            {consent && <Text style={styles.checkIcon}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>{t('plan.consentSip', { defaultValue: 'I have read and understood the investment plan. I confirm my consent to proceed.' })}</Text>
        </Pressable>

        <Pressable 
          style={[styles.button, (!consent || loading) && styles.buttonDisabled]} 
          onPress={handleConfirm}
          disabled={!consent || loading}
        >
          <Text style={styles.buttonText}>{loading ? t('common.loading', { defaultValue: 'Setting up...' }) : t('plan.confirmButton', { defaultValue: 'Confirm & Start SIP 🚀' })}</Text>
        </Pressable>
        <Pressable style={styles.outlineButton} onPress={() => navigation.goBack()}>
          <Text style={styles.outlineText}>{t('plan.modifyPlan', { defaultValue: 'Modify Plan' })}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 20 },
  backButton: { marginBottom: 16 },
  backText: { color: '#102A54', fontSize: 24, fontWeight: 'bold' },
  headerTitle: { color: '#102A54', fontSize: 24, fontWeight: '800' },
  content: { padding: 20 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  divider: { height: 1, backgroundColor: '#EDF2F7' },
  label: { fontSize: 14, color: '#4A5568', fontWeight: '500' },
  value: { fontSize: 14, color: '#102A54', fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#102A54', marginBottom: 12 },
  dateGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  dateCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  dateCircleSelected: { backgroundColor: '#3C3985', borderColor: '#3C3985' },
  dateText: { fontSize: 16, fontWeight: '600', color: '#4A5568' },
  dateTextSelected: { color: 'white' },
  warningBox: { backgroundColor: '#FFFAF0', padding: 16, borderRadius: 12, borderColor: '#FBD38D', borderWidth: 1, marginBottom: 24 },
  warningText: { color: '#C05621', fontSize: 12, lineHeight: 18 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E0', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#3C3985', borderColor: '#3C3985' },
  checkIcon: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  checkboxLabel: { flex: 1, fontSize: 14, color: '#4A5568', lineHeight: 20 },
  button: { backgroundColor: '#3C3985', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  outlineButton: { padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#3C3985' },
  outlineText: { color: '#3C3985', fontSize: 16, fontWeight: '700' }
});
