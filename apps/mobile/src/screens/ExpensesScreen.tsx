import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '../services/api/client';
import { styles } from '../theme/styles';

/**
 * GET /expenses returns the current month's summary; POST /expenses adds one.
 * The service only ever reports what the user entered themselves, which is why the
 * copy avoids implying any bank or statement connection.
 */
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
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setSummary(await api.get<ExpenseSummary>('/expenses'));
    } catch (e) {
      Alert.alert('Could not load expenses', e instanceof Error ? e.message : 'Please try again.');
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

  if (loading) {
    return (
      <View style={styles.page}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Expenses</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>THIS MONTH</Text>
        <Text style={styles.balance}>{money(summary?.total ?? 0)}</Text>
        <Text style={styles.balanceSub}>{summary?.insight}</Text>
      </View>

      <Text style={styles.label}>Amount</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
        keyboardType="number-pad"
        style={styles.field}
      />

      <Text style={styles.label}>Category</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
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
        <Text style={styles.primaryText}>{saving ? 'Adding…' : 'Add expense'}</Text>
      </Pressable>

      {summary?.categories?.length ? (
        <>
          <Text style={styles.sectionTitle}>By category</Text>
          {summary.categories.map((item) => (
            <View key={item.category} style={styles.learningCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.category}</Text>
                <Text style={styles.cardSub}>{item.percentage}% of this month</Text>
              </View>
              <Text style={styles.cardTitle}>{money(item.amount)}</Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
};
