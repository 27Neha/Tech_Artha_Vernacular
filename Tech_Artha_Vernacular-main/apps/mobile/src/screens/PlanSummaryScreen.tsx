import React, { useState } from 'react';
import { SafeAreaView, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { authStore } from '../store/auth';

const SIP_DATES = [1, 5, 10, 15, 20, 25];

export const PlanSummaryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [selectedDate, setSelectedDate] = useState<number>(10);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const goal = route.params?.goal || 'Home';
  const bucket = route.params?.bucket || 'balanced';

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Create Goal on backend
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.15:3000'}/goal/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authStore.userId,
          name: goal,
          targetAmount: 1500000,
          timePeriod: 8,
          bucketName: bucket,
          sipDate: selectedDate
        })
      });
      await response.json();
      
      // Navigate to Main Tabs (Home)
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Investment Plan</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.label}>GOAL</Text><Text style={styles.value}>{goal.charAt(0).toUpperCase() + goal.slice(1)}</Text></View>
          <View style={styles.divider} />
          <View style={styles.row}><Text style={styles.label}>Target Amount</Text><Text style={styles.value}>₹15,00,000</Text></View>
          <View style={styles.divider} />
          <View style={styles.row}><Text style={styles.label}>Time Period</Text><Text style={styles.value}>8 years</Text></View>
          <View style={styles.divider} />
          <View style={styles.row}><Text style={styles.label}>Your Risk Profile</Text><Text style={styles.value}>Moderate</Text></View>
          <View style={styles.divider} />
          <View style={styles.row}><Text style={styles.label}>Investment Bucket</Text><Text style={styles.value}>{bucket === 'high' ? 'High Growth' : bucket === 'stable' ? 'Stable Income' : 'Balanced Growth'} Bucket</Text></View>
          <View style={styles.divider} />
          <View style={styles.row}><Text style={styles.label}>Monthly SIP</Text><Text style={[styles.value, { color: '#3C3985', fontSize: 18 }]}>₹9,286 / mo</Text></View>
        </View>

        <Text style={styles.sectionTitle}>SIP Date</Text>
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
          <Text style={styles.warningText}>⚠️ Important: Mutual fund investments are subject to market risks. Returns shown are illustrative only.</Text>
        </View>

        <Pressable style={styles.checkboxRow} onPress={() => setConsent(!consent)}>
          <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
            {consent && <Text style={styles.checkIcon}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>I have read and understood the investment plan. I confirm my consent to proceed.</Text>
        </Pressable>

        <Pressable 
          style={[styles.button, (!consent || loading) && styles.buttonDisabled]} 
          onPress={handleConfirm}
          disabled={!consent || loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Setting up...' : 'Confirm & Start SIP 🚀'}</Text>
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
