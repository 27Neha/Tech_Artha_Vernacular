import React, { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../services/api/client';
import { TransactionOtpModal, TransactionPayload } from '../components/TransactionOtpModal';

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
 * Opened with a schemeCode instead of a bucketId, the same form invests in that single
 * fund through /funds/:schemeCode/invest and /sip. The fund's eligibility is fetched
 * first: it may not be buyable at all, and if it is riskier than the investor's profile
 * they must acknowledge that before the order can be placed.
 *
 * A registered SIP collects nothing until an auto-debit mandate (UPI Autopay or e-NACH)
 * is authorised, so the SIP path says that in the confirmation, the warning and the
 * success dialog. It must not read as though money has started moving.
 */
type InvestResult = {
  orderId: string;
  /**
   * Cybrilla's `token_url`: the page where the investor actually pays. A confirmed order
   * is NOT a funded one - no units are allotted until payment succeeds there - so this
   * hand-off is the difference between an order and an investment.
   */
  paymentUrl?: string | null;
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
  /** The first instalment is an ordinary purchase, so it has a payment page too. */
  paymentUrl?: string | null;
  message?: string;
};

/** GET /funds/:schemeCode/invest-eligibility */
type FundEligibility = {
  investable: boolean;
  reason?: string;
  /** Sent in the 2FA challenge; the server resolves the same ISIN when the order runs. */
  schemeIsin?: string;
  fundName?: string;
  fundRiskLevel?: string;
  investorProfile?: string;
  requiresAcknowledgement?: boolean;
};

const riskLabel = (level?: string) =>
  level ? level.charAt(0) + level.slice(1).toLowerCase().replace(/_/g, ' ') : '';

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

  const schemeCode: string | undefined = route.params?.schemeCode ? String(route.params.schemeCode) : undefined;
  const isFund = schemeCode !== undefined;
  const bucketId: string = route.params?.bucketId ?? 'balanced';
  const bucketName: string | undefined = route.params?.bucketName;
  const targetName: string = (isFund ? route.params?.fundName : bucketName) ?? (isFund ? 'This fund' : bucketId);
  const basePath = isFund
    ? `/funds/${encodeURIComponent(schemeCode)}`
    : `/buckets/${encodeURIComponent(bucketId)}`;

  // Fund orders only. Null while loading; the form cannot be submitted until it arrives.
  const [eligibility, setEligibility] = useState<FundEligibility | null>(null);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const fundBlocked = isFund && (!eligibility || !eligibility.investable);

  const [amount, setAmount] = useState('');
  // Not defaulted. Defaulting gender puts an unverified personal attribute onto a
  // KYC-bearing record that the investor never actively chose.
  const [gender, setGender] = useState<Gender | null>(null);
  // Taken from the profile, never typed here: Cybrilla requires the investor's email to
  // have been verified, and a free-text field at order time cannot be. It is null until
  // the profile loads, so the form does not briefly claim an email is missing.
  const [email, setEmail] = useState<string | null>(null);
  const [bankAccountHolderName, setBankAccountHolderName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Purchases and SIPs both need a second factor before any money moves.
  const [pendingAuth, setPendingAuth] = useState<TransactionPayload | null>(null);

  const [mode, setMode] = useState<Mode>('lumpsum');
  const [frequency, setFrequency] = useState(FREQUENCIES[0].value);
  const [installmentDay, setInstallmentDay] = useState<number | null>(null);
  const [numberOfInstallments, setNumberOfInstallments] = useState('');

  // Re-read on every focus so returning from EditProfile after verifying picks the
  // address up without the investor having to restart the order.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      api
        .get<{ email?: string | null }>('/auth/profile')
        .then((data) => {
          if (active) setEmail(data?.email ?? null);
        })
        .catch(() => {
          // Leave the field empty; validate() then sends the investor to EditProfile
          // rather than silently posting the order without an email.
          if (active) setEmail(null);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  // Re-read on focus too: an investor sent off to take the risk assessment comes back
  // to a form that reflects their new profile.
  useFocusEffect(
    useCallback(() => {
      if (!schemeCode) return;
      let active = true;
      api
        .get<FundEligibility>(`/funds/${encodeURIComponent(schemeCode)}/invest-eligibility`)
        .then((data) => {
          if (active) setEligibility(data);
        })
        .catch((e) => {
          if (active) {
            setEligibility({ investable: false, reason: e instanceof Error ? e.message : 'Could not check this fund.' });
          }
        });
      return () => {
        active = false;
      };
    }, [schemeCode]),
  );

  /** Mirrors InvestInBucketDto. One message per field, in form order. */
  const validate = (): string | null => {
    if (isFund) {
      if (!eligibility) return 'Still checking this fund. Try again in a moment.';
      if (!eligibility.investable) return eligibility.reason ?? 'This fund cannot be invested in.';
      if (eligibility.requiresAcknowledgement && !riskAcknowledged) {
        return 'This fund is riskier than your profile. Confirm you understand the risk to continue.';
      }
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value < MIN_AMOUNT) return `Enter an amount of at least ₹${MIN_AMOUNT}.`;
    if (gender === null) return 'Select your gender.';
    if (!email) return 'Verify your email address before investing.';
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
        ? `₹${Number(amount).toLocaleString('en-IN')} ${freqLabel.toLowerCase()} on day ${installmentDay}, for ${numberOfInstallments} instalments, into ${targetName}.\n\nNo money is collected until you authorise an auto-debit mandate.`
        : `₹${Number(amount).toLocaleString('en-IN')} will be invested in ${targetName} as a one-time purchase.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => void submit() },
      ],
    );
  };

  const toPortfolio = () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });

  /**
   * Buttons for an order that can be paid for now. Shared by the lumpsum and SIP paths
   * because both end at the same gateway page - a SIP's first instalment is an ordinary
   * purchase, and only the later ones ride the mandate.
   */
  const paymentActions = (paymentUrl?: string | null) =>
    paymentUrl
      ? [
          {
            text: 'Pay now',
            onPress: async () => {
              try {
                await Linking.openURL(paymentUrl);
              } catch {
                Alert.alert('Could not open the payment page', 'Open it again from your portfolio.');
              }
              toPortfolio();
            },
          },
          { text: 'Later', style: 'cancel' as const, onPress: toPortfolio },
        ]
      : [{ text: 'View portfolio', onPress: toPortfolio }];

  /**
   * Validates, then hands off to the second factor. The figures sent here are the ones
   * the code is issued for, and the same ones sent to the transaction endpoint, so the
   * server's fingerprint check passes only for an unchanged request.
   */
  const submit = () => {
    const problem = validate();
    if (problem) return Alert.alert('Check your details', problem);

    // A bucket fixes its scheme server-side; a single fund is identified by the ISIN the
    // server reported, which it resolves again from the scheme code when the order runs.
    const target = isFund ? { schemeIsin: eligibility?.schemeIsin } : { bucketId };
    setPendingAuth(
      mode === 'sip'
        ? {
            action: 'SIP',
            amount: Number(amount),
            ...target,
            frequency,
            numberOfInstallments: Number(numberOfInstallments),
          }
        : { action: 'PURCHASE', amount: Number(amount), ...target },
    );
  };

  const placeAuthorised = async (auth: { challengeId: string; otp: string }) => {
    setSubmitting(true);
    // Bucket endpoints don't take it, and the server's whitelist would strip it anyway.
    const acknowledgement = isFund ? { acknowledgeRiskMismatch: riskAcknowledged } : {};
    try {
      if (mode === 'sip') {
        const sip = await api.post<SipResult>(`${basePath}/sip`, {
          amount: Number(amount),
          gender,
          email,
          bankAccountHolderName: bankAccountHolderName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          ifscCode: ifscCode.trim(),
          addressLine1: addressLine1.trim(),
          postalCode: postalCode.trim(),
          frequency,
          installmentDay,
          numberOfInstallments: Number(numberOfInstallments),
          ...acknowledgement,
          ...auth,
        });

        // The server registers the plan as PENDING_MANDATE_SETUP and says plainly that
        // nothing is collected yet. Its message is used rather than a cheerier one.
        Alert.alert(
          'SIP registered',
          sip?.message ??
            'Your SIP has been registered. No money has been collected yet - an auto-debit mandate must be authorised before instalments can be collected.',
          paymentActions(sip?.paymentUrl),
        );
        return;
      }

      const result = await api.post<InvestResult>(`${basePath}/invest`, {
        amount: Number(amount),
        gender,
        email,
        bankAccountHolderName: bankAccountHolderName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        ifscCode: ifscCode.trim(),
        addressLine1: addressLine1.trim(),
        postalCode: postalCode.trim(),
        ...acknowledgement,
        ...auth,
      });

      Alert.alert(
        'Order placed',
        // The server's own message states this is one-time rather than a SIP; prefer it.
        `${result?.message ?? 'Your order has been placed.'}\n\nStatus: ${result?.statusLabel ?? result?.status ?? 'Order in progress'}`,
        paymentActions(result?.paymentUrl),
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
        <Text style={styles.subtitle}>{targetName}</Text>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {isFund && eligibility && !eligibility.investable ? (
          <View style={styles.blockedBox}>
            <Text style={styles.blockedTitle}>This fund can&apos;t be invested in</Text>
            <Text style={styles.blockedText}>{eligibility.reason}</Text>
          </View>
        ) : null}

        {isFund && eligibility?.investable && eligibility.requiresAcknowledgement ? (
          <View style={styles.riskBox}>
            <Text style={styles.riskTitle}>Riskier than your profile</Text>
            <Text style={styles.riskText}>
              We estimate this fund&apos;s risk as {riskLabel(eligibility.fundRiskLevel)}, above your assessed{' '}
              {riskLabel(eligibility.investorProfile)} profile. Its value can fall further and stay down longer
              than you indicated you are comfortable with.
            </Text>
            <Pressable
              style={styles.ackRow}
              onPress={() => setRiskAcknowledged((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: riskAcknowledged }}
            >
              <View style={[styles.checkbox, riskAcknowledged && styles.checkboxChecked]}>
                {riskAcknowledged ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.ackText}>I understand this fund is riskier than my profile and want to invest anyway.</Text>
            </Pressable>
          </View>
        ) : null}

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
        {email ? (
          <>
            <View style={styles.readonly}>
              <Text style={styles.readonlyText}>{email}</Text>
            </View>
            <Text style={styles.hint}>
              Your verified email address. Order confirmations and statements are sent here.
            </Text>
          </>
        ) : (
          <>
            <View style={styles.readonly}>
              <Text style={styles.readonlyMuted}>No verified email address</Text>
            </View>
            <Pressable style={styles.verifyButton} onPress={() => navigation.navigate('EditProfile')}>
              <Text style={styles.verifyButtonText}>Verify my email</Text>
            </Pressable>
            <Text style={styles.hint}>
              We can only place an order once your email address is verified, because the AMC
              sends your confirmations and statements to it.
            </Text>
          </>
        )}

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
          style={[styles.button, (submitting || fundBlocked) && styles.buttonDisabled]}
          onPress={confirmAndInvest}
          disabled={submitting || fundBlocked}
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
      <TransactionOtpModal
        visible={pendingAuth !== null}
        payload={pendingAuth}
        onCancel={() => setPendingAuth(null)}
        onAuthorised={(auth) => {
          setPendingAuth(null);
          void placeAuthorised(auth);
        }}
      />
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
  readonly: { backgroundColor: '#EDF2F7', borderRadius: 12, minHeight: 52, paddingHorizontal: 16, justifyContent: 'center' },
  readonlyText: { color: '#102A54', fontSize: 15, fontWeight: '600' },
  readonlyMuted: { color: '#718096', fontSize: 15, fontStyle: 'italic' },
  verifyButton: { backgroundColor: '#3C3985', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  verifyButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  genderChip: { flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  genderChipSelected: { backgroundColor: '#3C3985', borderColor: '#3C3985' },
  genderText: { color: '#4A5568', fontWeight: '700', fontSize: 13 },
  genderTextSelected: { color: 'white', fontWeight: '700', fontSize: 13 },
  blockedBox: { backgroundColor: '#FFF5F5', padding: 16, borderRadius: 12, borderColor: '#FEB2B2', borderWidth: 1, marginBottom: 12 },
  blockedTitle: { color: '#C53030', fontWeight: '800', fontSize: 14 },
  blockedText: { color: '#C53030', fontSize: 12, marginTop: 4, lineHeight: 18 },
  riskBox: { backgroundColor: '#FFFAF0', borderLeftWidth: 4, borderLeftColor: '#F7941E', padding: 16, borderRadius: 8, marginBottom: 12 },
  riskTitle: { color: '#C05621', fontWeight: '800', fontSize: 14 },
  riskText: { color: '#C05621', fontSize: 12, marginTop: 4, lineHeight: 18 },
  ackRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#C05621', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  checkboxChecked: { backgroundColor: '#C05621' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  ackText: { flex: 1, color: '#102A54', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  warningBox: { backgroundColor: '#FFFAF0', padding: 16, borderRadius: 12, borderColor: '#FBD38D', borderWidth: 1, marginTop: 28 },
  warningText: { color: '#C05621', fontSize: 12, lineHeight: 18 },
  button: { backgroundColor: '#3C3985', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20, marginBottom: 12 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  outlineButton: { padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#3C3985', marginBottom: 40 },
  outlineText: { color: '#3C3985', fontSize: 16, fontWeight: '700' },
});
