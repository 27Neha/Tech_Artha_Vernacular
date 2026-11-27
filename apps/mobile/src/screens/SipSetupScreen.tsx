import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { api, sanitizeNetworkError } from '../services/api/client';
import { TransactionOtpModal, TransactionPayload, TransactionAuth } from '../components/TransactionOtpModal';

type Holding = {
  folioNumber: string;
  schemeIsin: string;
  schemeName: string | null;
  units: number;
  redeemableUnits: number;
  nav: number | null;
  navDate: string | null;
  marketValue: number | null;
  investedValue: number | null;
};

type BankAccount = {
  id: string;
  bankName: string;
  maskedNumber: string;
  ifscCode: string;
  accountType: string;
  holderName: string;
  isPrimary?: boolean;
};

const QUICK_SIP_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const POPULAR_DAYS = [5, 10, 15, 20, 25];
const DURATIONS = [
  { label: 'Until Cancelled (Recommended)', value: 0 },
  { label: '3 Years (36 Installments)', value: 36 },
  { label: '5 Years (60 Installments)', value: 60 },
  { label: '1 Year (12 Installments)', value: 12 },
];

const rupees = (v: number | null | undefined, digits = 0) =>
  v == null ? '—' : `₹${v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const SipSetupScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();

  const holding: Holding | undefined = route.params?.holding;
  const fundName = holding?.schemeName || route.params?.fundName || 'Mutual Fund Scheme';
  const schemeIsin = holding?.schemeIsin || route.params?.schemeIsin || 'INF109K01605';
  const folioNumber = holding?.folioNumber || route.params?.folioNumber || 'FOLIO-EXISTING';

  // Steps: 1: SIP Config | 2: Bank & Mandate | 3: Summary | 4: Confirmation
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: SIP Configuration
  const [amount, setAmount] = useState<string>('1000');
  const [amountError, setAmountError] = useState<string>('');
  const [installmentDay, setInstallmentDay] = useState<number>(10);
  const [durationMonths, setDurationMonths] = useState<number>(0);
  const minSipAmount = 500;

  // Step 2: Bank & Mandate
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(true);
  const [mandateLimit, setMandateLimit] = useState<number | null>(null);

  // Step 4: Submission & Confirmation
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [sipResult, setSipResult] = useState<{
    planId?: string;
    status: string;
    statusLabel?: string;
    amount: number;
    installmentDay: number;
    mandateStatus: 'APPROVED' | 'PENDING' | 'NOT_FOUND';
    paymentUrl?: string | null;
    message?: string;
  } | null>(null);

  // 2FA Auth State
  const [pendingAuth, setPendingAuth] = useState<TransactionPayload | null>(null);

  const loadBankAndMandate = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const gwStatus = await api.get<{
        hasInvestmentAccount: boolean;
        approvedMandateLimit: number | null;
        bankAccount?: any;
      }>('/buckets/account-status').catch(() => null);

      if (gwStatus?.approvedMandateLimit != null) {
        setMandateLimit(gwStatus.approvedMandateLimit);
      } else {
        setMandateLimit(15000); // Demo approved mandate standard
      }

      const localRaw = await AsyncStorage.getItem('techartha_bank_accounts').catch(() => null);
      let list: BankAccount[] = localRaw ? JSON.parse(localRaw) : [];

      if (gwStatus?.bankAccount) {
        const gw = gwStatus.bankAccount;
        const exists = list.some((a) => a.maskedNumber === gw.maskedNumber || a.ifscCode === gw.ifscCode);
        if (!exists) {
          list.unshift({
            id: 'gw-primary',
            holderName: gw.holderName || 'Account Holder',
            bankName: 'Verified Bank',
            maskedNumber: gw.maskedNumber || '•••• •••• •••• 1234',
            ifscCode: gw.ifscCode || 'HDFC0001234',
            accountType: gw.type || 'Savings',
            isPrimary: true,
          });
        }
      }

      if (list.length === 0) {
        list.push({
          id: 'acc-default',
          bankName: 'HDFC Bank Ltd',
          maskedNumber: '•••• •••• •••• 4092',
          ifscCode: 'HDFC0000060',
          accountType: 'Savings',
          holderName: 'Registered Investor',
          isPrimary: true,
        });
      }

      setAccounts(list);
      const primary = list.find((a) => a.isPrimary) || list[0];
      if (primary) setSelectedAccountId(primary.id);
    } catch {
      // Keep list
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    loadBankAndMandate();
  }, [loadBankAndMandate]);

  const selectedBank = accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  const numericAmount = Number(amount) || 0;
  const hasSufficientMandate = mandateLimit != null && mandateLimit >= numericAmount;

  const handleStep1Next = () => {
    setAmountError('');
    if (!numericAmount || numericAmount < minSipAmount) {
      setAmountError(`Minimum monthly SIP amount is ${rupees(minSipAmount)}.`);
      return;
    }
    if (installmentDay < 1 || installmentDay > 28) {
      setAmountError('Please choose an installment day between 1 and 28.');
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    if (!selectedBank) {
      Alert.alert('Select Bank Account', 'Please choose a bank account to link this SIP.');
      return;
    }
    setStep(3);
  };

  const handleTriggerSubmission = () => {
    setPendingAuth({
      action: 'SIP',
      amount: numericAmount,
      frequency: 'MONTHLY',
      schemeIsin: holding?.schemeIsin,
      folioNumber: holding?.folioNumber,
      channel: 'EMAIL',
    });
  };

  const handleAuthorised = async (auth: TransactionAuth) => {
    setPendingAuth(null);
    setSubmitting(true);
    setStep(4);

    try {
      const bucketId = 'balanced';
      const payload = {
        amount: numericAmount,
        installmentDay,
        frequency: 'monthly',
        durationMonths: durationMonths > 0 ? durationMonths : undefined,
        consent: true,
        transactionConsent: true,
        challengeId: auth.challengeId,
        otp: auth.otp,
        isin: schemeIsin,
        fundName,
        folioNumber: folioNumber !== 'FOLIO-EXISTING' ? folioNumber : undefined,
      };

      const res = await api.post<{
        planId?: string;
        id?: string;
        status?: string;
        statusLabel?: string;
        paymentUrl?: string | null;
        token_url?: string | null;
        message?: string;
      }>(`/buckets/${bucketId}/sip`, payload);

      const isMandateApproved = hasSufficientMandate;

      setSipResult({
        planId: res.planId || res.id || `SIP-${Date.now().toString().slice(-6)}`,
        status: res.status || (isMandateApproved ? 'ACTIVE' : 'PENDING_MANDATE'),
        statusLabel: isMandateApproved ? 'SIP Registered & Active' : 'SIP Created (Mandate Approval Pending)',
        amount: numericAmount,
        installmentDay,
        mandateStatus: isMandateApproved ? 'APPROVED' : 'PENDING',
        paymentUrl: res.paymentUrl || res.token_url || null,
        message: isMandateApproved
          ? `Your SIP of ${rupees(numericAmount)} on the ${installmentDay}th of each month is confirmed.`
          : `SIP plan created. Autopay mandate authorization is pending with your bank.`,
      });
    } catch (e: any) {
      setSipResult({
        planId: `ERR-${Date.now().toString().slice(-4)}`,
        status: 'FAILED',
        statusLabel: 'SIP Registration Failed',
        amount: numericAmount,
        installmentDay,
        mandateStatus: 'NOT_FOUND',
        paymentUrl: null,
        message: sanitizeNetworkError(e) || 'Failed to register recurring SIP with the fund house.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleHeaderBack = () => {
    if (step > 1 && step < 4) {
      setStep((step - 1) as any);
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <StatusBar style="dark" />
      <Header
        title="Start Monthly SIP"
        onBack={handleHeaderBack}
        showSettings={false}
        showNotifications={false}
      />

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${(step / 4) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step Badge & Title */}
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP {step} OF 4</Text>
            </View>
            <Text style={styles.stepTitle}>
              {step === 1 && 'SIP Configuration'}
              {step === 2 && 'Bank & Mandate Verification'}
              {step === 3 && 'SIP Summary'}
              {step === 4 && 'Registration Confirmation'}
            </Text>
          </View>

          {/* Scheme Card Banner */}
          <View style={[styles.fundBannerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.fundIconCircle, { backgroundColor: '#FFF4E8' }]}>
              <Ionicons name="repeat" size={22} color="#DD6B20" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.fundBannerTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {fundName}
              </Text>
              <View style={styles.fundMetaRow}>
                <Text style={styles.fundMetaText}>Folio: {folioNumber}</Text>
                <Text style={styles.fundMetaDot}>•</Text>
                <Text style={styles.fundMetaText}>Frequency: Monthly</Text>
              </View>
            </View>
          </View>

          {/* ========================================================= */}
          {/* SCREEN 1: SIP CONFIGURATION                               */}
          {/* ========================================================= */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              {/* Monthly Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                  Monthly SIP Amount (₹) *
                </Text>
                <View style={[styles.amountInputWrap, !!amountError && styles.inputError]}>
                  <Text style={styles.rupeeSymbol}>₹</Text>
                  <TextInput
                    value={amount}
                    onChangeText={(val) => {
                      const clean = val.replace(/[^0-9]/g, '');
                      setAmount(clean);
                      if (amountError) setAmountError('');
                    }}
                    placeholder="1000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    style={[styles.amountInput, { color: colors.textPrimary }]}
                    autoFocus={true}
                  />
                  <Text style={styles.perMonthSuffix}>/ month</Text>
                </View>
                {amountError ? <Text style={styles.errorText}>⚠️ {amountError}</Text> : null}
                <Text style={styles.minAmountHint}>Minimum systematic investment: {rupees(minSipAmount)}/mo.</Text>
              </View>

              {/* Quick Amount Suggestion Chips */}
              <Text style={styles.quickChipsLabel}>Quick Select Monthly SIP:</Text>
              <View style={styles.chipsWrap}>
                {QUICK_SIP_AMOUNTS.map((chip) => {
                  const isSelected = numericAmount === chip;
                  return (
                    <Pressable
                      key={chip}
                      style={[
                        styles.amountChip,
                        isSelected && styles.amountChipActive,
                        { borderColor: isSelected ? '#36358D' : colors.border },
                      ]}
                      onPress={() => {
                        setAmount(String(chip));
                        if (amountError) setAmountError('');
                      }}
                    >
                      <Text style={[styles.amountChipText, isSelected && styles.amountChipTextActive]}>
                        {rupees(chip)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Installment Date Picker */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                  Monthly Debit Date ({installmentDay}th of each month) *
                </Text>
                <Text style={styles.subHint}>
                  Autopay will debit your account on this day each month. If a holiday, debit occurs on the next business day.
                </Text>

                <View style={styles.daysRow}>
                  {POPULAR_DAYS.map((day) => {
                    const isSelected = installmentDay === day;
                    return (
                      <Pressable
                        key={day}
                        style={[
                          styles.dayBox,
                          isSelected && styles.dayBoxActive,
                          { borderColor: isSelected ? '#36358D' : colors.border },
                        ]}
                        onPress={() => setInstallmentDay(day)}
                      >
                        <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{day}th</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Duration Options */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>SIP Duration</Text>
                {DURATIONS.map((dur) => {
                  const isSelected = durationMonths === dur.value;
                  return (
                    <Pressable
                      key={dur.value}
                      style={[
                        styles.durationOptionCard,
                        isSelected && styles.durationOptionCardActive,
                        { backgroundColor: colors.surface, borderColor: isSelected ? '#36358D' : colors.border },
                      ]}
                      onPress={() => setDurationMonths(dur.value)}
                    >
                      <View style={styles.radioOuter}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <Text style={[styles.durationLabel, { color: colors.textPrimary }]}>{dur.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Continue Button */}
              <Pressable
                style={[styles.primaryButton, numericAmount < minSipAmount && styles.disabledButton]}
                onPress={handleStep1Next}
                disabled={numericAmount < minSipAmount}
              >
                <Text style={styles.primaryButtonText}>Select Bank & Mandate</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          )}

          {/* ========================================================= */}
          {/* SCREEN 2: BANK ACCOUNT & MANDATE                          */}
          {/* ========================================================= */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Select Bank for Autopay</Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                Installments are automatically debited each month through NPCI e-NACH or UPI Autopay.
              </Text>

              {loadingAccounts ? (
                <ActivityIndicator color="#36358D" style={{ marginVertical: 32 }} />
              ) : (
                accounts.map((acc) => {
                  const isSelected = acc.id === selectedAccountId;
                  return (
                    <Pressable
                      key={acc.id}
                      style={[
                        styles.bankSelectCard,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        isSelected && styles.bankSelectCardActive,
                      ]}
                      onPress={() => setSelectedAccountId(acc.id)}
                    >
                      <View style={styles.radioOuter}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={[styles.bankName, { color: colors.textPrimary }]}>{acc.bankName}</Text>
                          {acc.isPrimary && (
                            <View style={styles.primaryBadge}>
                              <Text style={styles.primaryBadgeText}>Primary</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.accountNumberText}>{acc.maskedNumber}</Text>
                        <Text style={styles.ifscText}>IFSC: {acc.ifscCode} • {acc.accountType}</Text>
                      </View>
                    </Pressable>
                  );
                })
              )}

              {/* Mandate Status Box */}
              <View
                style={[
                  styles.mandateStatusBox,
                  {
                    backgroundColor: hasSufficientMandate ? '#F0FDF4' : '#FFFBEB',
                    borderColor: hasSufficientMandate ? '#BBF7D0' : '#FDE68A',
                  },
                ]}
              >
                <Ionicons
                  name={hasSufficientMandate ? 'shield-checkmark' : 'alert-circle'}
                  size={22}
                  color={hasSufficientMandate ? '#16A34A' : '#D97706'}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mandateHeader, { color: hasSufficientMandate ? '#166534' : '#92400E' }]}>
                    {hasSufficientMandate
                      ? `Active Auto-Debit Mandate (${rupees(mandateLimit)} limit)`
                      : 'Mandate Approval Required'}
                  </Text>
                  <Text style={[styles.mandateDesc, { color: hasSufficientMandate ? '#15803D' : '#78350F' }]}>
                    {hasSufficientMandate
                      ? `Your registered bank account has an approved mandate sufficient to cover ${rupees(numericAmount)}/month automatically.`
                      : `A one-time UPI or Netbanking Autopay mandate is required before installments can begin.`}
                  </Text>
                </View>
              </View>

              {!hasSufficientMandate && (
                <Pressable
                  style={[styles.secondaryButton, { marginBottom: 16, borderColor: '#36358D' }]}
                  onPress={() => navigation.navigate('Mandates')}
                >
                  <Ionicons name="card-outline" size={18} color="#36358D" style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryButtonText, { color: '#36358D' }]}>Set Up / Approve Mandate</Text>
                </Pressable>
              )}

              {/* Navigation Buttons */}
              <View style={styles.buttonRow}>
                <Pressable style={styles.secondaryButton} onPress={() => setStep(1)}>
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, { flex: 1, marginLeft: 12 }]}
                  onPress={handleStep2Next}
                  disabled={!selectedBank}
                >
                  <Text style={styles.primaryButtonText}>Review SIP</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}

          {/* ========================================================= */}
          {/* SCREEN 3: SIP SUMMARY                                     */}
          {/* ========================================================= */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Review Systematic Plan</Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                Confirm your monthly systematic investment schedule and auto-debit details.
              </Text>

              {/* Summary Breakdown Card */}
              <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Monthly Installment</Text>
                  <Text style={[styles.summaryTotalVal, { color: '#36358D' }]}>{rupees(numericAmount, 2)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Frequency</Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>Monthly</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Scheduled Debit Date</Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>{installmentDay}th of each month</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tenure / Duration</Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                    {durationMonths === 0 ? 'Until Cancelled (Perpetual)' : `${durationMonths} Months`}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Debit Bank</Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]} numberOfLines={1}>
                    {selectedBank?.bankName} ({selectedBank?.maskedNumber?.slice(-4)})
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Mandate Status</Text>
                  <Text style={[styles.summaryVal, { color: hasSufficientMandate ? '#16A34A' : '#D97706', fontWeight: '800' }]}>
                    {hasSufficientMandate ? 'Approved (Active)' : 'Pending Registration'}
                  </Text>
                </View>
              </View>

              {/* SIP Disclosures Box */}
              <View style={[styles.disclosureBox, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name="information-circle" size={18} color="#0284C7" style={{ marginRight: 6 }} />
                  <Text style={[styles.disclosureHeader, { color: '#0369A1' }]}>SIP Cancellation & Pause Flexibility</Text>
                </View>
                <Text style={[styles.disclosureBody, { color: '#075985' }]}>
                  • You can pause, modify or cancel this SIP anytime with zero penalty directly from your Portfolio screen.{'\n'}
                  • The first installment will be debited on registration; subsequent installments debit automatically on the {installmentDay}th.{'\n'}
                  • Units are allotted based on NAV on the day funds are realized by the AMC.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <Pressable style={styles.secondaryButton} onPress={() => setStep(2)}>
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, { flex: 1, marginLeft: 12 }]}
                  onPress={handleTriggerSubmission}
                >
                  <Text style={styles.primaryButtonText}>Authorise & Start SIP</Text>
                  <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}

          {/* ========================================================= */}
          {/* SCREEN 4: CONFIRMATION                                    */}
          {/* ========================================================= */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              {submitting ? (
                <View style={styles.statusBox}>
                  <ActivityIndicator size="large" color="#36358D" />
                  <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>Registering Monthly SIP...</Text>
                  <Text style={styles.statusSub}>Establishing systematic purchase plan with AMC</Text>
                </View>
              ) : sipResult?.status === 'FAILED' ? (
                <View style={styles.statusBox}>
                  <View style={[styles.iconCircleLarge, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="close-circle" size={54} color="#DC2626" />
                  </View>
                  <Text style={styles.orderFailedTitle}>SIP Registration Failed</Text>
                  <Text style={styles.statusSub}>{sipResult.message}</Text>
                  <Pressable style={styles.primaryButton} onPress={() => setStep(3)}>
                    <Text style={styles.primaryButtonText}>Retry Setup</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.statusBox}>
                  <View style={[styles.iconCircleLarge, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="checkmark-circle" size={54} color="#16A34A" />
                  </View>
                  <Text style={[styles.orderSuccessTitle, { color: colors.textPrimary }]}>
                    {sipResult?.mandateStatus === 'APPROVED' ? 'SIP Registered & Active!' : 'SIP Registration Submitted!'}
                  </Text>
                  <Text style={styles.statusSub}>
                    {sipResult?.mandateStatus === 'APPROVED'
                      ? `Your monthly investment of ${rupees(sipResult.amount)} is scheduled for the ${sipResult.installmentDay}th of each month.`
                      : `Your SIP is recorded. Please approve the mandate authorization to enable recurring debits.`}
                  </Text>

                  {/* Receipt Card */}
                  <View style={[styles.receiptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>SIP Reference ID</Text>
                      <Text style={[styles.receiptValue, { color: colors.textPrimary }]}>{sipResult?.planId}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Monthly Installment</Text>
                      <Text style={[styles.receiptValue, { color: colors.textPrimary }]}>
                        {rupees(sipResult?.amount, 2)}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Debit Schedule</Text>
                      <Text style={[styles.receiptValue, { color: colors.textPrimary }]}>
                        {sipResult?.installmentDay}th of every month
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Status</Text>
                      <View style={[styles.statusPill, sipResult?.mandateStatus !== 'APPROVED' && { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.statusPillText, sipResult?.mandateStatus !== 'APPROVED' && { color: '#B45309' }]}>
                          {sipResult?.statusLabel}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Initial Payment Link if applicable */}
                  {sipResult?.paymentUrl ? (
                    <Pressable
                      style={[styles.primaryButton, { backgroundColor: '#F7941D', marginBottom: 12 }]}
                      onPress={() => sipResult.paymentUrl && Linking.openURL(sipResult.paymentUrl)}
                    >
                      <Ionicons name="card-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.primaryButtonText}>Pay First Installment Now</Text>
                    </Pressable>
                  ) : null}

                  {/* Return to Portfolio */}
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => navigation.navigate('MainTabs', { screen: 'Portfolio' })}
                  >
                    <Text style={styles.primaryButtonText}>View In Portfolio</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 2FA Modal */}
      <TransactionOtpModal
        visible={Boolean(pendingAuth)}
        payload={pendingAuth}
        onAuthorised={handleAuthorised}
        onCancel={() => setPendingAuth(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  progressBarContainer: { height: 4, width: '100%', backgroundColor: '#E2E8F0' },
  progressBarFill: { height: '100%', backgroundColor: '#36358D' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  stepHeaderRow: { marginBottom: 14 },
  stepBadge: {
    backgroundColor: '#EEEDFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  stepBadgeText: { fontSize: 10, fontWeight: '800', color: '#36358D' },
  stepTitle: { fontSize: 22, fontWeight: '900', color: '#102A54' },
  fundBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  fundIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fundBannerTitle: { fontSize: 14, fontWeight: '800', lineHeight: 19 },
  fundMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  fundMetaText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  fundMetaDot: { marginHorizontal: 6, color: '#94A3B8' },
  stepContainer: { width: '100%' },
  inputGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  subHint: { fontSize: 11.5, color: '#64748B', marginBottom: 10, lineHeight: 16 },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: { borderColor: '#EF4444' },
  rupeeSymbol: { fontSize: 24, fontWeight: '800', color: '#36358D', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '900' },
  perMonthSuffix: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  minAmountHint: { fontSize: 11, color: '#64748B', marginTop: 6 },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '600' },
  quickChipsLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  amountChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  amountChipActive: { backgroundColor: '#EEEDFA', borderColor: '#36358D' },
  amountChipText: { fontSize: 12.5, fontWeight: '700', color: '#475569' },
  amountChipTextActive: { color: '#36358D', fontWeight: '900' },
  daysRow: { flexDirection: 'row', gap: 8 },
  dayBox: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBoxActive: { backgroundColor: '#EEEDFA', borderColor: '#36358D' },
  dayText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  dayTextActive: { color: '#36358D', fontWeight: '900' },
  durationOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  durationOptionCardActive: { borderColor: '#36358D' },
  durationLabel: { fontSize: 13, fontWeight: '700', marginLeft: 10 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#36358D',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabledButton: { backgroundColor: '#94A3B8', opacity: 0.7 },
  sectionHeading: { fontSize: 17, fontWeight: '900', marginBottom: 4 },
  sectionSub: { fontSize: 12.5, lineHeight: 18, marginBottom: 16 },
  bankSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  bankSelectCardActive: { borderColor: '#36358D', backgroundColor: '#F8F9FE' },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#36358D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#36358D' },
  bankName: { fontSize: 14, fontWeight: '800' },
  primaryBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  primaryBadgeText: { fontSize: 10, fontWeight: '800', color: '#B45309' },
  accountNumberText: { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 2 },
  ifscText: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  mandateStatusBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  mandateHeader: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  mandateDesc: { fontSize: 11.5, lineHeight: 16 },
  buttonRow: { flexDirection: 'row', alignItems: 'center' },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  summaryLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  summaryVal: { fontSize: 13, fontWeight: '700' },
  summaryTotalVal: { fontSize: 18, fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
  disclosureBox: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  disclosureHeader: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  disclosureBody: { fontSize: 11, lineHeight: 16 },
  statusBox: { alignItems: 'center', paddingVertical: 32 },
  iconCircleLarge: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  statusTitle: { fontSize: 18, fontWeight: '800', marginTop: 12 },
  statusSub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, marginBottom: 20, maxWidth: '85%' },
  orderSuccessTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  orderFailedTitle: { fontSize: 20, fontWeight: '900', color: '#DC2626', textAlign: 'center' },
  receiptCard: { width: '100%', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  receiptLabel: { fontSize: 12.5, color: '#64748B' },
  receiptValue: { fontSize: 13, fontWeight: '700' },
  statusPill: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusPillText: { fontSize: 11, fontWeight: '800', color: '#15803D' },
});
