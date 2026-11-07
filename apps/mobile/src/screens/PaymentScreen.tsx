import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api/client';

type PaymentMethodOption = 'upi' | 'netbanking';

type AccountStatusResponse = {
  hasInvestmentAccount: boolean;
  approvedMandateLimit: number | null;
  bankAccount: {
    holderName: string | null;
    maskedNumber: string | null;
    ifscCode: string | null;
    type: string | null;
  } | null;
};

type InvestmentsResponse = {
  orders: {
    id: string;
    fundName: string;
    schemeIsin: string;
    amount: number;
    status: string;
    statusLabel: string;
    paymentUrl: string | null;
    folioNumber?: string | null;
    createdAt: string;
  }[];
  plans: {
    id: string;
    fundName: string;
    schemeIsin: string;
    amount: number;
    frequency: string;
    installmentDay: number;
    status: string;
    statusLabel: string;
    paymentUrl: string | null;
    createdAt: string;
  }[];
};

export const PaymentScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();

  const orderId: string | null = route.params?.orderId ?? null;
  const planId: string | null = route.params?.planId ?? null;
  const amount: number = Number(route.params?.amount ?? 0);
  const schemeName: string =
    route.params?.schemeName ??
    route.params?.fundName ??
    route.params?.targetName ??
    'Mutual Fund Order';
  const initialPaymentUrl: string | null = route.params?.paymentUrl ?? null;
  const mode: 'lumpsum' | 'sip' = route.params?.mode === 'sip' ? 'sip' : 'lumpsum';
  const serverMessage: string | null = route.params?.message ?? null;
  const initialStatus: string = route.params?.status ?? 'UNDER_REVIEW';
  const initialStatusLabel: string = route.params?.statusLabel ?? 'Order in progress';

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodOption>('upi');
  const [paymentNote, setPaymentNote] = useState('');
  const [bankInfo, setBankInfo] = useState<{
    holderName: string | null;
    maskedNumber: string | null;
    ifscCode: string | null;
    type: string | null;
  } | null>(null);
  const [loadingBank, setLoadingBank] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(initialPaymentUrl);
  const [gatewayOpened, setGatewayOpened] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const loadBankAndOrder = useCallback(async () => {
    setLoadingBank(true);
    try {
      const [statusRes, invRes] = await Promise.all([
        api.get<AccountStatusResponse>('/buckets/account-status').catch(() => null),
        api.get<InvestmentsResponse>('/buckets/investments').catch(() => null),
      ]);

      if (statusRes?.bankAccount) {
        setBankInfo(statusRes.bankAccount);
      } else if (route.params?.bankAccountNumber) {
        const rawNo = String(route.params.bankAccountNumber);
        setBankInfo({
          holderName: route.params?.bankAccountHolderName ?? null,
          maskedNumber: rawNo.length >= 4 ? `${'•'.repeat(Math.max(0, rawNo.length - 4))}${rawNo.slice(-4)}` : rawNo,
          ifscCode: route.params?.ifscCode ?? null,
          type: route.params?.accountType ?? null,
        });
      }

      if (invRes) {
        if (mode === 'sip' && planId) {
          const matchedPlan = invRes.plans.find((p) => p.id === planId);
          if (matchedPlan?.paymentUrl) setPaymentUrl(matchedPlan.paymentUrl);
        } else if (orderId) {
          const matchedOrder = invRes.orders.find((o) => o.id === orderId);
          if (matchedOrder?.paymentUrl) setPaymentUrl(matchedOrder.paymentUrl);
        }
      }
    } finally {
      setLoadingBank(false);
    }
  }, [mode, orderId, planId, route.params]);

  useEffect(() => {
    void loadBankAndOrder();
  }, [loadBankAndOrder]);

  const handleOpenGateway = async () => {
    if (!paymentUrl) {
      // Do not fake payment success when no gateway URL is present; navigate to the status
      // screen with the actual order status from the server.
      navigation.navigate('PaymentSuccess', {
        orderId,
        planId,
        amount,
        schemeName,
        mode,
        status: initialStatus,
        statusLabel: initialStatusLabel,
        paymentMethod: selectedMethod === 'upi' ? 'UPI' : 'Net Banking',
      });
      return;
    }

    try {
      setGatewayOpened(true);
      await Linking.openURL(paymentUrl);
    } catch {
      Alert.alert(
        'Could Not Open Payment Page',
        'Unable to launch the payment gateway URL. Please try again or check your order in Portfolio.',
      );
    }
  };

  /**
   * Queries GET /buckets/investments, which polls Cybrilla for the real order status,
   * then navigates to PaymentSuccessScreen with the verified status.
   */
  const handleVerifyPaymentStatus = async () => {
    setCheckingStatus(true);
    try {
      const invRes = await api.get<InvestmentsResponse>('/buckets/investments').catch(() => null);
      if (mode === 'sip' && planId && invRes?.plans) {
        const matched = invRes.plans.find((p) => p.id === planId);
        if (matched) {
          navigation.replace('PaymentSuccess', {
            orderId: matched.id,
            planId: matched.id,
            amount: matched.amount,
            schemeName: matched.fundName,
            mode: 'sip',
            status: matched.status,
            statusLabel: matched.statusLabel,
            paymentUrl: matched.paymentUrl,
            paymentMethod: selectedMethod === 'upi' ? 'UPI' : 'Net Banking',
            createdAt: matched.createdAt,
          });
          return;
        }
      }

      if (orderId && invRes?.orders) {
        const matched = invRes.orders.find((o) => o.id === orderId);
        if (matched) {
          navigation.replace('PaymentSuccess', {
            orderId: matched.id,
            amount: matched.amount,
            schemeName: matched.fundName,
            mode,
            status: matched.status,
            statusLabel: matched.statusLabel,
            paymentUrl: matched.paymentUrl,
            folioNumber: matched.folioNumber,
            paymentMethod: selectedMethod === 'upi' ? 'UPI' : 'Net Banking',
            createdAt: matched.createdAt,
          });
          return;
        }
      }

      navigation.replace('PaymentSuccess', {
        orderId,
        planId,
        amount,
        schemeName,
        mode,
        status: initialStatus,
        statusLabel: initialStatusLabel,
        paymentUrl,
        paymentMethod: selectedMethod === 'upi' ? 'UPI' : 'Net Banking',
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCancelOrPayLater = () => {
    Alert.alert(
      'Leave Payment Page?',
      'Your order has already been placed. Units are allotted only once payment succeeds. You can complete payment later from your Portfolio.',
      [
        { text: 'Stay Here', style: 'cancel' },
        {
          text: 'View Order Status',
          onPress: () =>
            navigation.replace('PaymentSuccess', {
              orderId,
              planId,
              amount,
              schemeName,
              mode,
              status: 'CANCELLED_BY_USER',
              statusLabel: 'Payment Deferred / Pending',
              paymentUrl,
            }),
        },
        {
          text: 'Go to Portfolio',
          onPress: () => navigation.navigate('MainTabs', { screen: 'Portfolio' }),
        },
      ],
    );
  };

  const stampDuty = amount > 0 ? (amount * 0.00005).toFixed(2) : '0.00';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title="Complete Payment" onBack={handleCancelOrPayLater} showSettings={false} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Server Order Message Banner */}
        {serverMessage ? (
          <View style={[styles.serverBanner, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF', borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginTop: 1 }} />
            <Text style={[styles.serverBannerText, { color: colors.textSecondary }]}>{serverMessage}</Text>
          </View>
        ) : null}

        {/* Order Summary Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.schemeHeader}>
            <View style={[styles.schemeIconBox, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF' }]}>
              <Ionicons name="trending-up-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.schemeName, { color: colors.textPrimary }]} numberOfLines={2}>
                {schemeName}
              </Text>
              <View style={styles.badgeRow}>
                <View style={[styles.modeBadge, { backgroundColor: isDark ? colors.surfaceMuted : '#F1F5F9' }]}>
                  <Text style={[styles.modeBadgeText, { color: colors.textSecondary }]}>
                    {mode === 'sip' ? 'SIP • First Instalment' : 'One-Time Purchase'}
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{initialStatusLabel}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>
              {mode === 'sip' ? 'SIP Plan Reference' : 'Order Reference'}
            </Text>
            <Text style={[styles.breakdownMono, { color: colors.textPrimary }]}>
              {orderId ?? planId ?? '—'}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>Order Amount</Text>
            <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
              {amount > 0 ? `₹${amount.toLocaleString('en-IN')}` : '—'}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>
              Statutory Stamp Duty (0.005% incl.)
            </Text>
            <Text style={[styles.breakdownValue, { color: colors.textSecondary }]}>₹{stampDuty}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>Amount Payable</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {amount > 0 ? `₹${amount.toLocaleString('en-IN')}` : '—'}
            </Text>
          </View>
        </View>

        {/* Registered Bank Account Rule (SEBI Third-Party Payment Rule) */}
        <View style={[styles.bankNoticeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.labelRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Source Bank Account</Text>
            <View style={[styles.reqTag, { backgroundColor: '#FEF2F2' }]}>
              <Text style={[styles.reqTagText, { color: '#DC2626' }]}>SEBI Rule</Text>
            </View>
          </View>
          <Text style={[styles.bankRuleText, { color: colors.textSecondary }]}>
            Mutual fund payments must come from the bank account registered on your investment account. Payments from any other bank account are rejected by the clearing corporation.
          </Text>

          <View style={[styles.bankDetailBox, { backgroundColor: colors.canvas, borderColor: colors.border }]}>
            <Ionicons name="business-outline" size={18} color={colors.primary} />
            {loadingBank ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : bankInfo?.maskedNumber ? (
              <View style={{ flex: 1 }}>
                <Text style={[styles.bankHolderText, { color: colors.textPrimary }]}>
                  {bankInfo.holderName || 'Registered Bank Account'}
                </Text>
                <Text style={[styles.bankMetaText, { color: colors.textSecondary }]}>
                  Account {bankInfo.maskedNumber}
                  {bankInfo.ifscCode ? ` • IFSC ${bankInfo.ifscCode}` : ''}
                </Text>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <Text style={[styles.bankHolderText, { color: colors.textPrimary }]}>
                  Registered Investment Account Bank
                </Text>
                <Text style={[styles.bankMetaText, { color: colors.textSecondary }]}>
                  Pay using the bank account linked to your TechArtha investment profile.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Method Selection (Mandatory) */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.labelRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Payment Mode on Gateway</Text>
            <View style={[styles.reqTag, { backgroundColor: '#FEF2F2' }]}>
              <Text style={[styles.reqTagText, { color: '#DC2626' }]}>Required</Text>
            </View>
          </View>

          <Pressable
            style={[
              styles.methodRow,
              { backgroundColor: colors.canvas, borderColor: colors.border },
              selectedMethod === 'upi' && { borderColor: colors.primary, backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' },
            ]}
            onPress={() => setSelectedMethod('upi')}
          >
            <Ionicons
              name="flash-outline"
              size={20}
              color={selectedMethod === 'upi' ? colors.primary : colors.textSecondary}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.methodTitle, { color: colors.textPrimary }]}>UPI</Text>
              <Text style={[styles.methodSub, { color: colors.textSecondary }]}>
                Pay via Google Pay, PhonePe, Paytm, BHIM or UPI ID linked to your registered bank
              </Text>
            </View>
            <Ionicons
              name={selectedMethod === 'upi' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={selectedMethod === 'upi' ? colors.primary : colors.textPlaceholder}
            />
          </Pressable>

          <Pressable
            style={[
              styles.methodRow,
              { backgroundColor: colors.canvas, borderColor: colors.border, marginBottom: 0 },
              selectedMethod === 'netbanking' && { borderColor: colors.primary, backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' },
            ]}
            onPress={() => setSelectedMethod('netbanking')}
          >
            <Ionicons
              name="globe-outline"
              size={20}
              color={selectedMethod === 'netbanking' ? colors.primary : colors.textSecondary}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.methodTitle, { color: colors.textPrimary }]}>Net Banking</Text>
              <Text style={[styles.methodSub, { color: colors.textSecondary }]}>
                Authorize payment directly through your bank&apos;s internet banking portal
              </Text>
            </View>
            <Ionicons
              name={selectedMethod === 'netbanking' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={selectedMethod === 'netbanking' ? colors.primary : colors.textPlaceholder}
            />
          </Pressable>

          {/* Optional Remark */}
          <View style={{ marginTop: 16 }}>
            <View style={styles.labelRow}>
              <Text style={[styles.optionalLabel, { color: colors.textPrimary }]}>Transaction Note</Text>
              <View style={[styles.reqTag, { backgroundColor: isDark ? colors.surfaceMuted : '#F1F5F9' }]}>
                <Text style={[styles.reqTagText, { color: colors.textSecondary }]}>Optional</Text>
              </View>
            </View>
            <TextInput
              value={paymentNote}
              onChangeText={setPaymentNote}
              placeholder="Optional personal memo for this investment"
              placeholderTextColor={colors.textPlaceholder}
              style={[styles.optionalInput, { backgroundColor: colors.canvas, borderColor: colors.border, color: colors.textPrimary }]}
            />
          </View>
        </View>

        {/* Gateway Status Notice when Payment Window was Opened */}
        {gatewayOpened ? (
          <View style={[styles.awaitingBox, { backgroundColor: isDark ? '#451A03' : '#FFFBEB', borderColor: '#FDE68A' }]}>
            <Ionicons name="time-outline" size={20} color="#B45309" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.awaitingTitle, { color: isDark ? '#FBBF24' : '#92400E' }]}>
                Payment Window Opened
              </Text>
              <Text style={[styles.awaitingText, { color: isDark ? '#FDE68A' : '#B45309' }]}>
                Once you finish paying in your browser or UPI app, tap &ldquo;Check Payment Status&rdquo; below to verify your order status with Cybrilla.
              </Text>
            </View>
          </View>
        ) : null}

        {!paymentUrl ? (
          <View style={[styles.awaitingBox, { backgroundColor: isDark ? '#451A03' : '#FFFBEB', borderColor: '#FDE68A' }]}>
            <Ionicons name="alert-circle-outline" size={20} color="#B45309" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.awaitingTitle, { color: isDark ? '#FBBF24' : '#92400E' }]}>
                Gateway Payment Link Unavailable
              </Text>
              <Text style={[styles.awaitingText, { color: isDark ? '#FDE68A' : '#B45309' }]}>
                The order is registered, but a live payment URL was not returned by the gateway. You can inspect the current order status or retry from your Portfolio.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {paymentUrl && !gatewayOpened ? (
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => void handleOpenGateway()}
          >
            <Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>
              {amount > 0 ? `Proceed to Pay ₹${amount.toLocaleString('en-IN')}` : 'Proceed to Payment Gateway'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.footerButtonGroup}>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.primary }, checkingStatus && styles.disabledBtn]}
              onPress={() => void handleVerifyPaymentStatus()}
              disabled={checkingStatus}
            >
              {checkingStatus ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="sync-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Check Payment Status</Text>
                </>
              )}
            </Pressable>

            {paymentUrl ? (
              <Pressable
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
                onPress={() => void handleOpenGateway()}
              >
                <Ionicons name="open-outline" size={16} color={colors.primary} />
                <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
                  Re-open Payment Gateway
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 18, paddingBottom: 32 },

  serverBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  serverBannerText: { flex: 1, fontSize: 12, lineHeight: 18 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  schemeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  schemeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schemeName: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  modeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  modeBadgeText: { fontSize: 11, fontWeight: '600' },
  statusBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#B45309' },

  divider: { height: 1, marginVertical: 14 },

  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  breakdownLabel: { fontSize: 12, fontWeight: '600' },
  breakdownValue: { fontSize: 13, fontWeight: '700' },
  breakdownMono: { fontSize: 12, fontWeight: '600' },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 15, fontWeight: '700' },
  totalValue: { fontSize: 20, fontWeight: '800' },

  bankNoticeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  reqTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  reqTagText: { fontSize: 10, fontWeight: '700' },
  bankRuleText: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  bankDetailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bankHolderText: { fontSize: 13, fontWeight: '700' },
  bankMetaText: { fontSize: 12, marginTop: 2 },

  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  methodTitle: { fontSize: 14, fontWeight: '700' },
  methodSub: { fontSize: 11, marginTop: 2, lineHeight: 16 },

  optionalLabel: { fontSize: 13, fontWeight: '700' },
  optionalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13,
  },

  awaitingBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  awaitingTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  awaitingText: { fontSize: 12, lineHeight: 18 },

  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  footerButtonGroup: { gap: 8 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '700' },
  disabledBtn: { opacity: 0.6 },
});
