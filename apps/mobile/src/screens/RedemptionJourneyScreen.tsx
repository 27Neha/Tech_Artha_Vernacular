import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
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

type Mode = 'amount' | 'units' | 'full';

const rupees = (v: number | null | undefined, digits = 0) =>
  v == null ? '—' : `₹${v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const RedemptionJourneyScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();

  const passedHolding: Holding | undefined = route.params?.holding;
  const folioNumber = passedHolding?.folioNumber || route.params?.folioNumber || 'FOLIO-1029482';
  const schemeIsin = passedHolding?.schemeIsin || route.params?.schemeIsin || 'INF109K01605';
  const fundName = passedHolding?.schemeName || route.params?.fundName || 'Mutual Fund Scheme';

  const totalUnits = passedHolding?.units ?? 142.854;
  const redeemableUnits = passedHolding?.redeemableUnits ?? totalUnits;
  const currentNav = passedHolding?.nav ?? 148.92;
  const totalMarketValue = passedHolding?.marketValue ?? totalUnits * currentNav;

  // Steps: 1: Select | 2: Impact | 3: Alternatives | 4: Bank Account | 5: Confirmation
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Mode & Amount/Units
  const [mode, setMode] = useState<Mode>('amount');
  const [inputValue, setInputValue] = useState<string>('');
  const [inputError, setInputError] = useState<string>('');

  // Step 4: Bank Account Selection
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(true);

  // Step 5: Final Submission State
  const [confirmedConsent, setConfirmedConsent] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [redemptionResult, setRedemptionResult] = useState<{
    orderId?: string;
    status: string;
    statusLabel?: string;
    amountOrUnits: string;
    payoutBank: string;
    message?: string;
  } | null>(null);

  // 2FA Auth State
  const [pendingAuth, setPendingAuth] = useState<TransactionPayload | null>(null);

  // Load Payout Bank Accounts
  const loadBankAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const gwStatus = await api.get<{ bankAccount?: any }>('/buckets/account-status').catch(() => null);
      const localRaw = await AsyncStorage.getItem('techartha_bank_accounts').catch(() => null);
      let list: BankAccount[] = localRaw ? JSON.parse(localRaw) : [];

      if (gwStatus?.bankAccount) {
        const gw = gwStatus.bankAccount;
        const exists = list.some((a) => a.maskedNumber === gw.maskedNumber || a.ifscCode === gw.ifscCode);
        if (!exists) {
          list.unshift({
            id: 'gw-payout',
            holderName: gw.holderName || 'Registered Investor',
            bankName: 'Registered Bank',
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
    loadBankAccounts();
  }, [loadBankAccounts]);

  const selectedBank = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  // Computations
  const computedValues = useMemo(() => {
    if (mode === 'full') {
      const grossVal = redeemableUnits * currentNav;
      const exitLoadEst = 0; // Standard exit load after holding period
      const netVal = grossVal - exitLoadEst;
      return {
        unitsToRedeem: redeemableUnits,
        grossAmount: grossVal,
        exitLoad: exitLoadEst,
        netAmount: netVal,
        remainingUnits: 0,
        remainingValue: 0,
        isValid: redeemableUnits > 0,
      };
    }

    if (mode === 'units') {
      const u = parseFloat(inputValue) || 0;
      const isValid = u > 0 && u <= redeemableUnits;
      const grossVal = u * currentNav;
      const exitLoadEst = 0;
      const remainingU = Math.max(0, redeemableUnits - u);
      return {
        unitsToRedeem: u,
        grossAmount: grossVal,
        exitLoad: exitLoadEst,
        netAmount: grossVal - exitLoadEst,
        remainingUnits: remainingU,
        remainingValue: remainingU * currentNav,
        isValid,
      };
    }

    // mode === 'amount'
    const a = parseFloat(inputValue) || 0;
    const maxVal = redeemableUnits * currentNav;
    const isValid = a >= 500 && a <= maxVal;
    const u = currentNav > 0 ? a / currentNav : 0;
    const remainingU = Math.max(0, redeemableUnits - u);
    return {
      unitsToRedeem: u,
      grossAmount: a,
      exitLoad: 0,
      netAmount: a,
      remainingUnits: remainingU,
      remainingValue: remainingU * currentNav,
      isValid,
    };
  }, [mode, inputValue, redeemableUnits, currentNav]);

  const handleApplyPercentage = (pct: number) => {
    setInputError('');
    if (pct === 100) {
      setMode('full');
      setInputValue('');
      return;
    }
    if (mode === 'amount') {
      const calcAmt = Math.round((redeemableUnits * currentNav * (pct / 100)));
      setInputValue(String(calcAmt));
    } else {
      setMode('units');
      const calcUnits = (redeemableUnits * (pct / 100)).toFixed(3);
      setInputValue(calcUnits);
    }
  };

  const handleStep1Next = () => {
    setInputError('');
    if (!computedValues.isValid) {
      if (mode === 'amount') {
        setInputError(`Enter an amount between ₹500 and ${rupees(redeemableUnits * currentNav)}.`);
      } else if (mode === 'units') {
        setInputError(`Enter units between 0.001 and ${redeemableUnits.toFixed(3)}.`);
      } else {
        setInputError('No redeemable units available in this folio.');
      }
      return;
    }
    setStep(2);
  };

  const handleTriggerSubmission = () => {
    if (!confirmedConsent) {
      Alert.alert('Investor Consent Required', 'Please tick the declaration box confirming you wish to submit this redemption request.');
      return;
    }

    setPendingAuth({
      action: 'REDEMPTION',
      amount: computedValues.netAmount,
      schemeIsin,
      folioNumber,
      units: computedValues.unitsToRedeem,
      fullExit: mode === 'full',
      channel: 'EMAIL',
    });
  };

  const handleAuthorised = async (auth: TransactionAuth) => {
    setPendingAuth(null);
    setSubmitting(true);

    try {
      const payload: any = {
        folioNumber,
        schemeIsin,
        transactionConsent: true,
        challengeId: auth.challengeId,
        otp: auth.otp,
      };

      if (mode === 'full') {
        payload.fullExit = true;
      } else if (mode === 'units') {
        payload.units = Number(computedValues.unitsToRedeem.toFixed(3));
      } else {
        payload.amount = Math.round(computedValues.grossAmount);
      }

      const res = await api.post<{
        orderId?: string;
        id?: string;
        status?: string;
        statusLabel?: string;
        message?: string;
      }>('/redemptions', payload);

      setRedemptionResult({
        orderId: res.orderId || res.id || `RED-${Date.now().toString().slice(-6)}`,
        status: res.status || 'SUBMITTED',
        statusLabel: res.statusLabel || 'Redemption Placed (In Progress)',
        amountOrUnits: mode === 'units' ? `${computedValues.unitsToRedeem.toFixed(3)} Units` : rupees(computedValues.netAmount, 2),
        payoutBank: `${selectedBank?.bankName} (${selectedBank?.maskedNumber?.slice(-4)})`,
        message: res.message || 'Redemption order received. AMC will disburse payout after verification.',
      });
    } catch (e: any) {
      setRedemptionResult({
        orderId: `ERR-${Date.now().toString().slice(-4)}`,
        status: 'FAILED',
        statusLabel: 'Redemption Failed',
        amountOrUnits: rupees(computedValues.netAmount, 2),
        payoutBank: selectedBank?.bankName || 'Registered Bank',
        message: sanitizeNetworkError(e) || 'Redemption request could not be processed by the registrar/AMC.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleHeaderBack = () => {
    if (step > 1 && step < 5) {
      setStep((step - 1) as any);
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <StatusBar style="dark" />
      <Header
        title="Redeem Funds"
        onBack={handleHeaderBack}
        showSettings={false}
        showNotifications={false}
      />

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${(step / 5) * 100}%` }]} />
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
              <Text style={styles.stepBadgeText}>STEP {step} OF 5</Text>
            </View>
            <Text style={styles.stepTitle}>
              {step === 1 && 'Select Redemption'}
              {step === 2 && 'Redemption Impact'}
              {step === 3 && 'Review & Alternatives'}
              {step === 4 && 'Payout Bank Account'}
              {step === 5 && 'Final Confirmation'}
            </Text>
          </View>

          {/* Scheme Card Banner */}
          <View style={[styles.fundBannerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.fundIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="arrow-down-circle" size={22} color="#059669" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.fundBannerTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {fundName}
              </Text>
              <View style={styles.fundMetaRow}>
                <Text style={styles.fundMetaText}>Folio: {folioNumber}</Text>
                <Text style={styles.fundMetaDot}>•</Text>
                <Text style={styles.fundMetaText}>NAV: {rupees(currentNav, 2)}</Text>
              </View>
            </View>
          </View>

          {/* ========================================================= */}
          {/* SCREEN 1: SELECT REDEMPTION                               */}
          {/* ========================================================= */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              {/* Holding Balance Stats Card */}
              <View style={[styles.holdingBalanceCard, { backgroundColor: isDark ? colors.surfaceMuted : '#F8FAFC', borderColor: colors.border }]}>
                <View style={styles.holdingBalanceRow}>
                  <View>
                    <Text style={styles.statLabel}>TOTAL HOLDING VALUE</Text>
                    <Text style={[styles.statValueBig, { color: colors.textPrimary }]}>{rupees(totalMarketValue, 2)}</Text>
                    <Text style={styles.statSubText}>{totalUnits.toFixed(3)} units in folio</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.statLabel}>AVAILABLE TO REDEEM</Text>
                    <Text style={[styles.statValueGreen, { color: '#059669' }]}>
                      {rupees(redeemableUnits * currentNav, 2)}
                    </Text>
                    <Text style={styles.statSubText}>{redeemableUnits.toFixed(3)} redeemable</Text>
                  </View>
                </View>
              </View>

              {/* Mode Selector Tabs */}
              <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: 14 }]}>
                Withdrawal Mode
              </Text>
              <View style={styles.modeTabsRow}>
                <Pressable
                  style={[styles.modeTab, mode === 'amount' && styles.modeTabActive]}
                  onPress={() => {
                    setMode('amount');
                    setInputValue('');
                    setInputError('');
                  }}
                >
                  <Text style={[styles.modeTabText, mode === 'amount' && styles.modeTabTextActive]}>
                    By Amount (₹)
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.modeTab, mode === 'units' && styles.modeTabActive]}
                  onPress={() => {
                    setMode('units');
                    setInputValue('');
                    setInputError('');
                  }}
                >
                  <Text style={[styles.modeTabText, mode === 'units' && styles.modeTabTextActive]}>
                    By Units
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.modeTab, mode === 'full' && styles.modeTabActive]}
                  onPress={() => {
                    setMode('full');
                    setInputValue('');
                    setInputError('');
                  }}
                >
                  <Text style={[styles.modeTabText, mode === 'full' && styles.modeTabTextActive]}>
                    Full Exit
                  </Text>
                </Pressable>
              </View>

              {/* Input for Amount or Units */}
              {mode !== 'full' ? (
                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    {mode === 'amount' ? 'Enter Amount to Withdraw (₹)' : 'Enter Units to Withdraw'} *
                  </Text>
                  <View style={[styles.amountInputWrap, !!inputError && styles.inputError]}>
                    {mode === 'amount' && <Text style={styles.rupeeSymbol}>₹</Text>}
                    <TextInput
                      value={inputValue}
                      onChangeText={(val) => {
                        setInputValue(val);
                        if (inputError) setInputError('');
                      }}
                      placeholder={mode === 'amount' ? '5000' : '50.000'}
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                      style={[styles.amountInput, { color: colors.textPrimary }]}
                      autoFocus={true}
                    />
                  </View>
                  {inputError ? <Text style={styles.errorText}>⚠️ {inputError}</Text> : null}
                </View>
              ) : (
                <View style={[styles.fullExitNotice, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                  <Ionicons name="alert-circle" size={20} color="#D97706" style={{ marginRight: 8 }} />
                  <Text style={styles.fullExitNoticeText}>
                    Full Exit selected: All {redeemableUnits.toFixed(3)} available units will be redeemed for an estimated {rupees(redeemableUnits * currentNav, 2)}.
                  </Text>
                </View>
              )}

              {/* Quick Percentage Chips */}
              <Text style={styles.quickChipsLabel}>Quick Percentage:</Text>
              <View style={styles.chipsWrap}>
                {[25, 50, 75, 100].map((pct) => (
                  <Pressable
                    key={pct}
                    style={styles.amountChip}
                    onPress={() => handleApplyPercentage(pct)}
                  >
                    <Text style={styles.amountChipText}>{pct === 100 ? '100% (All)' : `${pct}%`}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Continue Button */}
              <Pressable
                style={[styles.primaryButton, !computedValues.isValid && styles.disabledButton]}
                onPress={handleStep1Next}
                disabled={!computedValues.isValid}
              >
                <Text style={styles.primaryButtonText}>View Financial Impact</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          )}

          {/* ========================================================= */}
          {/* SCREEN 2: REDEMPTION IMPACT                               */}
          {/* ========================================================= */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                Estimated Financial Impact
              </Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                Actual allotment value is calculated on the applicable transaction cut-off date by the AMC registrar.
              </Text>

              {/* Impact Card */}
              <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Gross Withdrawal Amount</Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                    {rupees(computedValues.grossAmount, 2)}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Units to be Redeemed</Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                    {computedValues.unitsToRedeem.toFixed(3)} units
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Exit Load</Text>
                  <Text style={[styles.summaryVal, { color: '#16A34A', fontWeight: '800' }]}>
                    NIL (0.00%)
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Expected Settlement Timeline</Text>
                  <Text style={[styles.summaryVal, { color: '#0284C7', fontWeight: '800' }]}>
                    T+2 to T+3 Business Days
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabelTotal, { color: colors.textPrimary }]}>
                    Estimated Payout
                  </Text>
                  <Text style={[styles.summaryTotalVal, { color: '#059669' }]}>
                    {rupees(computedValues.netAmount, 2)}
                  </Text>
                </View>

                <View style={[styles.summaryRow, { marginTop: 6 }]}>
                  <Text style={styles.summaryLabel}>Remaining Portfolio Balance</Text>
                  <Text style={[styles.summaryVal, { color: '#64748B' }]}>
                    {computedValues.remainingUnits.toFixed(3)} units ({rupees(computedValues.remainingValue, 2)})
                  </Text>
                </View>
              </View>

              {/* Tax & Lock-in Notice */}
              <View style={[styles.disclosureBox, { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }]}>
                <Text style={[styles.disclosureHeader, { color: '#334155' }]}>Capital Gains & Taxation Notice</Text>
                <Text style={[styles.disclosureBody, { color: '#475569' }]}>
                  • Equity funds held over 12 months qualify for Long Term Capital Gains (LTCG) taxed at 12.5% for gains above ₹1.25 Lakh/year.{'\n'}
                  • Short Term Capital Gains (STCG) apply at 20% for units held under 12 months.{'\n'}
                  • TDS is not deducted for resident individual investors. Capital gains statement will be accessible in your annual tax report.
                </Text>
              </View>

              {/* Navigation Buttons */}
              <View style={styles.buttonRow}>
                <Pressable style={styles.secondaryButton} onPress={() => setStep(1)}>
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, { flex: 1, marginLeft: 12 }]}
                  onPress={() => setStep(3)}
                >
                  <Text style={styles.primaryButtonText}>Review & Alternatives</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}

          {/* ========================================================= */}
          {/* SCREEN 3: REVIEW & ALTERNATIVES                           */}
          {/* ========================================================= */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                Consider Your Options
              </Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                Redeeming early can slow your long-term goal compounding. Explore these flexible alternatives before liquidating:
              </Text>

              {/* Alternative 1: Continue Compounding */}
              <View style={[styles.altCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.altIconWrap, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="trending-up" size={20} color="#059669" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.altTitle, { color: colors.textPrimary }]}>Stay Invested for Compounding</Text>
                  <Text style={styles.altDesc}>
                    Staying invested allows your fund to recover from short-term market cycles and compound without tax incidence.
                  </Text>
                </View>
              </View>

              {/* Alternative 2: Pause or Reduce SIP */}
              <View style={[styles.altCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.altIconWrap, { backgroundColor: '#EEEDFA' }]}>
                  <Ionicons name="pause-circle-outline" size={20} color="#36358D" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.altTitle, { color: colors.textPrimary }]}>Pause Future SIPs Instead</Text>
                  <Text style={styles.altDesc}>
                    If facing temporary cash flow needs, you can pause future monthly deductions while leaving your existing units to grow.
                  </Text>
                </View>
              </View>

              {/* Alternative 3: Partial Redemption */}
              <View style={[styles.altCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.altIconWrap, { backgroundColor: '#FFFBEB' }]}>
                  <Ionicons name="pie-chart-outline" size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.altTitle, { color: colors.textPrimary }]}>Partial vs Full Withdrawal</Text>
                  <Text style={styles.altDesc}>
                    Withdrawing only what is strictly necessary keeps your investment folio active and preserves your compounding base.
                  </Text>
                </View>
              </View>

              {/* Proceed Notice */}
              <Text style={styles.freeToProceedNote}>
                You are completely free to proceed with redemption at any time.
              </Text>

              {/* Buttons */}
              <View style={styles.buttonRow}>
                <Pressable style={styles.secondaryButton} onPress={() => setStep(2)}>
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, { flex: 1, marginLeft: 12 }]}
                  onPress={() => setStep(4)}
                >
                  <Text style={styles.primaryButtonText}>Select Payout Bank</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}

          {/* ========================================================= */}
          {/* SCREEN 4: BANK ACCOUNT                                    */}
          {/* ========================================================= */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                Select Payout Bank Account
              </Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                Redemption proceeds are credited directly into your verified bank account by the Mutual Fund RTA via NEFT/RTGS.
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

              {/* Navigation Buttons */}
              <View style={styles.buttonRow}>
                <Pressable style={styles.secondaryButton} onPress={() => setStep(3)}>
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, { flex: 1, marginLeft: 12 }]}
                  onPress={() => setStep(5)}
                  disabled={!selectedBank}
                >
                  <Text style={styles.primaryButtonText}>Final Confirmation</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}

          {/* ========================================================= */}
          {/* SCREEN 5: FINAL CONFIRMATION                              */}
          {/* ========================================================= */}
          {step === 5 && (
            <View style={styles.stepContainer}>
              {submitting ? (
                <View style={styles.statusBox}>
                  <ActivityIndicator size="large" color="#36358D" />
                  <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>Submitting Redemption...</Text>
                  <Text style={styles.statusSub}>Authorising order with Cybrilla and AMC registrar</Text>
                </View>
              ) : redemptionResult?.status === 'FAILED' ? (
                <View style={styles.statusBox}>
                  <View style={[styles.iconCircleLarge, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="close-circle" size={54} color="#DC2626" />
                  </View>
                  <Text style={styles.orderFailedTitle}>Redemption Request Failed</Text>
                  <Text style={styles.statusSub}>{redemptionResult.message}</Text>
                  <Pressable style={styles.primaryButton} onPress={() => setStep(4)}>
                    <Text style={styles.primaryButtonText}>Review & Retry</Text>
                  </Pressable>
                </View>
              ) : redemptionResult ? (
                <View style={styles.statusBox}>
                  <View style={[styles.iconCircleLarge, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="checkmark-circle" size={54} color="#16A34A" />
                  </View>
                  <Text style={[styles.orderSuccessTitle, { color: colors.textPrimary }]}>
                    Redemption Request Placed!
                  </Text>
                  <Text style={styles.statusSub}>
                    Your redemption order has been sent to {fundName}. Payout will be credited within T+2 to T+3 business days.
                  </Text>

                  {/* Receipt Card */}
                  <View style={[styles.receiptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Transaction Reference ID</Text>
                      <Text style={[styles.receiptValue, { color: colors.textPrimary }]}>
                        {redemptionResult.orderId}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Redeemed Units/Amount</Text>
                      <Text style={[styles.receiptValue, { color: colors.textPrimary }]}>
                        {redemptionResult.amountOrUnits}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Credit Target Bank</Text>
                      <Text style={[styles.receiptValue, { color: colors.textPrimary }]} numberOfLines={1}>
                        {redemptionResult.payoutBank}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Status</Text>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>{redemptionResult.statusLabel}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Return to Portfolio */}
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => navigation.navigate('MainTabs', { screen: 'Portfolio' })}
                  >
                    <Text style={styles.primaryButtonText}>Return to Portfolio</Text>
                  </Pressable>
                </View>
              ) : (
                /* Pre-submission Summary & Checkbox */
                <View>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                    Confirm Order Submission
                  </Text>
                  <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                    Verify final payout details before authorising the redemption.
                  </Text>

                  <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Fund Scheme</Text>
                      <Text style={[styles.summaryVal, { color: colors.textPrimary }]} numberOfLines={1}>
                        {fundName}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Folio Number</Text>
                      <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>{folioNumber}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Withdrawal</Text>
                      <Text style={[styles.summaryVal, { color: '#059669', fontWeight: '800' }]}>
                        {mode === 'units'
                          ? `${computedValues.unitsToRedeem.toFixed(3)} Units`
                          : rupees(computedValues.netAmount, 2)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Payout Bank</Text>
                      <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                        {selectedBank?.bankName} ({selectedBank?.maskedNumber?.slice(-4)})
                      </Text>
                    </View>
                  </View>

                  {/* Consent Checkbox */}
                  <Pressable
                    style={styles.consentRow}
                    onPress={() => setConfirmedConsent(!confirmedConsent)}
                  >
                    <View style={[styles.checkbox, confirmedConsent && styles.checkboxActive]}>
                      {confirmedConsent && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.consentText}>
                      I hereby authorise the redemption of units from the above folio and confirm that the proceeds be credited to my registered bank account.
                    </Text>
                  </Pressable>

                  {/* Submit Button */}
                  <View style={styles.buttonRow}>
                    <Pressable style={styles.secondaryButton} onPress={() => setStep(4)}>
                      <Text style={styles.secondaryButtonText}>Back</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.primaryButton, (!confirmedConsent || submitting) && styles.disabledButton, { flex: 1, marginLeft: 12 }]}
                      onPress={handleTriggerSubmission}
                      disabled={!confirmedConsent || submitting}
                    >
                      <Text style={styles.primaryButtonText}>Authorise & Submit</Text>
                      <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
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
  progressBarFill: { height: '100%', backgroundColor: '#059669' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  stepHeaderRow: { marginBottom: 14 },
  stepBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  stepBadgeText: { fontSize: 10, fontWeight: '800', color: '#059669' },
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
  holdingBalanceCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  holdingBalanceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  statValueBig: { fontSize: 18, fontWeight: '900', marginTop: 3 },
  statValueGreen: { fontSize: 18, fontWeight: '900', marginTop: 3 },
  statSubText: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  modeTabsRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabActive: { backgroundColor: '#EEEDFA', borderColor: '#36358D' },
  modeTabText: { fontSize: 12.5, fontWeight: '700', color: '#64748B' },
  modeTabTextActive: { color: '#36358D', fontWeight: '900' },
  inputGroup: { marginBottom: 16 },
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
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '600' },
  fullExitNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  fullExitNoticeText: { fontSize: 12.5, color: '#92400E', fontWeight: '600', flex: 1, lineHeight: 18 },
  quickChipsLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 8 },
  chipsWrap: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  amountChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
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
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  summaryLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  summaryVal: { fontSize: 13, fontWeight: '700' },
  summaryLabelTotal: { fontSize: 15, fontWeight: '900' },
  summaryTotalVal: { fontSize: 18, fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
  disclosureBox: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  disclosureHeader: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  disclosureBody: { fontSize: 11, lineHeight: 16 },
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
  altCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  altIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  altTitle: { fontSize: 13.5, fontWeight: '800', marginBottom: 2 },
  altDesc: { fontSize: 11.5, color: '#64748B', lineHeight: 16 },
  freeToProceedNote: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 12,
  },
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
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#36358D',
    marginRight: 10,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: { backgroundColor: '#36358D' },
  consentText: { flex: 1, fontSize: 12, color: '#475569', lineHeight: 18, fontWeight: '500' },
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
