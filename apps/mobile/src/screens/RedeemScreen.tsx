import React, { useCallback, useState } from 'react';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../services/api/client';
import { Header } from '../components/Header';
import { TransactionAuth, TransactionOtpModal, TransactionPayload } from '../components/TransactionOtpModal';

/**
 * Withdrawing money - Cybrilla compliance points 6 and 9.
 *
 * Holdings are whatever GET /redemptions/holdings returns, which is the gateway's folio
 * list. Nothing is fabricated: with no allotted purchase the screen says so plainly
 * rather than showing an example holding, because a screen that invents a balance in a
 * withdrawal flow is telling someone they have money they do not have.
 */
type Holding = {
  folioNumber: string;
  schemeIsin: string;
  schemeName: string | null;
  units: number;
  redeemableUnits: number;
  /** Value of the redeemable units at the latest NAV, from Cybrilla's holdings report. */
  redeemableValue: number | null;
  nav: number | null;
  navDate: string | null;
};

type HoldingsResponse = {
  holdings: Holding[];
  canRedeem: boolean;
  message: string;
};

type Mode = 'amount' | 'units' | 'full';

export const RedeemScreen = () => {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HoldingsResponse | null>(null);
  const [selected, setSelected] = useState<Holding | null>(null);
  const [mode, setMode] = useState<Mode>('amount');
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Set when the investor confirms the alert; opening the modal issues the code.
  const [pendingAuth, setPendingAuth] = useState<TransactionPayload | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.get<HoldingsResponse>('/redemptions/holdings'));
    } catch (e) {
      Alert.alert('Could not load your holdings', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const submit = async () => {
    if (!selected) return;

    const numeric = Number(value);
    if (mode !== 'full') {
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return Alert.alert('Check the figure', mode === 'amount' ? 'Enter the amount to withdraw.' : 'Enter the number of units to sell.');
      }
      if (mode === 'units' && numeric > selected.redeemableUnits) {
        return Alert.alert('Too many units', `You hold ${selected.redeemableUnits} redeemable units in this folio.`);
      }
    }

    // Spelled out rather than a bare "Confirm?": selling units is irreversible once the
    // AMC processes it, and the settlement delay is the part people do not expect.
    const description =
      mode === 'full'
        ? 'your entire holding in this folio'
        : mode === 'amount'
          ? `₹${numeric}`
          : `${numeric} units`;

    Alert.alert(
      'Confirm withdrawal',
      `Withdraw ${description}?\n\nThis cannot be undone once the AMC processes it. Settlement usually takes 2-4 working days and the money goes to your registered bank account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          // Selling units requires a second factor, so this opens the authorisation
          // step rather than placing the order.
          onPress: () =>
            setPendingAuth({
              action: 'REDEMPTION',
              folioNumber: selected.folioNumber,
              schemeIsin: selected.schemeIsin,
              ...(mode === 'full' ? { fullExit: true } : mode === 'amount' ? { amount: numeric } : { units: numeric }),
            }),
        },
      ],
    );
  };

  /**
   * Runs once the code is accepted. The payload is sent exactly as it was authorised -
   * the server re-fingerprints it, so any difference is refused rather than executed.
   */
  const placeAuthorised = async (auth: TransactionAuth) => {
    const payload = pendingAuth;
    setPendingAuth(null);
    if (!payload) return;

    setSubmitting(true);
    try {
      const result = await api.post<{ status: string; message: string }>('/redemptions', {
        ...payload,
        ...auth,
      });
      Alert.alert('Withdrawal placed', result?.message ?? 'Your withdrawal has been placed.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Withdrawal failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
        <Header title="Withdraw" />
        <ActivityIndicator style={{ marginTop: 40 }} color="#3C3985" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="Withdraw" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Withdraw money</Text>
        <Text style={styles.sub}>{data?.message}</Text>

        {!data?.canRedeem ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nothing to withdraw yet</Text>
            <Text style={styles.emptyText}>
              Units appear here once the AMC has allotted a purchase. Until then there is nothing to sell.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Choose a holding</Text>
            {data.holdings.map((holding) => {
              const isSelected = selected?.folioNumber === holding.folioNumber && selected?.schemeIsin === holding.schemeIsin;
              return (
                <Pressable
                  key={`${holding.folioNumber}:${holding.schemeIsin}`}
                  style={[styles.holdingCard, isSelected && styles.holdingSelected]}
                  onPress={() => setSelected(holding)}
                >
                  <Text style={styles.holdingName}>{holding.schemeName ?? holding.schemeIsin}</Text>
                  <Text style={styles.holdingMeta}>Folio {holding.folioNumber}</Text>
                  {/* Folio, scheme, units and balance are all on the card (compliance point 9). */}
                  <Text style={styles.holdingMeta}>
                    {holding.redeemableUnits.toFixed(3)} of {holding.units.toFixed(3)} units redeemable
                  </Text>
                  <Text style={styles.holdingMeta}>
                    Available balance:{' '}
                    {holding.redeemableValue != null
                      ? `₹${holding.redeemableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : 'not yet valued'}
                    {holding.nav != null ? ` (NAV ₹${holding.nav.toFixed(4)}${holding.navDate ? ` on ${holding.navDate}` : ''})` : ''}
                  </Text>
                </Pressable>
              );
            })}

            {selected ? (
              <>
                <Text style={styles.label}>How much?</Text>
                <View style={styles.modeRow}>
                  {(['amount', 'units', 'full'] as Mode[]).map((option) => (
                    <Pressable
                      key={option}
                      style={[styles.modeBtn, mode === option && styles.modeBtnOn]}
                      onPress={() => {
                        setMode(option);
                        setValue('');
                      }}
                    >
                      <Text style={[styles.modeText, mode === option && styles.modeTextOn]}>
                        {option === 'amount' ? 'By amount' : option === 'units' ? 'By units' : 'Everything'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {mode !== 'full' ? (
                  <TextInput
                    value={value}
                    onChangeText={setValue}
                    keyboardType="decimal-pad"
                    placeholder={mode === 'amount' ? 'Amount in ₹' : 'Number of units'}
                    placeholderTextColor="#A0AEC0"
                    style={styles.input}
                  />
                ) : (
                  <Text style={styles.hint}>
                    Sells all {selected.redeemableUnits} redeemable units in this folio. The exact unit count is
                    taken from your holding at the time the order is placed.
                  </Text>
                )}

                <Pressable
                  style={[styles.button, submitting && styles.disabled]}
                  onPress={submit}
                  disabled={submitting}
                >
                  <Text style={styles.buttonText}>{submitting ? 'Placing…' : 'Review withdrawal'}</Text>
                </Pressable>
              </>
            ) : null}
          </>
        )}

        <Text style={styles.disclaimer}>
          Redemption proceeds are credited only to your own registered bank account. The amount you receive
          depends on the NAV applicable when the AMC processes the request, which may differ from the value
          shown here. Exit load and taxes, where applicable, are deducted by the AMC.
        </Text>
      </ScrollView>

      <TransactionOtpModal
        visible={pendingAuth !== null}
        payload={pendingAuth}
        onCancel={() => setPendingAuth(null)}
        onAuthorised={placeAuthorised}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  content: { padding: 20, paddingBottom: 48 },
  title: { color: '#102A54', fontSize: 22, fontWeight: '800' },
  sub: { color: '#4A5568', fontSize: 13, marginTop: 6, lineHeight: 19 },
  label: { fontSize: 13, color: '#4A5568', fontWeight: '700', marginTop: 24, marginBottom: 8 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginTop: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyTitle: { color: '#102A54', fontSize: 15, fontWeight: '800' },
  emptyText: { color: '#4A5568', fontSize: 13, lineHeight: 19, marginTop: 6 },
  holdingCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: '#E2E8F0' },
  holdingSelected: { borderColor: '#3C3985', backgroundColor: '#EBEAF8' },
  holdingName: { color: '#102A54', fontSize: 15, fontWeight: '700' },
  holdingMeta: { color: '#718096', fontSize: 12, marginTop: 4 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff', alignItems: 'center' },
  modeBtnOn: { backgroundColor: '#3C3985', borderColor: '#3C3985' },
  modeText: { color: '#4A5568', fontSize: 13, fontWeight: '700' },
  modeTextOn: { color: '#fff' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 16, color: '#102A54', marginTop: 12 },
  hint: { color: '#718096', fontSize: 12, lineHeight: 18, marginTop: 12 },
  button: { backgroundColor: '#3C3985', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  disclaimer: { color: '#A0AEC0', fontSize: 11, lineHeight: 17, marginTop: 28 },
});
