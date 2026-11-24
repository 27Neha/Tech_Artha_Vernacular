import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api/client';

type ExpenseSummary = {
  monthStart: string;
  total: number;
  categories: { category: string; amount: number; percentage: number }[];
  expenses: { id: string; amount: number; category: string; description?: string; occurredAt: string }[];
  source: string;
  insight: string;
};

const CATEGORIES = ['Food', 'Travel', 'Bills', 'Health', 'Shopping', 'Other'];

const money = (value: number) => `₹${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const ExpensesScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();

  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setSummary(await api.get<ExpenseSummary>('/expenses'));
    } catch {
      // Gracefully handle offline or unauthenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addExpense = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      return Alert.alert('Enter an amount', 'Please enter a valid amount greater than zero.');
    }
    setSaving(true);
    try {
      await api.post('/expenses', { amount: value, category });
      setAmount('');
      await load();
    } catch (e) {
      Alert.alert('Could not add expense', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <Header title={t('exp.title', { defaultValue: 'Expenses' })} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('exp.title', { defaultValue: 'Expenses' })}</Text>
        <Text style={styles.subtitle}>{t('exp.desc', { defaultValue: 'Track and manage your regular expenses.' })}</Text>

        <View style={styles.balanceCard}>
          <Svg
            style={StyleSheet.absoluteFill}
            width="100%"
            height="100%"
            preserveAspectRatio="none"
          >
            <Defs>
              <LinearGradient id="expenseCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#232262" />
                <Stop offset="55%" stopColor="#36358D" />
                <Stop offset="100%" stopColor="#524CB4" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" rx={24} fill="url(#expenseCardGrad)" />
            <Circle cx="88%" cy="12%" r="85" fill="rgba(255,255,255,0.06)" />
            <Circle cx="12%" cy="92%" r="65" fill="rgba(247,148,29,0.12)" />
          </Svg>
          <View style={styles.heroTopSheen} pointerEvents="none" />
          <Text style={styles.balanceLabel}>THIS MONTH</Text>
          <Text style={styles.balance}>{money(summary?.total ?? 0)}</Text>
          {summary?.insight ? <Text style={styles.balanceSub}>{summary.insight}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Add Expense</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount (₹)"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            style={styles.field}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Category</Text>
          <View style={styles.chipsRow}>
            {CATEGORIES.map((item) => (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[styles.chip, category === item && styles.chipSelected]}
              >
                <Text style={category === item ? styles.chipTextSelected : styles.chipText}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.primaryButton, saving && styles.primaryDisabled]}
            onPress={addExpense}
            disabled={saving}
          >
            <Text style={styles.primaryText}>{saving ? 'Adding…' : 'Add Expense'}</Text>
          </Pressable>
        </View>

        {summary?.categories && summary.categories.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>Breakdown by Category</Text>
            {summary.categories.map((item) => (
              <View key={item.category} style={styles.categoryCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardCatTitle}>{item.category}</Text>
                  <Text style={styles.cardCatSub}>{item.percentage}% of this month</Text>
                </View>
                <Text style={styles.cardCatAmount}>{money(item.amount)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.card, { marginTop: 16, alignItems: 'center' }]}>
            <View style={styles.iconWrapper}><Text style={styles.icon}>🏦</Text></View>
            <Text style={styles.emptyTitle}>{t('exp.noBank', { defaultValue: 'No Bank Account Linked' })}</Text>
            <Text style={styles.emptyDesc}>
              {t('exp.noBankDesc', { defaultValue: 'Link your primary bank account securely to start tracking expenses and automate SIP deductions.' })}
            </Text>
            <Pressable
              style={styles.btn}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.btnText}>{t('exp.linkBankAccount', { defaultValue: '+ Link Bank Account' })}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7FC' },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '900', color: '#102A54', marginBottom: 4, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: '#64748B', marginBottom: 20 },
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTopSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  balanceLabel: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  balance: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', marginVertical: 6 },
  balanceSub: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  label: { fontSize: 13, fontWeight: '800', color: '#102A54', marginBottom: 8 },
  field: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E6E8F6',
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#102A54',
    fontWeight: '700',
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E8F6',
  },
  chipSelected: { backgroundColor: '#36358D', borderColor: '#36358D' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  chipTextSelected: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  primaryButton: { backgroundColor: '#36358D', paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#102A54', marginBottom: 12 },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    marginBottom: 10,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardCatTitle: { fontSize: 14, fontWeight: '800', color: '#102A54' },
  cardCatSub: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' },
  cardCatAmount: { fontSize: 15, fontWeight: '900', color: '#102A54' },
  iconWrapper: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EEEDFA', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  icon: { fontSize: 28 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#102A54', marginBottom: 6 },
  emptyDesc: { fontSize: 12.5, color: '#64748B', textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  btn: { backgroundColor: '#EEEDFA', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#36358D', borderStyle: 'dashed' },
  btnText: { color: '#36358D', fontWeight: '800', fontSize: 12 },
});

export default ExpensesScreen;
