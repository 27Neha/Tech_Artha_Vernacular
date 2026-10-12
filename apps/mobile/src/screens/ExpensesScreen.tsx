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
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title={t('exp.title', { defaultValue: 'Expenses' })} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('exp.title', { defaultValue: 'Expenses' })}</Text>
        <Text style={styles.subtitle}>{t('exp.desc', { defaultValue: 'Track and manage your regular expenses.' })}</Text>

        <View style={styles.balanceCard}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: '#102A54', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#718096', marginBottom: 20 },
  balanceCard: { backgroundColor: '#3C3985', borderRadius: 16, padding: 20, marginBottom: 16 },
  balanceLabel: { color: '#D4E2F9', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  balance: { color: '#fff', fontSize: 32, fontWeight: '800', marginVertical: 6 },
  balanceSub: { color: '#D4E2F9', fontSize: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  label: { fontSize: 13, fontWeight: '700', color: '#4A5568', marginBottom: 8 },
  field: { backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 15, color: '#102A54' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  chipSelected: { backgroundColor: '#3C3985', borderColor: '#3C3985' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#4A5568' },
  chipTextSelected: { fontSize: 12, fontWeight: '700', color: '#fff' },
  primaryButton: { backgroundColor: '#3C3985', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#102A54', marginBottom: 12 },
  categoryCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  cardCatTitle: { fontSize: 14, fontWeight: '700', color: '#102A54' },
  cardCatSub: { fontSize: 12, color: '#718096', marginTop: 2 },
  cardCatAmount: { fontSize: 15, fontWeight: '800', color: '#102A54' },
  iconWrapper: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F8F9FB', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  icon: { fontSize: 28 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#102A54', marginBottom: 6 },
  emptyDesc: { fontSize: 12, color: '#718096', textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  btn: { backgroundColor: '#EBEBFA', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#3C3985', borderStyle: 'dashed' },
  btnText: { color: '#3C3985', fontWeight: '800', fontSize: 12 },
});

export default ExpensesScreen;
