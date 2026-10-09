import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../services/api/client';

const SIP_DATES = [1, 5, 10, 15, 20, 25];

/** POST /goals/simulate - GoalCalculatorService returns three illustrations, not one figure. */
type Simulation = {
  targetAmount: number;
  adjustedTargetAmount: number;
  inflationRate: number;
  scenarios: { label: string; annualRate: number; monthlyContribution: number }[];
  disclaimer: string;
};

/** POST /goals/select - note executionStatus is always NOT_STARTED; it places no order. */
type GoalResult = {
  data: { id: string; monthlySip: number; bucketName: string };
  executionStatus: string;
  disclosure: string;
};

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

export const PlanSummaryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const goal = route.params?.goal || 'Home';
  const bucketId = route.params?.bucket || 'balanced';
  const bucketName = route.params?.bucketName;

  // Previously these were literals - ₹15,00,000 over 8 years - displayed as though the
  // user had chosen them. They are inputs, so the user supplies them.
  // Nothing is pre-filled. Cybrilla's compliance checklist requires that no values are
  // auto-populated or defaulted for any customer - a prefilled amount or SIP date is an
  // assumption about the investor that they may not notice they are accepting.
  const [targetAmount, setTargetAmount] = useState('');
  const [timePeriod, setTimePeriod] = useState('');
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [consent, setConsent] = useState(false);

  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [riskCategory, setRiskCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // The risk profile was hardcoded to "Moderate" regardless of the user's assessment.
    api
      .get<{ riskProfile?: { category?: string | null } | null }>('/auth/profile')
      .then((profile) => setRiskCategory(profile?.riskProfile?.category ?? null))
      .catch(() => setRiskCategory(null));
  }, []);

  const runSimulation = useCallback(async () => {
    if (targetAmount.trim() === '' || timePeriod.trim() === '') {
      // Not an error - the user simply has not filled the form yet.
      setSimulation(null);
      setSimulationError(null);
      return;
    }
    const amount = Number(targetAmount);
    const years = Number(timePeriod);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(years) || years < 1 || years > 50) {
      setSimulation(null);
      setSimulationError('Enter a target amount and a period between 1 and 50 years.');
      return;
    }
    setSimulating(true);
    setSimulationError(null);
    try {
      setSimulation(await api.post<Simulation>('/goals/simulate', { targetAmount: amount, timePeriod: years }));
    } catch (e) {
      setSimulation(null);
      setSimulationError(e instanceof Error ? e.message : 'Could not calculate your plan.');
    } finally {
      setSimulating(false);
    }
  }, [targetAmount, timePeriod]);

  useEffect(() => {
    const timer = setTimeout(() => void runSimulation(), 500);
    return () => clearTimeout(timer);
  }, [runSimulation]);

  const savePlan = async () => {
    if (selectedDate === null) {
      return Alert.alert('Choose a SIP date', 'Select the day of the month you would like to invest on.');
    }
    setLoading(true);
    try {
      const result = await api.post<GoalResult>('/goals/select', {
        name: goal,
        targetAmount: Number(targetAmount),
        timePeriod: Number(timePeriod),
        bucketId,
        sipDate: selectedDate,
        consent,
      });

      // The API is explicit that saving a plan creates no order. Surfacing its own
      // disclosure is the point: the previous screen said "Start SIP" and went to Home,
      // leaving users believing money had been committed when nothing had.
      Alert.alert(
        'Plan saved',
        result?.disclosure ??
          'No investment order was created. Separate execution consent is required before any transaction.',
        [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] }) }],
      );
    } catch (e) {
      Alert.alert('Could not save your plan', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const base = simulation?.scenarios?.find((s) => s.label === 'Base illustration');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Investment Plan</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>GOAL</Text>
            <Text style={styles.value}>{goal.charAt(0).toUpperCase() + goal.slice(1)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Your Risk Profile</Text>
            <Text style={styles.value}>{riskCategory ?? '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Investment Bucket</Text>
            <Text style={styles.value}>{bucketName ?? bucketId}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>What are you saving for?</Text>
        <Text style={styles.inputLabel}>Target amount (₹)</Text>
        <TextInput
          value={targetAmount}
          onChangeText={setTargetAmount}
          keyboardType="number-pad"
          style={styles.input}
          placeholder="1500000"
        />
        <Text style={styles.inputLabel}>Time period (years)</Text>
        <TextInput
          value={timePeriod}
          onChangeText={setTimePeriod}
          keyboardType="number-pad"
          style={styles.input}
          placeholder="8"
          maxLength={2}
        />

        <Text style={styles.sectionTitle}>Illustrations</Text>
        {simulating ? <ActivityIndicator /> : null}
        {simulationError ? <Text style={styles.error}>{simulationError}</Text> : null}

        {simulation ? (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Target, adjusted for {simulation.inflationRate}% inflation</Text>
              <Text style={styles.value}>{money(simulation.adjustedTargetAmount)}</Text>
            </View>
            <View style={styles.divider} />
            {/* Three illustrations, as the calculator returns them. Showing a single
                figure would present one assumed return rate as though it were a fact. */}
            {simulation.scenarios.map((scenario) => (
              <View key={scenario.label}>
                <View style={styles.row}>
                  <Text style={styles.label}>
                    {scenario.label.replace(' illustration', '')} · {scenario.annualRate}% p.a.
                  </Text>
                  <Text style={[styles.value, scenario === base && { color: '#3C3985', fontSize: 16 }]}>
                    {money(scenario.monthlyContribution)} / mo
                  </Text>
                </View>
                <View style={styles.divider} />
              </View>
            ))}
            <Text style={styles.disclaimerText}>{simulation.disclaimer}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>SIP Date</Text>
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
            Saving this plan does not invest any money. No order is placed and no mandate is set up — you
            will be asked for separate confirmation before any transaction.
          </Text>
        </View>

        <Pressable style={styles.checkboxRow} onPress={() => setConsent(!consent)}>
          <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
            {consent && <Text style={styles.checkIcon}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            I have read and understood this plan, including that the figures above are illustrations and not
            guaranteed returns.
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, (!consent || loading || !simulation || selectedDate === null) && styles.buttonDisabled]}
          onPress={savePlan}
          disabled={!consent || loading || !simulation || selectedDate === null}
        >
          {/* Was "Confirm & Start SIP 🚀" - which no part of this flow does. */}
          <Text style={styles.buttonText}>{loading ? 'Saving…' : 'Save my plan'}</Text>
        </Pressable>
        <Pressable style={styles.outlineButton} onPress={() => navigation.goBack()}>
          <Text style={styles.outlineText}>Modify Plan</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { color: '#102A54', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  content: { padding: 20 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, gap: 12 },
  divider: { height: 1, backgroundColor: '#EDF2F7' },
  label: { fontSize: 14, color: '#4A5568', fontWeight: '500', flex: 1 },
  value: { fontSize: 14, color: '#102A54', fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#102A54', marginBottom: 12 },
  inputLabel: { fontSize: 13, color: '#4A5568', fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 16, color: '#102A54', marginBottom: 16 },
  dateGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  dateCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  dateCircleSelected: { backgroundColor: '#3C3985', borderColor: '#3C3985' },
  dateText: { fontSize: 16, fontWeight: '600', color: '#4A5568' },
  dateTextSelected: { color: 'white' },
  warningBox: { backgroundColor: '#FFFAF0', padding: 16, borderRadius: 12, borderColor: '#FBD38D', borderWidth: 1, marginBottom: 24 },
  warningText: { color: '#C05621', fontSize: 12, lineHeight: 18 },
  disclaimerText: { color: '#718096', fontSize: 11, lineHeight: 16, marginTop: 12 },
  error: { color: '#C53030', fontSize: 13, marginBottom: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E0', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#3C3985', borderColor: '#3C3985' },
  checkIcon: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  checkboxLabel: { flex: 1, fontSize: 13, color: '#4A5568', lineHeight: 19 },
  button: { backgroundColor: '#3C3985', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  outlineButton: { padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#3C3985', marginBottom: 40 },
  outlineText: { color: '#3C3985', fontSize: 16, fontWeight: '700' },
});
