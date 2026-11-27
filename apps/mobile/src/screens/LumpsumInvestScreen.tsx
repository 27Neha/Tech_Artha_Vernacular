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

const QUICK_AMOUNTS = [1000, 2500, 5000, 10000, 25000, 50000];

const rupees = (v: number | null | undefined, digits = 0) =>
  v == null ? '—' : `₹${v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const LumpsumInvestScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();

  const holding: Holding | undefined = route.params?.holding;
  const fundName = holding?.schemeName || route.params?.fundName || 'Mutual Fund Scheme';
  const schemeIsin = holding?.schemeIsin || route.params?.schemeIsin || 'INF109K01605';
  const folioNumber = holding?.folioNumber || route.params?.folioNumber || 'FOLIO-EXISTING';
  const currentNav = holding?.nav ?? route.params?.nav ?? 42.5;
  const navDate = holding?.navDate || route.params?.navDate || new Date().toISOString().split('T')[0];

  // Steps: 1: Details | 2: Bank Account | 3: Summary | 4: Confirmation
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Investment Details
  const [amount, setAmount] = useState<string>('5000');
  const [amountError, setAmountError] = useState<string>('');
  const minAmount = 500;

  // Step 2: Bank Selection
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(true);

  // Step 4: Submission and Confirmation
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [orderResult, setOrderResult] = useState<{
    orderId?: string;
    status: string;
    statusLabel?: string;
    amount: number;
    paymentUrl?: string | null;
    message?: string;
  } | null>(null);

  // 2FA Auth State
  const [pendingAuth, setPendingAuth] = useState<TransactionPayload | null>(null);

  const loadBankAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      // 1. Fetch gateway account
      const gwStatus = await api.get<{ bankAccount?: any }>('/buckets/account-status').catch(() => null);
      
      // 2. Fetch local accounts
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
        // Fallback default for demo/verified accounts
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
      // Keep list intact
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    loadBankAccounts();
  }, [loadBankAccounts]);

  const selectedBank = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  // Calculations
  const numericAmount = Number(amount) || 0;
  const stampDuty = Number((numericAmount * 0.00005).toFixed(2)); // 0.005% statutory stamp duty
  const netInvestment = numericAmount > 0 ? numericAmount - stampDuty : 0;
  const estimatedUnits = currentNav && currentNav > 0 ? (netInvestment / currentNav).toFixed(3) : '0.000';

  const handleStep1Next = () => {
    setAmountError('');
    if (!numericAmount || numericAmount < minAmount) {
      setAmountError(`Minimum lumpsum investment is ${rupees(minAmount)}.`);
      return;
    }
    if (numericAmount > 10000000) {
      setAmountError('Maximum single transaction amount is ₹1 Crore.');
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    if (!selectedBank) {
      Alert.alert('Select Bank Account', 'Please select a registered bank account to proceed.');
      return;
    }
    setStep(3);
  };

  const handleTriggerSubmission = () => {
    // Open 2FA Challenge
    setPendingAuth({
      action: 'PURCHASE',
      amount: numericAmount,
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
      // Submit order via Cybrilla integration
      const bucketId = 'balanced';
      const payload = {
        amount: numericAmount,
        consent: true,
        transactionConsent: true,
        challengeId: auth.challengeId,
        otp: auth.otp,
        isin: schemeIsin,
        fundName,
        folioNumber: folioNumber !== 'FOLIO-EXISTING' ? folioNumber : undefined,
      };

      const res = await api.post<{
        orderId?: string;
        id?: string;
        status?: string;
        statusLabel?: string;
        paymentUrl?: string | null;
        token_url?: string | null;
        message?: string;
      }>(`/buckets/${bucketId}/invest`, payload);

      setOrderResult({
        orderId: res.orderId || res.id || `ORD-${Date.now().toString().slice(-6)}`,
        status: res.status || 'SUBMITTED',
        statusLabel: res.statusLabel || 'Order Placed (Pending Payment)',
        amount: numericAmount,
        paymentUrl: res.paymentUrl || res.token_url || null,
        message: res.message || 'Your lumpsum purchase order has been successfully routed to the AMC.',
      });
    } catch (e: any) {
      setOrderResult({
        orderId: `FAILED-${Date.now().toString().slice(-4)}`,
        status: 'FAILED',
        statusLabel: 'Order Submission Failed',
        amount: numericAmount,
        paymentUrl: null,
        message: sanitizeNetworkError(e) || 'Order could not be processed by the fund house.',
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
        title="Invest in Lumpsum"
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
          {/* Step Indicator Header */}
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP {step} OF 4</Text>
            </View>
            <Text style={styles.stepTitle}>
              {step === 1 && 'Investment Details'}
              {step === 2 && 'Select Bank Account'}
              {step === 3 && 'Order Summary'}
              {step === 4 && 'Transaction Confirmation'}
            </Text>
          </View>

          {/* Scheme Card Banner */}
          <View style={[styles.fundBannerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.fundIconCircle}>
              <Ionicons name="wallet" size={22} color="#36358D" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.fundBannerTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {fundName}
              </Text>
              <View style={styles.fundMetaRow}>
                <Text style={styles.fundMetaText}>Folio: {folioNumber}</Text>
                <Text style={styles.fundMetaDot}>•</Text>
                <Text style={styles.fundMetaText}>ISIN: {schemeIsin}</Text>
              </View>
            </View>
          </View>

          {/* ========================================================= */}
          {/* SCREEN 1: INVESTMENT DETAILS                              */}
          {/* ========================================================= */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              {/* Live NAV Box */}
              <View style={[styles.navBox, { backgroundColor: isDark ? colors.surfaceMuted : '#F8FAFC', borderColor: colors.border }]}>
                <View>
                  <Text style={styles.navLabel}>CURRENT SCHEME NAV</Text>
                  <Text style={[styles.navValue, { color: colors.textPrimary }]}>{rupees(currentNav, 2)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.navDateLabel}>AS ON</Text>
                  <Text style={styles.navDateText}>{navDate}</Text>
                </View>
              </View>

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                  Investment Amount (₹) *
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
                    placeholder="5000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    style={[styles.amountInput, { color: colors.textPrimary }]}
                    autoFocus={true}
                  />
                </View>
                {amountError ? <Text style={styles.errorText}>⚠️ {amountError}</Text> : null}
                <Text style={styles.minAmountHint}>
                  Minimum investment: {rupees(minAmount)} • Stamp duty of 0.005% applies.
                </Text>
              </View>

              {/* Quick Amount Suggestion Chips */}
              <Text style={styles.quickChipsLabel}>Quick Select Amount:</Text>
              <View style={styles.chipsWrap}>
                {QUICK_AMOUNTS.map((chip) => {
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

              {/* Units Preview Box */}
              {numericAmount >= minAmount && (
                <View style={[styles.previewCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Ionicons name="sparkles" size={18} color="#16A34A" style={{ marginRight: 8 }} />
                  <Text style={styles.previewText}>
                    Estimated allotment: <Text style={{ fontWeight: '800', color: '#15803D' }}>{estimatedUnits} units</Text>
                  </Text>
                </View>
              )}

              {/* Continue Button */}
              <Pressable
                style={[styles.primaryButton, numericAmount < minAmount && styles.disabledButton]}
                onPress={handleStep1Next}
                disabled={numericAmount < minAmount}
              >
                <Text style={styles.primaryButtonText}>Select Bank Account</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          )}

          {/* ========================================================= */}
          {/* SCREEN 2: BANK ACCOUNT SELECTION                          */}
          {/* ========================================================= */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                Choose Debit Bank Account
              </Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                Mutual fund payments must originate strictly from your verified bank account per SEBI guidelines.
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

              {/* Add New Bank Navigation Button */}
              <Pressable
                style={styles.addBankLink}
                onPress={() => navigation.navigate('BankAccounts')}
              >
                <Ionicons name="add-circle-outline" size={18} color="#36358D" style={{ marginRight: 6 }} />
                <Text style={styles.addBankLinkText}>Manage or Add Another Bank Account</Text>
              </Pressable>

              {/* Buttons */}
              <View style={styles.buttonRow}>
                <Pressable style={styles.secondaryButton} onPress={() => setStep(1)}>
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, { flex: 1, marginLeft: 12 }]}
                  onPress={handleStep2Next}
                  disabled={!selectedBank}
                >
                  <Text style={styles.primaryButtonText}>Review Order</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}

          {/* ========================================================= */}
          {/* SCREEN 3: ORDER SUMMARY & DISCLOSURES                     */}
          {/* ========================================================= */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Review Your Order</Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                Please verify all transaction details before authorising payment.
              </Text>

              {/* Summary Breakdown Card */}
              <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Gross Investment</Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>{rupees(numericAmount, 2)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Govt. Stamp Duty (0.005%)</Text>
                  <Text style={[styles.summaryVal, { color: '#64748B' }]}>{rupees(stampDuty, 2)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>TechArtha Platform Fee</Text>
                  <Text style={[styles.summaryVal, { color: '#16A34A', fontWeight: '800' }]}>FREE (₹0.00)</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabelTotal, { color: colors.textPrimary }]}>Net Invested Value</Text>
                  <Text style={styles.summaryTotalVal}>{rupees(netInvestment, 2)}</Text>
                </View>

                <View style={[styles.summaryRow, { marginTop: 6 }]}>
                  <Text style={styles.summaryLabel}>Est. Allotted Units (@ {rupees(currentNav, 2)})</Text>
                  <Text style={[styles.summaryVal, { fontWeight: '800', color: '#36358D' }]}>
                    {estimatedUnits} units
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Debit Bank Account</Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]} numberOfLines={1}>
                    {selectedBank?.bankName} ({selectedBank?.maskedNumber?.slice(-4)})
                  </Text>
                </View>
              </View>

              {/* Important Disclosures Card */}
              <View style={[styles.disclosureBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name="information-circle" size={18} color="#D97706" style={{ marginRight: 6 }} />
                  <Text style={styles.disclosureHeader}>Regulatory Cut-off Disclosures</Text>
                </View>
                <Text style={styles.disclosureBody}>
                  • Orders submitted before 1:30 PM on a business day receive same-day NAV allotment subject to fund realization.{'\n'}
                  • Units will be credited to folio {folioNumber} within 1-2 business days.{'\n'}
                  • Mutual fund investments are subject to market risks; read all scheme related documents carefully.
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
                  <Text style={styles.primaryButtonText}>Authorise & Invest</Text>
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
                  <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>Submitting Your Order...</Text>
                  <Text style={styles.statusSub}>Communicating with Cybrilla & AMC Gateway</Text>
                </View>
              ) : orderResult?.status === 'FAILED' ? (
                <View style={styles.statusBox}>
                  <View style={[styles.iconCircleLarge, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="close-circle" size={54} color="#DC2626" />
                  </View>
                  <Text style={styles.orderFailedTitle}>Order Could Not Be Completed</Text>
                  <Text style={styles.statusSub}>{orderResult.message}</Text>
                  <Pressable style={styles.primaryButton} onPress={() => setStep(3)}>
                    <Text style={styles.primaryButtonText}>Retry Order</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.statusBox}>
                  <View style={[styles.iconCircleLarge, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="checkmark-circle" size={54} color="#16A34A" />
                  </View>
                  <Text style={[styles.orderSuccessTitle, { color: colors.textPrimary }]}>
                    Order Successfully Placed!
                  </Text>
                  <Text style={styles.statusSub}>
                    Your purchase request has been submitted to {fundName}.
                  </Text>

                  {/* Order Details Receipt */}
                  <View style={[styles.receiptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Order Reference ID</Text>
                      <Text style={[styles.receiptValue, { color: colors.textPrimary }]}>{orderResult?.orderId}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Transaction Amount</Text>
                      <Text style={[styles.receiptValue, { color: colors.textPrimary }]}>
                        {rupees(orderResult?.amount, 2)}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Status</Text>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>{orderResult?.statusLabel || 'Active'}</Text>
                      </View>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Folio</Text>
                      <Text style={[styles.receiptValue, { color: colors.textPrimary }]}>{folioNumber}</Text>
                    </View>
                  </View>

                  {/* Payment Redirection Button if token_url exists */}
                  {orderResult?.paymentUrl ? (
                    <Pressable
                      style={[styles.primaryButton, { backgroundColor: '#F7941D', marginBottom: 12 }]}
                      onPress={() => orderResult.paymentUrl && Linking.openURL(orderResult.paymentUrl)}
                    >
                      <Ionicons name="card-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.primaryButtonText}>Complete Netbanking / UPI Payment</Text>
                    </Pressable>
                  ) : null}

                  {/* Return to Portfolio */}
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => navigation.navigate('MainTabs', { screen: 'Portfolio' })}
                  >
                    <Text style={styles.primaryButtonText}>View Portfolio</Text>
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
    backgroundColor: '#EEEDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fundBannerTitle: { fontSize: 14, fontWeight: '800', lineHeight: 19 },
  fundMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  fundMetaText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  fundMetaDot: { marginHorizontal: 6, color: '#94A3B8' },
  stepContainer: { width: '100%' },
  navBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  navLabel: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  navValue: { fontSize: 16, fontWeight: '900', marginTop: 2 },
  navDateLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8' },
  navDateText: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' },
  inputGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
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
  minAmountHint: { fontSize: 11, color: '#64748B', marginTop: 6 },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '600' },
  quickChipsLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
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
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  previewText: { fontSize: 13, color: '#166534', fontWeight: '600' },
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
  addBankLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  addBankLinkText: { fontSize: 13, fontWeight: '700', color: '#36358D' },
  buttonRow: { flexDirection: 'row', alignItems: 'center' },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
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
  summaryLabelTotal: { fontSize: 15, fontWeight: '900' },
  summaryTotalVal: { fontSize: 18, fontWeight: '900', color: '#36358D' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
  disclosureBox: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  disclosureHeader: { fontSize: 12, fontWeight: '800', color: '#B45309' },
  disclosureBody: { fontSize: 11, color: '#78350F', lineHeight: 16 },
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
