import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { authStore } from '../store/auth';
import { Header } from '../components/Header';
import Svg, { Path, Polyline, Line } from 'react-native-svg';
import { ChevronIcon } from '../components/Icons';
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

export const EditGoalScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const goal = route.params?.goal;

  const [name, setName] = useState(goal?.name || '');
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount?.toString() || '');
  const [timePeriod, setTimePeriod] = useState(goal?.timePeriod?.toString() || '');
  const [inflationRate, setInflationRate] = useState(goal?.inflationRate?.toString() || '6');
  const [loading, setLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState('');

  if (!goal) return null;

  const handleSave = async () => {
    setError('');
    const parsedAmount = Number(targetAmount);
    const parsedTime = Number(timePeriod);
    const parsedInflation = Number(inflationRate);

    if (!name.trim()) return setError(t('validation.nameRequired', { defaultValue: 'Goal name is required' }));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return setError(t('validation.invalidAmount', { defaultValue: 'Invalid target amount' }));
    if (isNaN(parsedTime) || parsedTime <= 0) return setError(t('validation.invalidTime', { defaultValue: 'Invalid time horizon' }));
    if (isNaN(parsedInflation) || parsedInflation < 0) return setError(t('validation.invalidInflation', { defaultValue: 'Invalid inflation rate' }));

    setLoading(true);
    try {
      const token = authStore.accessToken;
      const res = await fetch(`${API_URL}/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          targetAmount: parsedAmount,
          timePeriod: parsedTime,
          inflationRate: parsedInflation
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update goal');
      
      // Navigate back to MainTabs so Dashboard refreshes, or go back to details
      navigation.navigate('MainTabs');
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title={t('goals.editGoal', { defaultValue: 'Edit Goal' })} onBack={() => navigation.goBack()} />
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#102A54', textTransform: 'capitalize', marginBottom: 16, marginTop: 8, paddingHorizontal: 20 }}>{t('goals.editGoal', { defaultValue: 'Edit Goal' })}</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('goals.goalDetails', { defaultValue: 'Goal Details' })}</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('goals.goalName', { defaultValue: 'Goal Name' })}</Text>
            <TextInput 
              value={name} 
              onChangeText={setName} 
              style={styles.input} 
              placeholder="e.g. Dream Home"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('goals.todaysTargetAmount', { defaultValue: 'Today\'s Target Amount (₹)' })}</Text>
            <TextInput 
              value={targetAmount} 
              onChangeText={setTargetAmount} 
              keyboardType="number-pad"
              style={styles.input} 
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('goals.timeHorizonYears', { defaultValue: 'Time Horizon (Years)' })}</Text>
            <TextInput 
              value={timePeriod} 
              onChangeText={setTimePeriod} 
              keyboardType="number-pad"
              style={styles.input} 
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('goals.expectedInflation', { defaultValue: 'Expected Inflation Rate (% p.a.)' })}</Text>
            <TextInput 
              value={inflationRate} 
              onChangeText={setInflationRate} 
              keyboardType="decimal-pad"
              style={styles.input} 
            />
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        

      
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {t('goals.editWarning', { defaultValue: 'Note: Changing these values will automatically recalculate your required SIP and inflation-adjusted future target based on the latest data.' })}
          </Text>
        </View>

        {/* Advanced Settings Card */}
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#102A54', marginBottom: 16 }}>{t('goals.statusTitle', { defaultValue: 'Goal Status' })}</Text>
        <View style={{ backgroundColor: '#fff', borderRadius: 24, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3, marginBottom: 40 }}>
            
          {/* Pause Goal (Toggle) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8F9FB', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <PauseIcon color="#4A5568" />
            </View>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#102A54', marginBottom: 4 }}>{t('goals.pauseGoal', { defaultValue: 'Pause Goal' })}</Text>
              <Text style={{ fontSize: 13, color: '#718096', lineHeight: 18 }}>{t('goals.pauseDesc', { defaultValue: 'Temporarily suspend SIPs' })}</Text>
            </View>
            <Switch 
              value={isPaused} 
              onValueChange={(val) => {
                 setIsPaused(val);
                 if(val) Alert.alert(t('goals.goalPaused', { defaultValue: 'Goal Paused' }), t('goals.goalPausedDesc', { defaultValue: 'SIPs associated with this goal are temporarily suspended.' }));
              }}
              trackColor={{ false: '#E2E8F0', true: '#3C3985' }}
            />
          </View>

          {/* Mark as Achieved */}
          <Pressable 
            style={({pressed}) => ({ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: pressed ? '#F8F9FB' : '#fff' })}
            onPress={() => {
              Alert.alert(t('goals.markCompleted', { defaultValue: 'Mark as Completed' }), t('goals.markCompletedConfirm', { defaultValue: 'Are you sure you want to officially mark this goal as achieved?' }), [
                { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
                { text: t('common.complete', { defaultValue: 'Complete' }), style: 'default' }
              ]);
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0FFF4', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <CheckIcon color="#276749" />
            </View>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#102A54', marginBottom: 4 }}>{t('goals.markAchieved', { defaultValue: 'Mark as Achieved' })}</Text>
              <Text style={{ fontSize: 13, color: '#718096', lineHeight: 18 }}>{t('goals.achievedDesc', { defaultValue: 'Officially complete this goal' })}</Text>
            </View>
            <ChevronIcon color="#A0AEC0" size={20} />
          </Pressable>

          {/* Delete Goal */}
          <Pressable 
            style={({pressed}) => ({ flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: pressed ? '#FFF5F5' : '#fff', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 })}
            onPress={() => {
              Alert.alert(t('goals.deleteGoal', { defaultValue: 'Delete Goal' }), t('goals.deleteConfirm', { defaultValue: 'This action cannot be undone. Any invested amount will safely remain in your main portfolio.' }), [
                { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
                { text: t('common.delete', { defaultValue: 'Delete' }), style: 'destructive' }
              ]);
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <TrashIcon color="#E53E3E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#E53E3E', marginBottom: 4 }}>{t('goals.deleteGoal', { defaultValue: 'Delete Goal' })}</Text>
              <Text style={{ fontSize: 13, color: '#E53E3E', opacity: 0.8, lineHeight: 18 }}>{t('goals.deleteDesc', { defaultValue: 'Remove this goal entirely' })}</Text>
            </View>
            <ChevronIcon color="#FEB2B2" size={20} />
          </Pressable>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable 
          style={[styles.primaryButton, loading && styles.primaryDisabled]} 
          onPress={handleSave} 
          disabled={loading}
        >
          <Text style={styles.primaryText}>{loading ? t('common.saving', { defaultValue: 'Saving...' }) : t('common.saveChanges', { defaultValue: 'Save Changes' })}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  footer: { backgroundColor: '#fff', padding: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 10 },
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  content: { padding: 24 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#102A54', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '700', color: '#4A5568', marginBottom: 8 },
  input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 16, color: '#102A54', fontWeight: '600' },
  errorText: { color: '#E53E3E', fontSize: 14, marginBottom: 16, fontWeight: '600', textAlign: 'center' },
  primaryButton: { backgroundColor: '#3C3985', padding: 18, borderRadius: 12, alignItems: 'center' },
  primaryDisabled: { opacity: 0.7 },
  primaryText: { color: 'white', fontSize: 16, fontWeight: '700' },
  warningBox: { backgroundColor: '#FFFAF0', padding: 16, borderRadius: 12, borderColor: '#FBD38D', borderWidth: 1, marginBottom: 40 },
  warningText: { color: '#C05621', fontSize: 12, lineHeight: 18 }
});
