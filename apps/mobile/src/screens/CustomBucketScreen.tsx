import React, { useCallback, useEffect, useState } from 'react';
import {
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../services/api/client';
import { DraftFund, autoBalance, readDraft, writeDraft } from '../store/customBucket';

/**
 * POST /buckets/custom - ported from apps/web/app/buckets/custom/page.tsx.
 *
 * Funds are added from the fund detail screen; here they are named, weighted and saved.
 * CustomBucketDto requires at least one fund and the server rejects anything whose
 * allocations do not total exactly 100, so that total is shown live and the save button
 * stays disabled until it is right.
 */
export const CustomBucketScreen = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [funds, setFunds] = useState<DraftFund[]>([]);
  const [saving, setSaving] = useState(false);

  // Refocus rather than mount: the user arrives here repeatedly from fund detail as they
  // add funds, and a mount-only load would show a stale draft.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void readDraft().then((draft) => {
        if (!cancelled) setFunds(draft);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const persist = (next: DraftFund[]) => {
    setFunds(next);
    void writeDraft(next);
  };

  const total = funds.reduce((sum, fund) => sum + (Number(fund.allocation) || 0), 0);
  const isValid = funds.length > 0 && total === 100;

  const setAllocation = (schemeCode: number, raw: string) => {
    const value = Math.max(0, Math.min(100, parseInt(raw, 10) || 0));
    persist(funds.map((f) => (f.schemeCode === schemeCode ? { ...f, allocation: value } : f)));
  };

  const remove = (schemeCode: number) => {
    persist(autoBalance(funds.filter((f) => f.schemeCode !== schemeCode)));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/buckets/custom', {
        name: name.trim() || undefined,
        funds: funds.map((f) => ({
          schemeCode: f.schemeCode,
          name: f.name,
          category: f.category,
          allocation: f.allocation,
        })),
      });
      await writeDraft([]);
      setFunds([]);
      setName('');
      Alert.alert('Bucket saved', 'Your custom bucket has been saved.', [
        { text: 'OK', onPress: () => navigation.navigate('InvestmentBuckets') },
      ]);
    } catch (error) {
      Alert.alert('Could not save your bucket', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Build your bucket</Text>
        <Text style={styles.subtitle}>Pick the funds and decide how much goes into each.</Text>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {funds.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No funds added yet</Text>
            <Text style={styles.emptyText}>
              Search for a fund, open it, and tap &quot;Add to my bucket&quot; to start building.
            </Text>
            <Pressable style={styles.button} onPress={() => navigation.navigate('Funds')}>
              <Text style={styles.buttonText}>Find funds</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Bucket name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="My Custom Bucket"
              style={styles.input}
            />

            <View style={[styles.totalRow, isValid ? styles.totalOk : styles.totalBad]}>
              <Text style={styles.totalLabel}>Total allocation</Text>
              <Text style={styles.totalValue}>{total}%</Text>
            </View>
            {!isValid ? (
              <Text style={styles.hint}>
                Allocations must total exactly 100%. {total > 100 ? `Remove ${total - 100}%.` : `Add ${100 - total}%.`}
              </Text>
            ) : null}

            {funds.map((fund) => (
              <View key={fund.schemeCode} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fundName} numberOfLines={2}>
                      {fund.name}
                    </Text>
                    {fund.category ? <Text style={styles.fundCategory}>{fund.category}</Text> : null}
                  </View>
                  <Pressable onPress={() => remove(fund.schemeCode)} hitSlop={8}>
                    <Text style={styles.remove}>Remove</Text>
                  </Pressable>
                </View>
                <View style={styles.allocRow}>
                  <Text style={styles.allocLabel}>Allocation</Text>
                  <TextInput
                    value={String(fund.allocation)}
                    onChangeText={(value) => setAllocation(fund.schemeCode, value)}
                    keyboardType="number-pad"
                    maxLength={3}
                    style={styles.allocInput}
                  />
                  <Text style={styles.allocLabel}>%</Text>
                </View>
              </View>
            ))}

            <Pressable style={styles.outlineButton} onPress={() => persist(autoBalance(funds))}>
              <Text style={styles.outlineText}>Split evenly</Text>
            </Pressable>

            <Pressable
              style={[styles.button, (!isValid || saving) && styles.disabled]}
              onPress={save}
              disabled={!isValid || saving}
            >
              <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save bucket'}</Text>
            </Pressable>

            <Text style={styles.disclaimer}>
              Saving a bucket does not invest any money. Mutual fund investments are subject to market risks.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 16 },
  headerTitle: { color: '#102A54', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#4A5568', fontSize: 14, marginTop: 6, lineHeight: 20 },
  content: { paddingHorizontal: 20 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyTitle: { color: '#102A54', fontSize: 16, fontWeight: '800' },
  emptyText: { color: '#4A5568', fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 8 },
  label: { fontSize: 13, color: '#4A5568', fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 16, color: '#102A54' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginTop: 20 },
  totalOk: { backgroundColor: '#EBEAF8' },
  totalBad: { backgroundColor: '#FFFAF0', borderWidth: 1, borderColor: '#FBD38D' },
  totalLabel: { color: '#4A5568', fontWeight: '700', fontSize: 13 },
  totalValue: { color: '#102A54', fontWeight: '800', fontSize: 18 },
  hint: { color: '#C05621', fontSize: 12, marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  fundName: { color: '#2D3748', fontWeight: '700', fontSize: 14, lineHeight: 20 },
  fundCategory: { color: '#718096', fontSize: 12, marginTop: 4 },
  remove: { color: '#C53030', fontWeight: '700', fontSize: 12 },
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  allocLabel: { color: '#4A5568', fontSize: 13, fontWeight: '600' },
  allocInput: { backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, width: 70, height: 40, paddingHorizontal: 10, fontSize: 15, color: '#102A54', textAlign: 'center' },
  outlineButton: { padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#3C3985', marginTop: 20 },
  outlineText: { color: '#3C3985', fontSize: 15, fontWeight: '700' },
  button: { backgroundColor: '#3C3985', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  disclaimer: { color: '#A0AEC0', fontSize: 11, lineHeight: 16, marginTop: 16, marginBottom: 40, textAlign: 'center' },
});
