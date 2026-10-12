import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { exitOnboarding } from '../utils/navigation';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';

const GOALS = [
  { id: 'education', icon: '🎓', name: 'Child Education' },
  { id: 'marriage', icon: '💍', name: 'Marriage' },
  { id: 'home', icon: '🏠', name: 'Home' },
  { id: 'retirement', icon: '🌴', name: 'Retirement' },
  { id: 'vehicle', icon: '🚗', name: 'Vehicle' },
  { id: 'emergency', icon: '🛡️', name: 'Emergency Fund' },
  { id: 'wealth', icon: '🎯', name: 'Wealth Creation' },
  { id: 'vacation', icon: '✈️', name: 'Vacation' },
  { id: 'business', icon: '🏢', name: 'Start a Business' },
  { id: 'renovation', icon: '🔨', name: 'Home Renovation' },
  { id: 'debt', icon: '💳', name: 'Debt Payoff' },
  { id: 'custom', icon: '⚙️', name: 'Custom Goal' },
];

export const GoalSelectionScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [customGoalName, setCustomGoalName] = useState('');
  
  const [targetAmount, setTargetAmount] = useState('1000000');
  const [timePeriod, setTimePeriod] = useState('5');
  const [inflationRate, setInflationRate] = useState('6');
  const [customAdjustments, setCustomAdjustments] = useState<{name: string, percentage: string}[]>([]);

  const calculateFutureValue = () => {
    const p = Number(targetAmount) || 0;
    const t = Number(timePeriod) || 0;
    const r = Number(inflationRate) || 0;
    let inflated = p * Math.pow(1 + r / 100, t);
    if (customAdjustments.length > 0) {
      const mult = customAdjustments.reduce((sum, adj) => sum + ((Number(adj.percentage) || 0)/100), 0);
      inflated *= (1 + mult);
    }
    return inflated;
  };

  const handleAddAdjustment = () => setCustomAdjustments([...customAdjustments, {name: 'Adjustment', percentage: '10'}]);
  const updateAdjustment = (i: number, f: 'name' | 'percentage', v: string) => { const a = [...customAdjustments]; a[i][f] = v; setCustomAdjustments(a); };

  const handleContinue = () => {
    if (selectedGoal) {
      let finalGoal = selectedGoal;
      if (selectedGoal === 'custom' && customGoalName.trim()) {
        const lowerName = customGoalName.toLowerCase();
        if (lowerName.includes('educat') || lowerName.includes('school') || lowerName.includes('college')) finalGoal = 'education';
        else if (lowerName.includes('marriag') || lowerName.includes('weddin')) finalGoal = 'marriage';
        else if (lowerName.includes('home') || lowerName.includes('house')) finalGoal = 'home';
        else if (lowerName.includes('retire')) finalGoal = 'retirement';
        else if (lowerName.includes('car') || lowerName.includes('bike') || lowerName.includes('vehic')) finalGoal = 'vehicle';
        else if (lowerName.includes('emergenc') || lowerName.includes('medical')) finalGoal = 'emergency';
        else if (lowerName.includes('vacat') || lowerName.includes('trip') || lowerName.includes('travel')) finalGoal = 'vacation';
        else if (lowerName.includes('business') || lowerName.includes('startup')) finalGoal = 'business';
        else if (lowerName.includes('renovat') || lowerName.includes('remodel')) finalGoal = 'renovation';
        else if (lowerName.includes('debt') || lowerName.includes('loan')) finalGoal = 'debt';
        else finalGoal = customGoalName.trim();
      }

      navigation.navigate('InvestmentBuckets', { 
        goal: finalGoal, 
        targetAmount: Number(targetAmount), 
        timePeriod: Number(timePeriod), 
        inflationRate: Number(inflationRate), customAdjustments: customAdjustments.map(a => ({ name: a.name, percentage: Number(a.percentage) || 0 })) 
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Header title="" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.content}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#102A54', textTransform: 'capitalize', marginTop: 16, marginBottom: 4, paddingHorizontal: 20 }}>{t('goals.whatIsYourGoal', { defaultValue: 'What is your goal?' })}</Text>
        <Text style={{ fontSize: 14, color: '#718096', marginBottom: 24, paddingHorizontal: 20 }}>{t('goals.suitedToYourGoal', { defaultValue: 'Select a financial goal to plan for your future.' })}</Text>
        <View style={styles.grid}>
          {GOALS.map(goal => (
            <Pressable 
              key={goal.id} 
              style={[styles.card, selectedGoal === goal.id && styles.cardSelected]}
              onPress={() => setSelectedGoal(goal.id)}
            >
              <Text style={styles.icon}>{goal.icon}</Text>
              <Text style={[styles.name, selectedGoal === goal.id && styles.nameSelected]}>
                {t(`goals.categories.${goal.id}`, { defaultValue: goal.name })}
              </Text>
              {selectedGoal === goal.id && <View style={styles.checkBadge}><Text style={styles.checkText}>✓</Text></View>}
            </Pressable>
          ))}
        </View>

        {selectedGoal && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t('goals.goalDetails', { defaultValue: 'Goal Details' })}</Text>
            
            {selectedGoal === 'custom' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('goals.customGoalName', { defaultValue: 'Custom Goal Name' })}</Text>
                <TextInput 
                  value={customGoalName} 
                  onChangeText={setCustomGoalName} 
                  placeholder={t('goals.customPlaceholder', { defaultValue: 'e.g., Buying a Guitar' })}
                  style={styles.input} 
                />
              </View>
            )}
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
              <View style={styles.inputGroup}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                  <Text style={styles.label}>Custom Adjustments (e.g. Tax, Buffer)</Text>
                  <Pressable onPress={handleAddAdjustment}><Text style={{color: '#3C3985', fontWeight: 'bold'}}>+ Add</Text></Pressable>
                </View>
                {customAdjustments.map((adj, idx) => (
                  <View key={idx} style={{flexDirection: 'row', gap: 10, marginBottom: 10}}>
                    <TextInput value={adj.name} onChangeText={(v) => updateAdjustment(idx, 'name', v)} style={[styles.input, {flex: 2, marginBottom: 0}]} />
                    <TextInput value={adj.percentage} onChangeText={(v) => updateAdjustment(idx, 'percentage', v)} keyboardType="decimal-pad" style={[styles.input, {flex: 1, marginBottom: 0}]} />
                    <Pressable onPress={() => setCustomAdjustments(customAdjustments.filter((_, i) => i !== idx))} style={{justifyContent: 'center'}}><Text style={{color: 'red'}}>X</Text></Pressable>
                  </View>
                ))}
              </View>
            
            <View style={styles.futureBox}>
              <Text style={styles.futureLabel}>{t('goals.inflationAdjustedTarget', { defaultValue: 'Inflation Adjusted Target' })}</Text>
              <Text style={styles.futureValue}>₹{calculateFutureValue().toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
              <Text style={styles.futureNote}>
                {t('goals.inflationNote', { defaultValue: `This is what your goal will cost in ${timePeriod} years assuming ${inflationRate}% annual inflation.` })}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable 
          style={[styles.button, !selectedGoal && styles.buttonDisabled]} 
          onPress={handleContinue}
          disabled={!selectedGoal}
        >
          <Text style={styles.buttonText}>{t('goals.chooseInvestmentPlan', { defaultValue: 'Choose Investment Plan' })} →</Text>
        </Pressable>
        {/* Nothing is committed at this step, so leaving discards only the selection. */}
        <Pressable style={styles.laterButton} onPress={() => exitOnboarding(navigation)}>
          <Text style={styles.laterText}>{t('common.skipForNow', { defaultValue: 'Skip for now' })}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  laterButton: { paddingVertical: 12, alignItems: 'center' },
  laterText: { color: '#718096', fontSize: 14, fontWeight: '600' },

  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { backgroundColor: '#3C3985', padding: 24, paddingTop: 60, paddingBottom: 40 },
  backButton: { marginBottom: 16 },
  backText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: 'white', fontSize: 14, opacity: 0.9 },
  content: { padding: 20, marginTop: -20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 24 },
  card: { backgroundColor: 'white', width: '48%', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardSelected: { borderColor: '#3C3985', backgroundColor: '#EBEBFA' },
  icon: { fontSize: 32, marginBottom: 8 },
  name: { fontSize: 13, fontWeight: '700', color: '#102A54', textAlign: 'center' },
  nameSelected: { color: '#3C3985' },
  checkBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#3C3985', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  formCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  formTitle: { fontSize: 18, fontWeight: '800', color: '#102A54', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '700', color: '#4A5568', marginBottom: 8 },
  input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 16, color: '#102A54', fontWeight: '700' },
  futureBox: { backgroundColor: '#EBEBFA', borderWidth: 1, borderColor: '#D4E2F9', borderRadius: 12, padding: 16, marginTop: 8 },
  futureLabel: { fontSize: 12, fontWeight: '700', color: '#3182CE', textTransform: 'uppercase', marginBottom: 4 },
  futureValue: { fontSize: 24, fontWeight: '800', color: '#102A54', marginBottom: 8 },
  futureNote: { fontSize: 12, color: '#718096', lineHeight: 18 },
  footer: { padding: 24, paddingBottom: 40, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  button: { backgroundColor: '#3C3985', padding: 18, borderRadius: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' }
});

