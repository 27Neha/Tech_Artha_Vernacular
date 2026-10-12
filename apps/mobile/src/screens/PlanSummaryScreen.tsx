import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../components/Header';
import { authStore } from '../store/auth';
import { api } from '../services/api/client';
import { useTranslation } from 'react-i18next';

const SIP_DATES = [1, 5, 10, 15, 20, 25];
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const PlanSummaryScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const goal = route.params?.goal || 'Home';
  const bucket = route.params?.bucket || 'balanced';
  const bucketName = route.params?.bucketName || (bucket === 'high' ? 'High Growth' : bucket === 'stable' ? 'Stable Income' : 'Balanced Growth');
  const targetAmount = Number(route.params?.targetAmount) || 1500000;
  const timePeriod = Number(route.params?.timePeriod) || 8;
  const inflationRate = Number(route.params?.inflationRate) || 6;
  const customAdjustments = route.params?.customAdjustments || [];

  const [selectedDate, setSelectedDate] = useState<number>(10);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [simulation, setSimulation] = useState<any>(null);

  useEffect(() => {
    const fetchSimulation = async () => {
      try {
        const token = authStore.accessToken;
        const res = await fetch(`${API_URL}/goals/simulate`, { 
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }, 
          body: JSON.stringify({ targetAmount, timePeriod, inflationRate, customAdjustments }) 
        });
        if (res.ok) {
          setSimulation(await res.json());
          return;
        }
      } catch {
        // Fallback to calculation below
      }

      // Fallback local calculation
      const adj = targetAmount * Math.pow(1 + inflationRate / 100, timePeriod);
      const r = 0.12 / 12;
      const n = timePeriod * 12;
      const sip = (adj * r) / (Math.pow(1 + r, n) - 1);
      setSimulation({
        targetAmount,
        adjustedTargetAmount: Math.round(adj),
        inflationRate,
        scenarios: [
          { label: 'Base illustration', annualRate: 12, monthlyContribution: Math.round(sip) },
        ],
        disclaimer: 'Illustration only. Mutual fund investments are subject to market risks.',
      });
    };

    fetchSimulation();
  }, [targetAmount, timePeriod, inflationRate]);

  const monthlySIP = simulation?.scenarios?.find((s: any) => s.label === 'Base illustration')?.monthlyContribution 
    || simulation?.scenarios?.[0]?.monthlyContribution 
    || Math.round((targetAmount * 1.5) / (timePeriod * 12));

  const adjustedTarget = simulation ? simulation.adjustedTargetAmount : targetAmount;

  const handleConfirm = async () => {
    if (!consent) {
      Alert.alert(t('plan.consentRequired', { defaultValue: 'Consent Required' }), t('plan.pleaseAccept', { defaultValue: 'Please accept the consent to proceed.' }));
      return;
    }
    
    setLoading(true);
    try {
      const token = authStore.accessToken;
      const payload = {
        name: goal,
        goal,
        targetAmount,
        timePeriod,
        horizonYears: timePeriod,
        inflationRate,
        bucketName,
        bucketId: bucket,
        sipDate: selectedDate,
        amountType: 'SIP',
        amount: monthlySIP,
        consent,
      };

      try {
        await api.post('/goals/context', payload);
      } catch {
        await fetch(`${API_URL}/goals/select`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      }

      Alert.alert(
        'Plan saved',
        'Your goal plan has been created. No investment order is placed until you execute a transaction.',
        [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] }) }],
      );
    } catch (e) {
      Alert.alert('Could not save your plan', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="" />
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}>
        <Text style={styles.headerTitle}>{t('plan.title', { defaultValue: 'Your Investment Plan' })}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>{t('plan.goal', { defaultValue: 'GOAL' })}</Text>
            <Text style={styles.value}>{goal.charAt(0).toUpperCase() + goal.slice(1)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>{t('plan.targetAmount', { defaultValue: "Today's Target Amount" })}</Text>
            <Text style={styles.value}>₹{targetAmount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>{t('plan.inflationAdjusted', { defaultValue: 'Inflation Adjusted Target' })}</Text>
            <Text style={styles.value}>₹{Math.round(adjustedTarget).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>{t('plan.timePeriod', { defaultValue: 'Time Period' })}</Text>
            <Text style={styles.value}>{timePeriod} {t('common.years', { defaultValue: 'years' })}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>{t('plan.investmentBucket', { defaultValue: 'Investment Bucket' })}</Text>
            <Text style={styles.value}>{bucketName}</Text>
          </View>
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
          {SIP_DATES.map((date) => (
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
          <Text style={styles.warningText}>
            {t('plan.marketRiskDisclaimer', {
              defaultValue: '⚠️ Important: Mutual fund investments are subject to market risks. Returns shown are illustrative only. Saving this plan does not place any financial transaction.',
            })}
          </Text>
        </View>

        <Pressable style={styles.checkboxRow} onPress={() => setConsent(!consent)}>
          <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
            {consent && <Text style={styles.checkIcon}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            {t('plan.consentSip', {
              defaultValue: 'I have read and understood the investment plan. I confirm my consent to proceed.',
            })}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, (!consent || loading || !simulation) && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={!consent || loading || !simulation}
        >
          <Text style={styles.buttonText}>
            {loading ? t('common.loading', { defaultValue: 'Saving...' }) : t('plan.confirmButton', { defaultValue: 'Confirm & Save Plan 🚀' })}
          </Text>
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
  headerTitle: { color: '#102A54', fontSize: 24, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, gap: 12 },
  divider: { height: 1, backgroundColor: '#EDF2F7' },
  label: { fontSize: 14, color: '#4A5568', fontWeight: '500', flex: 1 },
  value: { fontSize: 14, color: '#102A54', fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#102A54', marginBottom: 12 },
  dateGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  dateCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  dateCircleSelected: { backgroundColor: '#3C3985', borderColor: '#3C3985' },
  dateText: { fontSize: 16, fontWeight: '600', color: '#4A5568' },
  dateTextSelected: { color: 'white' },
  warningBox: { backgroundColor: '#FFFAF0', padding: 16, borderRadius: 12, borderColor: '#FBD38D', borderWidth: 1, marginBottom: 20 },
  warningText: { color: '#C05621', fontSize: 12, lineHeight: 18 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E0', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#3C3985', borderColor: '#3C3985' },
  checkIcon: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  checkboxLabel: { flex: 1, fontSize: 13, color: '#4A5568', lineHeight: 19 },
  button: { backgroundColor: '#3C3985', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  outlineButton: { padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#CBD5E1', marginBottom: 30 },
  outlineText: { color: '#4A5568', fontSize: 15, fontWeight: '600' },
});

export default PlanSummaryScreen;
