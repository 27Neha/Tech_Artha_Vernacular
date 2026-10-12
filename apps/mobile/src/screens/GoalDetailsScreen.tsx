import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Dimensions, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { authStore } from '../store/auth';
import { Header } from '../components/Header';
import { ChevronIcon } from '../components/Icons';
import Svg, { Path, Polyline, Line } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';


const CheckIcon = ({ color }: any) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="20 6 9 17 4 12"></Polyline>
  </Svg>
);

const PauseIcon = ({ color }: any) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Line x1="10" y1="4" x2="10" y2="20"></Line>
    <Line x1="14" y1="4" x2="14" y2="20"></Line>
  </Svg>
);

const TrashIcon = ({ color }: any) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="3 6 5 6 21 6"></Polyline>
    <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></Path>
  </Svg>
);

export const GoalDetailsScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const goalId = route.params?.goalId;
  const [goal, setGoal] = useState<any>(route.params?.goalData || null);
  const [loading, setLoading] = useState(!route.params?.goalData);
  const [isPaused, setIsPaused] = useState(false);

  const fetchGoal = useCallback(async () => {
    try {
      const token = authStore.accessToken;
      if (!token || !goalId) return;
      const res = await fetch(`${API_URL}/goals`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const found = data.find((g: any) => g.id === goalId);
        if (found) setGoal(found);
      }
    } catch (e) {
      console.log('Error fetching goal details', e);
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useFocusEffect(
    useCallback(() => {
      fetchGoal();
    }, [fetchGoal])
  );

  if (loading && !goal) {
    return (
      <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
        <Header title={t('port.myGoals', { defaultValue: 'My Goals' })} onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator size="large" color="#3C3985" /></View>
      </SafeAreaView>
    );
  }

  if (!goal) return null;

  const progressPercentage = goal.progressPercentage || 0;
  const currentSaved = goal.currentSavings || goal.currentInvestmentValue || 0;
  const futureTarget = goal.inflationAdjustedAmount ? Math.round(goal.inflationAdjustedAmount) : goal.targetAmount;

  return (
    <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title={t('port.myGoals', { defaultValue: 'My Goals' })} onBack={() => navigation.goBack()} />
      <ScrollView style={styles.content}>
        
        <View style={styles.headerBox}>
          <Text style={styles.goalTitle}>{goal.name}</Text>
          <Text style={styles.goalSubtitle}>{goal.timePeriod} {t('common.years', { defaultValue: 'Years' })} • {goal.bucketName === 'stable' ? t('buckets.conservative', { defaultValue: 'Conservative' }) : goal.bucketName === 'growth' ? t('buckets.aggressive', { defaultValue: 'Aggressive' }) : t('buckets.moderate', { defaultValue: 'Moderate' })}</Text>
        </View>
        
        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.label}>{t('goals.todaysTarget', { defaultValue: 'Today\'s Target' })}</Text>
            <Text style={styles.value}>₹{goal.targetAmount?.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.card, styles.blueCard]}>
            <Text style={styles.blueLabel}>{t('goals.futureTarget', { defaultValue: 'Future Target' })} ({goal.inflationRate}%)</Text>
            <Text style={styles.value}>₹{futureTarget.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.chartTitle}>{t('goals.fulfilment', { defaultValue: 'Goal Fulfilment' })}</Text>
            <Text style={styles.progressText}>{progressPercentage.toFixed(1)}%</Text>
          </View>
          
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${Math.min(progressPercentage, 100)}%` }]} />
          </View>
          
          <View style={styles.rowBetween}>
            <Text style={styles.statsLabel}>{t('port.saved', { defaultValue: 'Saved:' })} <Text style={styles.statsValue}>₹{currentSaved.toLocaleString('en-IN')}</Text></Text>
            <Text style={styles.statsLabel}>{t('port.left', { defaultValue: 'Left:' })} <Text style={styles.statsValue}>₹{goal.remainingAmount?.toLocaleString('en-IN')}</Text></Text>
          </View>
        </View>

        <View style={styles.sipBox}>
          <View>
            <Text style={styles.sipLabel}>{t('goals.reqMonthlySip', { defaultValue: 'REQUIRED MONTHLY SIP' })}</Text>
            <Text style={styles.sipValue}>₹{goal.monthlySip?.toLocaleString('en-IN')}/mo</Text>
          </View>
          <Pressable 
            style={styles.editButton} 
            onPress={() => navigation.navigate('EditGoal', { goal })}
          >
            <Text style={styles.editText}>{t('common.editGoal', { defaultValue: 'Edit Goal' })}</Text>
          </Pressable>
        </View>

      
        </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24 },
  headerBox: { marginBottom: 24 },
  goalTitle: { fontSize: 24, fontWeight: '800', color: '#102A54', textTransform: 'capitalize', marginBottom: 4 },
  goalSubtitle: { fontSize: 14, color: '#718096', fontWeight: '500' },
  grid: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  card: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  blueCard: { backgroundColor: '#EBEBFA', borderColor: '#D4E2F9' },
  label: { fontSize: 12, fontWeight: '700', color: '#718096', marginBottom: 4 },
  blueLabel: { fontSize: 12, fontWeight: '700', color: '#3182CE', marginBottom: 4 },
  value: { fontSize: 18, fontWeight: '800', color: '#102A54' },
  chartCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#102A54' },
  progressText: { fontSize: 18, fontWeight: '800', color: '#3C3985' },
  track: { height: 16, backgroundColor: '#F7FAFC', borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  bar: { height: '100%', backgroundColor: '#3C3985', borderRadius: 8 },
  statsLabel: { fontSize: 12, fontWeight: '700', color: '#718096' },
  statsValue: { color: '#102A54' },
  sipBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EBEBFA', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#D4E2F9', marginBottom: 40 },
  sipLabel: { fontSize: 10, fontWeight: '700', color: '#718096', letterSpacing: 0.5, marginBottom: 4 },
  sipValue: { fontSize: 20, fontWeight: '800', color: '#3C3985' },
  editButton: { backgroundColor: '#3C3985', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  editText: { color: 'white', fontSize: 14, fontWeight: '700' }
});
