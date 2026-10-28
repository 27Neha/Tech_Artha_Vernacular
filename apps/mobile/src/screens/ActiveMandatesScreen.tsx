import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Header } from '../components/Header';
import { ChoiceChips } from '../components/ChoiceChips';
import { api } from '../services/api/client';

/**
 * Auto-debit mandates (UPI Autopay and e-NACH) - GET/POST /mandates.
 *
 * SIP instalments are collected through an APPROVED mandate, so a SIP cannot start
 * without one. This screen previously showed a sample mandate (a made-up UMRN and
 * bank) and "cancelled" it locally while claiming it had been revoked with NPCI. Every
 * mandate shown now is the investor's own, with the gateway's status.
 */
type Mandate = {
  id: string;
  mandateType: 'UPI' | 'E_MANDATE';
  mandateLimit: number;
  status: string;
  umrn: string | null;
  authorizationUrl: string | null;
  createdAt: string;
};

type MandatesResponse = { canCreate: boolean; mandates: Mandate[]; message: string | null };

const TYPE_OPTIONS = [
  { value: 'UPI', label: 'UPI Autopay' },
  { value: 'E_MANDATE', label: 'e-NACH' },
] as const;

const typeLabel = (t: string) => (t === 'UPI' ? 'UPI Autopay' : 'e-NACH');

const statusCopy: Record<string, { label: string; tone: 'ok' | 'wait' | 'bad' }> = {
  APPROVED: { label: 'Approved', tone: 'ok' },
  CREATED: { label: 'Awaiting your approval', tone: 'wait' },
  SUBMITTED: { label: 'Submitted to your bank', tone: 'wait' },
  REJECTED: { label: 'Rejected', tone: 'bad' },
  CANCELLED: { label: 'Cancelled', tone: 'bad' },
  EXPIRED: { label: 'Expired', tone: 'bad' },
  FAILED: { label: 'Failed', tone: 'bad' },
};

export const ActiveMandatesScreen = () => {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<MandatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // Neither has a default: the type and the debit limit are the investor's decision.
  const [mandateType, setMandateType] = useState<string | null>(null);
  const [limit, setLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.get<MandatesResponse>('/mandates'));
    } catch (e) {
      Alert.alert('Could not load your mandates', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refreshed on focus: coming back from the bank's approval page should show the new status.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openAuthorization = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open the approval page', 'Please try again.');
    }
  };

  const create = async () => {
    if (!mandateType) return Alert.alert('Choose a type', 'Choose UPI Autopay or e-NACH.');
    const value = Number(limit);
    if (!Number.isFinite(value) || value < 100) {
      return Alert.alert('Check the limit', 'Enter the most that may be debited per instalment, at least ₹100.');
    }
    setSubmitting(true);
    try {
      const mandate = await api.post<Mandate>('/mandates', { mandateType, mandateLimit: value });
      setMandateType(null);
      setLimit('');
      await load();
      if (mandate.authorizationUrl) {
        Alert.alert('Approve with your bank', 'Your mandate has been created. Approve it with your bank to start using it for SIPs.', [
          { text: 'Later', style: 'cancel' },
          { text: 'Approve now', onPress: () => void openAuthorization(mandate.authorizationUrl!) },
        ]);
      }
    } catch (e) {
      Alert.alert('Could not set up auto-debit', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reauthorize = async (m: Mandate) => {
    try {
      const updated = await api.post<Mandate>(`/mandates/${encodeURIComponent(m.id)}/authorize`, {});
      if (updated.authorizationUrl) await openAuthorization(updated.authorizationUrl);
    } catch (e) {
      Alert.alert('Could not open the approval page', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="Auto-debit mandates" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.intro}>
          A SIP collects each instalment from your bank account through an approved auto-debit mandate. You approve it
          once with your bank, and set the most that may be debited per instalment.
        </Text>

        {loading ? (
          <ActivityIndicator color="#3C3985" style={{ marginTop: 32 }} />
        ) : (
          <>
            {data?.message ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>{data.message}</Text>
              </View>
            ) : null}

            {(data?.mandates ?? []).map((m) => {
              const copy = statusCopy[m.status] ?? { label: m.status, tone: 'wait' as const };
              return (
                <View key={m.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardTitle}>{typeLabel(m.mandateType)}</Text>
                    <Text style={[styles.badge, styles[copy.tone]]}>{copy.label}</Text>
                  </View>
                  <Text style={styles.meta}>Limit per instalment: ₹{m.mandateLimit.toLocaleString('en-IN')}</Text>
                  {m.umrn ? <Text style={styles.meta}>UMRN {m.umrn}</Text> : null}
                  <Text style={styles.meta}>Set up on {new Date(m.createdAt).toLocaleDateString('en-IN')}</Text>
                  {m.authorizationUrl ? (
                    <Pressable style={styles.button} onPress={() => void reauthorize(m)}>
                      <Text style={styles.buttonText}>Approve with your bank</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}

            {data?.canCreate ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Set up a new mandate</Text>
                <Text style={styles.label}>Type</Text>
                <ChoiceChips options={TYPE_OPTIONS} value={mandateType} onChange={setMandateType} />
                <Text style={styles.label}>Most that may be debited per instalment (₹)</Text>
                <TextInput
                  value={limit}
                  onChangeText={(v) => setLimit(v.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  style={styles.input}
                />
                <Text style={styles.hint}>Set it at or above the SIP amount you plan to invest. It is a ceiling, not the amount debited.</Text>
                <Pressable style={[styles.button, submitting && styles.disabled]} onPress={create} disabled={submitting}>
                  <Text style={styles.buttonText}>{submitting ? 'Setting up…' : 'Set up auto-debit'}</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  page: { padding: 20, paddingBottom: 48, gap: 16 },
  intro: { color: '#4A5568', fontSize: 13, lineHeight: 20 },
  notice: { backgroundColor: '#FFFAF0', borderColor: '#FBD38D', borderWidth: 1, borderRadius: 12, padding: 14 },
  noticeText: { color: '#C05621', fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, gap: 6 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#102A54', fontSize: 16, fontWeight: '800' },
  badge: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  ok: { backgroundColor: '#E6F6EC', color: '#2F7D32' },
  wait: { backgroundColor: '#FFF6E5', color: '#B7791F' },
  bad: { backgroundColor: '#FDECEC', color: '#C53030' },
  meta: { color: '#4A5568', fontSize: 13 },
  label: { color: '#4A5568', fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, height: 50, paddingHorizontal: 14, fontSize: 16, color: '#102A54' },
  hint: { color: '#718096', fontSize: 11, marginTop: 4, lineHeight: 16 },
  button: { backgroundColor: '#3C3985', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
