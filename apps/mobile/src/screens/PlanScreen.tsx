import React, { useState } from 'react';
import { SafeAreaView, View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles } from '../theme/styles';
import { api } from '../services/api/client';
import { useAuth } from '../store/AuthContext';

const SIP_DATES = [1, 5, 10, 15, 20, 25];

const BUCKET_NAMES: Record<string, string> = {
  stable: 'Stable Income Bucket',
  balanced: 'Balanced Growth Bucket',
  high: 'High Growth Bucket',
};

const GOAL_NAMES: Record<string, string> = {
  home: 'Buy a Home', education: "Child's Education", marriage: 'Marriage',
  retirement: 'Retirement', travel: 'Dream Travel', emergency: 'Emergency Fund',
  car: 'Buy a Car', wealth: 'Wealth Creation',
};

export const PlanScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { goal = 'wealth', bucket = 'balanced', targetAmount = 1500000, timePeriod = 8 } = route.params || {};

  const [sipDate, setSipDate] = useState(10);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!consent) {
      Alert.alert('Consent Required', 'Please accept the consent to proceed.');
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/goals/select', {
        name: goal,
        targetAmount: Number(targetAmount),
        timePeriod: Number(timePeriod),
        bucketName: bucket,
        sipDate,
        consent
      });
      navigation.navigate('MainTabs');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const renderSuffix = (date: number) => {
    if ([1, 21, 31].includes(date)) return 'st';
    if ([2, 22].includes(date)) return 'nd';
    if ([3, 23].includes(date)) return 'rd';
    return 'th';
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F8F9FB' }]}>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        <View style={localStyles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24, color: '#1653B0' }}>←</Text>
          </Pressable>
          <Text style={localStyles.headerTitle}>Your Investment Plan</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
          <View style={localStyles.card}>
            <View style={localStyles.row}>
              <Text style={localStyles.label}>GOAL</Text>
              <Text style={localStyles.value}>{GOAL_NAMES[goal] || goal}</Text>
            </View>
            <View style={localStyles.divider} />
            <View style={localStyles.row}>
              <Text style={localStyles.label}>Target Amount</Text>
              <Text style={localStyles.value}>₹ {Number(targetAmount).toLocaleString('en-IN')}</Text>
            </View>
            <View style={localStyles.divider} />
            <View style={localStyles.row}>
              <Text style={localStyles.label}>Time Period</Text>
              <Text style={localStyles.value}>{timePeriod} years</Text>
            </View>
            <View style={localStyles.divider} />
            <View style={localStyles.row}>
              <Text style={localStyles.label}>Investment Bucket</Text>
              <Text style={localStyles.value}>{BUCKET_NAMES[bucket] || bucket}</Text>
            </View>
            <View style={localStyles.divider} />
            <View style={localStyles.row}>
              <Text style={localStyles.label}>Monthly SIP</Text>
              <Text style={[localStyles.value, { color: '#1653B0', fontSize: 18 }]}>
                ₹ 19,286 / mo
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#102A54' }}>Choose SIP Date</Text>
              <Pressable onPress={() => setIsCalendarOpen(!isCalendarOpen)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 20 }}>📅</Text>
              </Pressable>
            </View>
            <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ color: '#1653B0', fontSize: 12, fontWeight: 'bold' }}>Every Month</Text>
            </View>
          </View>

          {isCalendarOpen && (
            <View style={localStyles.calendarPopup}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                  <Pressable
                    key={d}
                    onPress={() => { setSipDate(d); setIsCalendarOpen(false); }}
                    style={[localStyles.dateButton, sipDate === d && localStyles.dateButtonSelected]}
                  >
                    <Text style={[localStyles.dateText, sipDate === d && localStyles.dateTextSelected]}>{d}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={localStyles.dateInfoBox}>
            <Text style={{ color: '#4A5568', fontSize: 14, marginBottom: 4 }}>Monthly deduction date selected:</Text>
            <Text style={{ color: '#1653B0', fontSize: 24, fontWeight: '900' }}>
              {sipDate}{renderSuffix(sipDate)} of every month
            </Text>
          </View>

          <View style={localStyles.warningBox}>
            <Text style={{ color: '#C05621', fontSize: 14, lineHeight: 20 }}>
              Mutual fund investments are subject to market risks. Read all scheme related documents carefully.
            </Text>
          </View>

          <Pressable onPress={() => setConsent(!consent)} style={localStyles.consentRow}>
            <View style={[localStyles.checkbox, consent && localStyles.checkboxSelected]}>
              {consent && <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
            </View>
            <Text style={localStyles.consentText}>
              I authorize TechArtha to setup an auto-pay mandate for this SIP and agree to the Terms & Conditions.
            </Text>
          </Pressable>

          <Pressable 
            style={[styles.primaryButton, loading && styles.primaryDisabled]} 
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Confirm & Start SIP</Text>}
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#102A54',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    color: '#718096',
  },
  value: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#102A54',
    textAlign: 'right',
    maxWidth: '60%',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  calendarPopup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButtonSelected: {
    backgroundColor: '#102A54',
  },
  dateText: {
    color: '#102A54',
    fontSize: 14,
  },
  dateTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dateInfoBox: {
    backgroundColor: '#F0F5FF',
    borderWidth: 1,
    borderColor: '#D4E2F9',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  warningBox: {
    backgroundColor: '#FFFAF0',
    borderWidth: 1,
    borderColor: '#FBD38D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E0',
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#1653B0',
    borderColor: '#1653B0',
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  }
});
