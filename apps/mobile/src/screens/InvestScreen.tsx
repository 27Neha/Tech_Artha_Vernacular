import React, { useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../services/api/client';

/**
 * POST /buckets/:bucketId/invest - places a REAL order through Cybrilla.
 *
 * Mirrors the web form in apps/web/app/buckets/page.tsx field for field, because both
 * post the same InvestInBucketDto. Validation here duplicates the DTO's class-validator
 * rules so the user is told what is wrong before a round trip, not after.
 *
 * Two modes:
 *   lumpsum -> POST /buckets/:id/invest  (one-time purchase, placed immediately)
 *   sip     -> POST /buckets/:id/sip     (recurring plan via /v2/mf_purchase_plans)
 *
 * A registered SIP collects nothing until an auto-debit mandate (UPI Autopay or e-NACH)
 * is authorised, so the SIP path says that in the confirmation, the warning and the
 * success dialog. It must not read as though money has started moving.
 */
type InvestResult = {
  orderId: string;
  fundName?: string;
  schemeIsin?: string;
  amount: number;
  status: string;
  statusLabel?: string;
  message?: string;
};

type SipResult = {
  planId: string;
  fundName?: string;
  amount: number;
  frequency: string;
  installmentDay: number;
  status: string;
  statusLabel?: string;
  mandateRequired?: boolean;
  message?: string;
};

type Gender = 'male' | 'female' | 'transgender';

type Mode = 'lumpsum' | 'sip';

/**
 * The gateway accepts ten frequencies, but support is per-scheme - sending an
 * unsupported one returns "scheme: selected frequency is not supported". Only the two
 * standard SIP cadences are offered; the rest are available on the API if needed.
 */
const FREQUENCIES: { value: string; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

/** Cybrilla rejects an instalment day of 29-31, so the picker stops at 28. */
const INSTALLMENT_DAYS = [1, 5, 10, 15, 20, 25, 28];

const GENDERS: Gender[] = ['male', 'female', 'transgender'];

const MIN_AMOUNT = 100;

export const InvestScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const bucketId: string = route.params?.bucketId ?? 'balanced';
  const bucketName: string | undefined = route.params?.bucketName;

  const [amount, setAmount] = useState('');
  // Not defaulted. Defaulting gender puts an unverified personal attribute onto a
  // KYC-bearing record that the investor never actively chose.
  const [gender, setGender] = useState<Gender | null>(null);
  const [email, setEmail] = useState('');
  const [bankAccountHolderName, setBankAccountHolderName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [mode, setMode] = useState<Mode>('lumpsum');
  const [frequency, setFrequency] = useState(FREQUENCIES[0].value);
  const [installmentDay, setInstallmentDay] = useState<number | null>(null);
  const [numberOfInstallments, setNumberOfInstallments] = useState('');

  /** Mirrors InvestInBucketDto. One message per field, in form order. */
  const validate = (): string | null => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < MIN_AMOUNT) return `Enter an amount of at least ₹${MIN_AMOUNT}.`;
    if (gender === null) return 'Select your gender.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
    if (bankAccountHolderName.trim().length < 3) return "Enter the bank account holder's full name.";
    if (bankAccountNumber.trim().length < 5) return 'Enter a valid bank account number.';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) return 'Enter a valid 11-character IFSC code, for example HDFC0000001.';
    if (addressLine1.trim().length < 3) return 'Enter your address.';
    if (!/^\d{6}$/.test(postalCode)) return 'Enter a valid 6-digit PIN code.';
    if (mode === 'sip') {
      if (installmentDay === null) return 'Choose the day of the month for your instalment.';
      const installments = Number(numberOfInstallments);
      if (!Number.isInteger(installments) || installments < 1) {
        return 'Enter how many instalments this SIP should run for.';
      }
    }
    return null;
  };

  const confirmAndInvest = () => {
    const problem = validate();
    if (problem) return Alert.alert('Check your details', problem);

    // Real money leaves the account here, so the amount and destination are restated
    // before anything is sent.
    const freqLabel = FREQUENCIES.find((f) => f.value === frequency)?.label ?? frequency;
    Alert.alert(
      mode === 'sip' ? 'Confirm your SIP' : 'Confirm your investment',
      mode === 'sip'
        ? `₹${Number(amount).toLocaleString('en-IN')} ${freqLabel.toLowerCase()} on day ${installmentDay}, for ${numberOfInstallments} instalments, into ${bucketName ?? bucketId}.\n\nNo money is collected until you authorise an auto-debit mandate.`
        : `₹${Number(amount).toLocaleString('en-IN')} will be invested in ${bucketName ?? bucketId} as a one-time purchase.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => void submit() },
      ],
    );
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      if (mode === 'sip') {
        const sip = await api.post<SipResult>(`/buckets/${encodeURIComponent(bucketId)}/sip`, {
          amount: Number(amount),
          gender,
          email: email.trim(),
          bankAccountHolderName: bankAccountHolderName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          ifscCode: ifscCode.trim(),
          addressLine1: addressLine1.trim(),
          postalCode: postalCode.trim(),
          frequency,
          installmentDay,
          numberOfInstallments: Number(numberOfInstallments),
        });

        // The server registers the plan as PENDING_MANDATE_SETUP and says plainly that
        // nothing is collected yet. Its message is used rather than a cheerier one.
        Alert.alert(
          'SIP registered',
          sip?.message ??
            'Your SIP has been registered. No money has been collected yet - an auto-debit mandate must be authorised before the first instalment.',
          [{ text: 'View portfolio', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] }) }],
        );
        return;
      }

      const result = await api.post<InvestResult>(`/buckets/${encodeURIComponent(bucketId)}/invest`, {
        amount: Number(amount),
        gender,
        email: email.trim(),
        bankAccountHolderName: bankAccountHolderName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        ifscCode: ifscCode.trim(),
        addressLine1: addressLine1.trim(),
        postalCode: postalCode.trim(),
      });

      Alert.alert(
        'Order placed',
        // The server's own message states this is one-time rather than a SIP; prefer it.
        `${result?.message ?? 'Your order has been placed.'}\n\nStatus: ${result?.statusLabel ?? result?.status ?? 'Order in progress'}`,
        [{ text: 'View portfolio', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] }) }],
      );
    } catch (error) {
      // BucketsService rejects before reaching Cybrilla when KYC or the risk profile is
      // incomplete; those messages are actionable, so they are shown as-is.
      Alert.alert(
        mode === 'sip' ? 'Could not register your SIP' : 'Could not place your order',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Invest</Text>
        <Text style={styles.subtitle}>{bucketName ?? bucketId}</Text>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.modeRow}>
          {([
            { value: 'lumpsum', label: 'One-time' },
            { value: 'sip', label: 'Monthly SIP' },
          ] as const).map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setMode(option.value)}
              style={[styles.modeChip, mode === option.value && styles.modeChipSelected]}
            >
              <Text style={mode === option.value ? styles.modeTextSelected : styles.modeText}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{mode === 'sip' ? 'Amount per instalment (₹)' : 'Amount (₹)'}</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          placeholder="5000"
          style={styles.input}
        />

        {mode === 'sip' ? (
          <>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.genderRow}>
              {FREQUENCIES.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setFrequency(option.value)}
                  style={[styles.genderChip, frequency === option.value && styles.genderChipSelected]}
                >
                  <Text style={frequency === option.value ? styles.genderTextSelected : styles.genderText}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Instalment day</Text>
            <View style={styles.dayRow}>
              {INSTALLMENT_DAYS.map((day) => (
                <Pressable
                  key={day}
                  onPress={() => setInstallmentDay(day)}
                  style={[styles.dayChip, installmentDay === day && styles.dayChipSelected]}
                >
                  <Text style={installmentDay === day ? styles.dayTextSelected : styles.dayText}>{day}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.hint}>Instalments are collected on this day of the month.</Text>

            <Text style={styles.label}>Number of instalments</Text>
            <TextInput
              value={numberOfInstallments}
              onChangeText={(v) => setNumberOfInstallments(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={3}
              style={styles.input}
            />
          </>
        ) : null}

        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderRow}>
          {GENDERS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setGender(option)}
              style={[styles.genderChip, gender === option && styles.genderChipSelected]}
            >
              <Text style={gender === option ? styles.genderTextSelected : styles.genderText}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="you@example.com"
          style={styles.input}
        />

        <Text style={styles.sectionTitle}>Bank account</Text>
        <Text style={styles.label}>Account holder name</Text>
        <TextInput
          value={bankAccountHolderName}
          onChangeText={setBankAccountHolderName}
          autoCapitalize="words"
          style={styles.input}
        />

        <Text style={styles.label}>Account number</Text>
        <TextInput
          value={bankAccountNumber}
          onChangeText={setBankAccountNumber}
          keyboardType="number-pad"
          style={styles.input}
        />

        <Text style={styles.label}>IFSC code</Text>
        <TextInput
          value={ifscCode}
          onChangeText={(value) => setIfscCode(value.toUpperCase())}
          autoCapitalize="characters"
          maxLength={11}
          placeholder="HDFC0000001"
          style={styles.input}
        />

        <Text style={styles.sectionTitle}>Address</Text>
        <Text style={styles.label}>Address line 1</Text>
        <TextInput value={addressLine1} onChangeText={setAddressLine1} style={styles.input} />

        <Text style={styles.label}>PIN code</Text>
        <TextInput
          value={postalCode}
          onChangeText={(value) => setPostalCode(value.replace(/\D/g, ''))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="400001"
          style={styles.input}
        />

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {mode === 'sip'
              ? 'Registering a SIP does not collect money. An auto-debit mandate (UPI Autopay or e-NACH) must be authorised before the first instalment is taken. '
              : 'This places a one-time purchase order. It is not a recurring SIP. '}
            Mutual fund investments are subject to market risks; read all scheme related documents carefully.
          </Text>
        </View>

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={confirmAndInvest}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting
              ? mode === 'sip'
                ? 'Registering…'
                : 'Placing order…'
              : mode === 'sip'
                ? 'Review and start SIP'
                : 'Review and invest'}
          </Text>
        </Pressable>
        <Pressable style={styles.outlineButton} onPress={() => navigation.goBack()}>
          <Text style={styles.outlineText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 16 },
  headerTitle: { color: '#102A54', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#4A5568', fontSize: 14, marginTop: 4 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#102A54', marginTop: 24, marginBottom: 4 },
  label: { fontSize: 13, color: '#4A5568', fontWeight: '600', marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 16, color: '#102A54' },
  genderRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  modeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  modeChip: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modeChipSelected: { backgroundColor: '#3C3985', borderColor: '#3C3985' },
  modeText: { color: '#4A5568', fontWeight: '700', fontSize: 14 },
  modeTextSelected: { color: '#fff', fontWeight: '700', fontSize: 14 },
  dayRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dayChip: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  dayChipSelected: { backgroundColor: '#3C3985', borderColor: '#3C3985' },
  dayText: { color: '#4A5568', fontWeight: '600', fontSize: 14 },
  dayTextSelected: { color: '#fff', fontWeight: '700', fontSize: 14 },
  hint: { color: '#718096', fontSize: 11, marginTop: 6 },
  genderChip: { flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  genderChipSelected: { backgroundColor: '#3C3985', borderColor: '#3C3985' },
  genderText: { color: '#4A5568', fontWeight: '700', fontSize: 13 },
  genderTextSelected: { color: 'white', fontWeight: '700', fontSize: 13 },
  warningBox: { backgroundColor: '#FFFAF0', padding: 16, borderRadius: 12, borderColor: '#FBD38D', borderWidth: 1, marginTop: 28 },
  warningText: { color: '#C05621', fontSize: 12, lineHeight: 18 },
  button: { backgroundColor: '#3C3985', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20, marginBottom: 12 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  outlineButton: { padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#3C3985', marginBottom: 40 },
  outlineText: { color: '#3C3985', fontSize: 16, fontWeight: '700' },
});
