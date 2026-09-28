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
 * The endpoint places a ONE-TIME lumpsum. Recurring SIP auto-debit is not implemented
 * server-side (BucketsService.invest, "mandate request schema isn't confirmed"), so
 * nothing on this screen may promise a SIP.
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

type Gender = 'male' | 'female' | 'transgender';

const GENDERS: Gender[] = ['male', 'female', 'transgender'];

const MIN_AMOUNT = 100;

export const InvestScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const bucketId: string = route.params?.bucketId ?? 'balanced';
  const bucketName: string | undefined = route.params?.bucketName;

  const [amount, setAmount] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [email, setEmail] = useState('');
  const [bankAccountHolderName, setBankAccountHolderName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** Mirrors InvestInBucketDto. One message per field, in form order. */
  const validate = (): string | null => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < MIN_AMOUNT) return `Enter an amount of at least ₹${MIN_AMOUNT}.`;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
    if (bankAccountHolderName.trim().length < 3) return "Enter the bank account holder's full name.";
    if (bankAccountNumber.trim().length < 5) return 'Enter a valid bank account number.';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) return 'Enter a valid 11-character IFSC code, for example HDFC0000001.';
    if (addressLine1.trim().length < 3) return 'Enter your address.';
    if (!/^\d{6}$/.test(postalCode)) return 'Enter a valid 6-digit PIN code.';
    return null;
  };

  const confirmAndInvest = () => {
    const problem = validate();
    if (problem) return Alert.alert('Check your details', problem);

    // Real money leaves the account here, so the amount and destination are restated
    // before anything is sent.
    Alert.alert(
      'Confirm your investment',
      `₹${Number(amount).toLocaleString('en-IN')} will be invested in ${bucketName ?? bucketId} as a one-time purchase.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => void submit() },
      ],
    );
  };

  const submit = async () => {
    setSubmitting(true);
    try {
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
      Alert.alert('Could not place your order', error instanceof Error ? error.message : 'Please try again.');
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
        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          placeholder="5000"
          style={styles.input}
        />

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
            This places a one-time purchase order. It is not a recurring SIP. Mutual fund investments are
            subject to market risks; read all scheme related documents carefully.
          </Text>
        </View>

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={confirmAndInvest}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>{submitting ? 'Placing order…' : 'Review and invest'}</Text>
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
  genderRow: { flexDirection: 'row', gap: 8 },
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
