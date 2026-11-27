import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { navigationRef } from '../navigation/navigationService';
import { api } from '../services/api/client';
import { useTheme } from '../context/ThemeContext';

type ExpenseItem = {
  id: string;
  amount: number;
  category: string;
  description?: string;
  occurredAt: string;
};

type ExpenseSummary = {
  monthStart: string;
  total: number;
  categories: { category: string; amount: number; percentage: number }[];
  expenses: ExpenseItem[];
  source: string;
  insight: string;
};

const CATEGORIES = [
  { name: 'Food', icon: '🍔', color: '#F59E0B', bg: '#FEF3C7' },
  { name: 'Travel', icon: '🚗', color: '#3B82F6', bg: '#DBEAFE' },
  { name: 'Bills', icon: '💡', color: '#10B981', bg: '#D1FAE5' },
  { name: 'Health', icon: '💊', color: '#EF4444', bg: '#FEE2E2' },
  { name: 'Shopping', icon: '🛍️', color: '#8B5CF6', bg: '#EDE9FE' },
  { name: 'Other', icon: '🏷️', color: '#64748B', bg: '#F1F5F9' },
];

const money = (value: number) =>
  `₹${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const formatDate = (isoString?: string) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

export const ExpensesScreen = ({ navigation: propNav }: any) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation('common');
  const hookNav = useNavigation<any>();
  const navigation = propNav || hookNav;

  const handleLinkBankAccount = () => {
    try {
      if (navigation?.navigate) {
        navigation.navigate('BankAccounts');
        return;
      }
    } catch {}
    try {
      if (navigation?.getParent) {
        const parent = navigation.getParent();
        if (parent?.navigate) {
          parent.navigate('BankAccounts');
          return;
        }
      }
    } catch {}
    if (navigationRef.isReady()) {
      navigationRef.navigate('BankAccounts');
    }
  };

  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [categoryInput, setCategoryInput] = useState(CATEGORIES[0].name);
  const [categoryError, setCategoryError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentMonthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const load = useCallback(async () => {
    try {
      const data = await api.get<ExpenseSummary>('/expenses');
      setSummary(data);
    } catch {
      // Gracefully handle offline or unauthenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const capTimer = setTimeout(() => setLoading(false), 700);
    void load().finally(() => clearTimeout(capTimer));
    return () => clearTimeout(capTimer);
  }, [load]);

  const addExpense = async () => {
    setCategoryError('');
    setAmountError('');

    const finalCategory = categoryInput.trim();
    if (!finalCategory) {
      setCategoryError('Please enter or select an expense category.');
      return;
    }

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setAmountError('Please enter a valid expense amount greater than ₹0.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/expenses', {
        amount: value,
        category: finalCategory,
        description: description.trim() || undefined,
      });
      // Clear fields on success
      setAmount('');
      setDescription('');
      setCategory(CATEGORIES[0].name);
      setCategoryInput(CATEGORIES[0].name);
      setCategoryError('');
      setAmountError('');
      await load();
    } catch (e) {
      Alert.alert('Could not add expense', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = (item: ExpenseItem) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${item.description || item.category}" (${money(item.amount)})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id);
            try {
              await api.del(`/expenses/${item.id}`);
              await load();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete expense.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const getCategoryMeta = (catName: string) => {
    return CATEGORIES.find((c) => c.name.toLowerCase() === catName.toLowerCase()) || {
      name: catName,
      icon: '🏷️',
      color: '#64748B',
      bg: '#F1F5F9',
    };
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <StatusBar style={colors.statusBar} />
      <Header title={t('exp.title', { defaultValue: 'Expenses' })} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('exp.title', { defaultValue: 'Expenses' })}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('exp.desc', { defaultValue: 'Track, categorize and manage your daily spending.' })}
              </Text>
            </View>
          </View>

          {/* Month Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>SPENDING IN {currentMonthName.toUpperCase()}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {summary?.expenses?.length ?? 0} {summary?.expenses?.length === 1 ? 'record' : 'records'}
                </Text>
              </View>
            </View>
            <Text style={styles.balance}>{money(summary?.total ?? 0)}</Text>
            {summary?.insight ? <Text style={styles.balanceSub}>{summary.insight}</Text> : null}
          </View>

          {/* Add Expense Form Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardHeaderTitle, { color: colors.textPrimary }]}>+ Add New Expense</Text>

            {/* Category Selection Chips */}
            <Text style={[styles.label, { color: colors.textPrimary, marginTop: 12 }]}>Category *</Text>
            <View style={styles.chipsRow}>
              {CATEGORIES.map((item) => {
                const selected = category === item.name;
                return (
                  <Pressable
                    key={item.name}
                    onPress={() => {
                      setCategory(item.name);
                      setCategoryError('');
                      if (item.name === 'Other') {
                        setCategoryInput('');
                      } else {
                        setCategoryInput(item.name);
                      }
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected
                          ? colors.primary
                          : isDark
                          ? colors.surfaceMuted
                          : '#F1F5F9',
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.chipEmoji}>{item.icon}</Text>
                    <Text style={selected ? styles.chipTextSelected : styles.chipText}>
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Category Text Field directly above Amount */}
            <Text style={[styles.label, { color: colors.textPrimary, marginTop: 10 }]}>Category Name *</Text>
            <TextInput
              value={categoryInput}
              onChangeText={(text) => {
                setCategoryInput(text);
                if (categoryError) setCategoryError('');
                const match = CATEGORIES.find((c) => c.name.toLowerCase() === text.trim().toLowerCase());
                if (match) {
                  setCategory(match.name);
                } else {
                  setCategory('Other');
                }
              }}
              placeholder={category === 'Other' ? "Enter custom category (e.g. Books, Gifts, Fitness)" : "Category name"}
              placeholderTextColor={colors.textPlaceholder}
              style={[
                styles.field,
                { backgroundColor: isDark ? colors.surfaceMuted : '#F8F9FB', borderColor: categoryError ? '#EF4444' : colors.border, color: colors.textPrimary },
              ]}
            />
            {categoryError ? (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: -6, marginBottom: 8, fontWeight: '600' }}>
                ⚠️ {categoryError}
              </Text>
            ) : null}

            {/* Amount Field */}
            <Text style={[styles.label, { color: colors.textPrimary, marginTop: 6 }]}>Amount *</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter amount (₹)"
              placeholderTextColor={colors.textPlaceholder}
              keyboardType="number-pad"
              style={[
                styles.field,
                { backgroundColor: isDark ? colors.surfaceMuted : '#F8F9FB', borderColor: amountError ? '#EF4444' : colors.border, color: colors.textPrimary },
              ]}
            />
            {amountError ? (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: -6, marginBottom: 8, fontWeight: '600' }}>
                ⚠️ {amountError}
              </Text>
            ) : null}

            {/* Note / Description */}
            <Text style={[styles.label, { color: colors.textPrimary, marginTop: 12 }]}>Note / Description (Optional)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., Grocery at D-Mart, Electricity bill"
              placeholderTextColor={colors.textPlaceholder}
              style={[
                styles.field,
                { backgroundColor: isDark ? colors.surfaceMuted : '#F8F9FB', borderColor: colors.border, color: colors.textPrimary },
              ]}
            />

            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary || '#3C3985', marginTop: 16 },
                saving && styles.primaryDisabled,
              ]}
              onPress={addExpense}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryText}>Add Expense</Text>
              )}
            </Pressable>
          </View>

          {/* Breakdown by Category */}
          {summary?.categories && summary.categories.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Spending Breakdown</Text>
              {summary.categories.map((item) => {
                const meta = getCategoryMeta(item.category);
                return (
                  <View
                    key={item.category}
                    style={[
                      styles.categoryCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <View style={[styles.catIconCircle, { backgroundColor: meta.bg }]}>
                      <Text style={styles.catEmoji}>{meta.icon}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.cardCatTitle, { color: colors.textPrimary }]}>{item.category}</Text>
                        <Text style={[styles.cardCatAmount, { color: colors.textPrimary }]}>{money(item.amount)}</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(100, Math.max(5, item.percentage))}%`, backgroundColor: meta.color },
                          ]}
                        />
                      </View>
                      <Text style={[styles.cardCatSub, { color: colors.textSecondary }]}>
                        {item.percentage}% of total this month
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Transaction History Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Transaction History</Text>
              {summary?.expenses && summary.expenses.length > 0 ? (
                <Text style={[styles.historyCountText, { color: colors.textSecondary }]}>
                  {summary.expenses.length} total
                </Text>
              ) : null}
            </View>

            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : summary?.expenses && summary.expenses.length > 0 ? (
              summary.expenses.map((item) => {
                const meta = getCategoryMeta(item.category);
                const isDeleting = deletingId === item.id;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.transactionCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <View style={[styles.catIconCircle, { backgroundColor: meta.bg }]}>
                      <Text style={styles.catEmoji}>{meta.icon}</Text>
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={[styles.txTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.description || item.category}
                      </Text>
                      <View style={styles.txMetaRow}>
                        <Text style={[styles.txCategoryTag, { color: meta.color }]}>{item.category}</Text>
                        <Text style={[styles.txDate, { color: colors.textSecondary }]}>
                          • {formatDate(item.occurredAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.txRight}>
                      <Text style={styles.txAmount}>- {money(item.amount)}</Text>
                      <TouchableOpacity
                        onPress={() => deleteExpense(item)}
                        disabled={isDeleting}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.deleteButton}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <Ionicons name="trash-outline" size={17} color="#94A3B8" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="receipt-outline" size={36} color="#94A3B8" />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 8 }]}>
                  No expenses recorded yet
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  Track where your money goes. Add your first expense using the form above.
                </Text>
              </View>
            )}
          </View>

          {/* Bank Account Linking card for Account Aggregator */}
          <View style={[styles.card, { marginTop: 16, alignItems: 'center' }]}>
            <View style={styles.iconWrapper}>
              <Text style={styles.icon}>🏦</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {t('exp.noBank', { defaultValue: 'Automated Expense Tracking' })}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              {t('exp.noBankDesc', {
                defaultValue:
                  'Link your primary bank account securely to auto-categorize spending and automate your mutual fund SIP deductions.',
              })}
            </Text>
            <TouchableOpacity
              style={styles.btn}
              onPress={handleLinkBankAccount}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Link Bank Account"
            >
              <Text style={styles.btnText}>
                {t('exp.linkBankAccount', { defaultValue: '+ Link Bank Account' })}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  container: { padding: 20, paddingBottom: 40 },
  headerRow: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#102A54', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#718096' },
  balanceCard: {
    backgroundColor: '#3C3985',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#3C3985',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { color: '#D4E2F9', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  balance: { color: '#fff', fontSize: 32, fontWeight: '800', marginVertical: 6 },
  balanceSub: { color: '#D4E2F9', fontSize: 12, lineHeight: 17 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderTitle: { fontSize: 15, fontWeight: '800', color: '#102A54' },
  label: { fontSize: 13, fontWeight: '700', color: '#4A5568', marginBottom: 6 },
  field: {
    backgroundColor: '#F8F9FB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#102A54',
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, marginTop: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipEmoji: { fontSize: 13, marginRight: 5 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#4A5568' },
  chipTextSelected: { fontSize: 12, fontWeight: '700', color: '#fff' },
  primaryButton: {
    backgroundColor: '#3C3985',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: { opacity: 0.6 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  section: { marginTop: 12, marginBottom: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#102A54', marginBottom: 10 },
  historyCountText: { fontSize: 12, fontWeight: '600', color: '#718096' },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  catIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catEmoji: { fontSize: 20 },
  cardCatTitle: { fontSize: 14, fontWeight: '700', color: '#102A54' },
  cardCatSub: { fontSize: 11, color: '#718096', marginTop: 4 },
  cardCatAmount: { fontSize: 15, fontWeight: '800', color: '#102A54' },
  progressBarBg: {
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBarFill: { height: 5, borderRadius: 3 },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  txInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  txTitle: { fontSize: 14, fontWeight: '700', color: '#102A54' },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  txCategoryTag: { fontSize: 11, fontWeight: '700' },
  txDate: { fontSize: 11, color: '#718096', marginLeft: 4 },
  txRight: { alignItems: 'flex-end', justifyContent: 'center' },
  txAmount: { fontSize: 14, fontWeight: '800', color: '#DC2626' },
  deleteButton: { marginTop: 4, padding: 2 },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8F9FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: { fontSize: 28 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#102A54', marginBottom: 6 },
  emptyDesc: { fontSize: 12, color: '#718096', textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  btn: {
    backgroundColor: '#EBEBFA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3C3985',
    borderStyle: 'dashed',
  },
  btnText: { color: '#3C3985', fontWeight: '800', fontSize: 12 },
});

export default ExpensesScreen;
