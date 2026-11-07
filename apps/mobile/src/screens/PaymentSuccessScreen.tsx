import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api/client';

interface OrderRecord {
  id: string;
  fpPurchaseId?: string;
  schemeCode?: string;
  schemeName?: string;
  amount?: number;
  status?: string;
  statusLabel?: string;
  paymentUrl?: string | null;
  confirmedAt?: string | null;
  createdAt?: string;
}

interface PlanRecord {
  id: string;
  fpPlanId?: string;
  schemeCode?: string;
  schemeName?: string;
  amount?: number;
  frequency?: string;
  installmentDay?: number;
  status?: string;
  statusLabel?: string;
  paymentUrl?: string | null;
  createdAt?: string;
}

export const PaymentSuccessScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();

  const paramOrderId: string | null =
    route.params?.orderId ||
    route.params?.purchaseId ||
    route.params?.planId ||
    route.params?.installmentOrderId ||
    route.params?.id ||
    null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchedOrder, setMatchedOrder] = useState<OrderRecord | null>(null);
  const [matchedPlan, setMatchedPlan] = useState<PlanRecord | null>(null);
  const [bankDisplay, setBankDisplay] = useState<string | null>(null);

  const fetchOrderStatus = useCallback(
    async (isManual = false) => {
      try {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        const [invRes, statusRes] = await Promise.all([
          api.get<any>('/buckets/investments').catch(() => null),
          api.get<any>('/buckets/account-status').catch(() => null),
        ]);

        const orders: OrderRecord[] = Array.isArray(invRes?.orders) ? invRes.orders : [];
        const plans: PlanRecord[] = Array.isArray(invRes?.plans) ? invRes.plans : [];

        if (paramOrderId) {
          const foundOrder = orders.find(
            (o) => String(o.fpPurchaseId) === String(paramOrderId) || String(o.id) === String(paramOrderId),
          );
          const foundPlan = plans.find(
            (p) => String(p.fpPlanId) === String(paramOrderId) || String(p.id) === String(paramOrderId),
          );
          if (foundOrder) setMatchedOrder(foundOrder);
          if (foundPlan) setMatchedPlan(foundPlan);
        } else {
          // Deep link without explicit ID: inspect most recent order or plan only if created exist
          if (orders.length > 0) setMatchedOrder(orders[0]);
          else if (plans.length > 0) setMatchedPlan(plans[0]);
        }

        const bankAcc = statusRes?.bankAccount;
        if (bankAcc?.maskedNumber) {
          setBankDisplay(
            `${bankAcc.maskedNumber}${bankAcc.ifscCode ? ` (${bankAcc.ifscCode})` : ''}`,
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [paramOrderId],
  );

  useEffect(() => {
    fetchOrderStatus(false);
  }, [fetchOrderStatus]);

  const rawStatus = (
    matchedOrder?.status ||
    matchedPlan?.status ||
    route.params?.status ||
    'SUBMITTED'
  )
    .toString()
    .toUpperCase();

  const statusLabel =
    matchedOrder?.statusLabel ||
    matchedPlan?.statusLabel ||
    route.params?.statusLabel ||
    null;

  const isConfirmed =
    rawStatus === 'SUCCEEDED' ||
    rawStatus === 'CONFIRMED' ||
    rawStatus === 'ACTIVE' ||
    rawStatus === 'COMPLETED' ||
    rawStatus === 'ALLOTTED';

  const isFailed =
    rawStatus === 'FAILED' ||
    rawStatus === 'REVERSED' ||
    rawStatus === 'REJECTED';

  const isCancelled =
    rawStatus === 'CANCELLED' ||
    rawStatus === 'CANCELLED_BY_USER';

  const displayOrderId =
    matchedOrder?.fpPurchaseId ||
    matchedPlan?.fpPlanId ||
    matchedOrder?.id ||
    matchedPlan?.id ||
    paramOrderId ||
    'Not available';

  const rawAmount =
    matchedOrder?.amount ??
    matchedPlan?.amount ??
    (route.params?.amount != null ? Number(route.params.amount) : null);

  const schemeName =
    matchedOrder?.schemeName ||
    matchedPlan?.schemeName ||
    route.params?.schemeName ||
    null;

  const mode =
    route.params?.mode ||
    (matchedPlan ? 'sip' : 'lumpsum');

  const paymentMethod =
    route.params?.paymentMethod ||
    'UPI / NetBanking (Cybrilla Gateway)';

  const paymentUrl =
    matchedOrder?.paymentUrl ||
    matchedPlan?.paymentUrl ||
    route.params?.paymentUrl ||
    null;

  const createdTimestamp =
    matchedOrder?.createdAt || matchedPlan?.createdAt
      ? new Date((matchedOrder?.createdAt || matchedPlan?.createdAt)!).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : route.params?.timestamp || null;

  const getVisualState = () => {
    if (isConfirmed) {
      return {
        outerBg: '#D1FAE5',
        innerBg: '#10B981',
        icon: 'checkmark-sharp' as const,
        pillBg: '#ECFDF5',
        pillBorder: '#A7F3D0',
        pillColor: '#059669',
        pillText: statusLabel || 'Payment Confirmed • Order Active',
        title: 'Payment Confirmed!',
        subtitle:
          route.params?.message ||
          'Your payment has been verified with Cybrilla and routed to the AMC. Units will be allotted per SEBI settlement timelines.',
      };
    }
    if (isFailed) {
      return {
        outerBg: '#FEE2E2',
        innerBg: '#EF4444',
        icon: 'close-sharp' as const,
        pillBg: '#FEF2F2',
        pillBorder: '#FECACA',
        pillColor: '#DC2626',
        pillText: statusLabel || `Order Status: ${rawStatus}`,
        title: 'Payment Not Completed',
        subtitle:
          route.params?.message ||
          'The payment for this order failed or was reversed by your bank. If any amount was debited, it will be refunded automatically by the clearing corporation.',
      };
    }
    if (isCancelled) {
      return {
        outerBg: '#F1F5F9',
        innerBg: '#64748B',
        icon: 'remove-circle-outline' as const,
        pillBg: '#F8FAFC',
        pillBorder: '#CBD5E1',
        pillColor: '#475569',
        pillText: statusLabel || 'Order Cancelled',
        title: 'Payment Cancelled',
        subtitle:
          route.params?.message ||
          'This order or payment session was cancelled. No mutual fund units have been purchased.',
      };
    }
    return {
      outerBg: '#FEF3C7',
      innerBg: '#F59E0B',
      icon: 'time-outline' as const,
      pillBg: '#FFFBEB',
      pillBorder: '#FDE68A',
      pillColor: '#D97706',
      pillText: statusLabel || `Status: ${rawStatus}`,
      title: 'Order Recorded • Awaiting Confirmation',
      subtitle:
        route.params?.message ||
        'Your order is registered with Cybrilla. Final payment confirmation from your bank or clearing corporation is still pending.',
    };
  };

  const visual = getVisualState();

  const handleOpenPaymentGateway = async () => {
    if (!paymentUrl) {
      Alert.alert(
        'Payment Link Unavailable',
        'You can check or complete pending payments directly from the Orders tab in your Portfolio.',
      );
      return;
    }
    try {
      await Linking.openURL(paymentUrl);
    } catch {
      Alert.alert('Error', 'Unable to open the payment gateway URL.');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top', 'right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />

      {/* Top Header with Back Button */}
      <View style={[styles.topHeader, { borderBottomColor: colors.borderSubtle }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.topHeaderTitle, { color: colors.textPrimary }]}>Order & Payment Status</Text>
        <Pressable onPress={() => fetchOrderStatus(true)} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Status Block */}
        <View style={styles.heroSection}>
          <View style={[styles.iconRingOuter, { backgroundColor: visual.outerBg }]}>
            <View style={[styles.iconRingInner, { backgroundColor: visual.innerBg }]}>
              <Ionicons name={visual.icon} size={38} color="#FFFFFF" />
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: visual.pillBg, borderColor: visual.pillBorder }]}>
            <View style={[styles.liveDot, { backgroundColor: visual.pillColor }]} />
            <Text style={[styles.statusPillText, { color: visual.pillColor }]}>{visual.pillText}</Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{visual.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{visual.subtitle}</Text>
        </View>

        {/* Transaction Summary Card */}
        <View style={[styles.receiptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.receiptHeader}>
            <Text style={[styles.receiptTitle, { color: colors.textPrimary }]}>Order Summary</Text>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <View
                style={[
                  styles.verifiedTag,
                  {
                    backgroundColor: isConfirmed
                      ? isDark
                        ? '#064E3B'
                        : '#ECFDF5'
                      : isFailed
                        ? '#FEF2F2'
                        : '#FFFBEB',
                  },
                ]}
              >
                <Ionicons
                  name={isConfirmed ? 'shield-checkmark' : isFailed ? 'alert-circle' : 'sync-outline'}
                  size={13}
                  color={isConfirmed ? '#059669' : isFailed ? '#DC2626' : '#D97706'}
                />
                <Text
                  style={[
                    styles.verifiedTagText,
                    { color: isConfirmed ? '#059669' : isFailed ? '#DC2626' : '#D97706' },
                  ]}
                >
                  {rawStatus}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Amount Display (only shown when real amount is present) */}
          {rawAmount != null && !Number.isNaN(rawAmount) && rawAmount > 0 && (
            <>
              <View style={styles.amountDisplayRow}>
                <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
                  {isConfirmed ? 'Amount Paid' : 'Order Amount'}
                </Text>
                <Text style={[styles.amountValue, { color: colors.primary }]}>
                  ₹{Number(rawAmount).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
            </>
          )}

          {/* Detail Rows */}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Order / Plan ID</Text>
            <Text style={[styles.rowValMono, { color: colors.textPrimary }]}>{displayOrderId}</Text>
          </View>

          {schemeName && (
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Scheme / Bucket</Text>
              <Text style={[styles.rowVal, { color: colors.textPrimary, maxWidth: '62%', textAlign: 'right' }]}>
                {schemeName}
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Investment Type</Text>
            <Text style={[styles.rowVal, { color: colors.textPrimary }]}>
              {mode === 'sip' ? 'Systematic Investment Plan (SIP)' : 'One-Time Lumpsum'}
            </Text>
          </View>

          {bankDisplay && (
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Registered Bank</Text>
              <Text style={[styles.rowVal, { color: colors.textPrimary }]}>{bankDisplay}</Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Payment Channel</Text>
            <Text style={[styles.rowVal, { color: colors.textPrimary }]}>{paymentMethod}</Text>
          </View>

          {createdTimestamp && (
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Recorded At</Text>
              <Text style={[styles.rowVal, { color: colors.textSecondary }]}>{createdTimestamp}</Text>
            </View>
          )}

          {isConfirmed && (
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textMuted }]}>NAV Allotment Timeline</Text>
              <View style={styles.allotmentBadge}>
                <Ionicons name="time-outline" size={14} color="#0284C7" />
                <Text style={styles.allotmentText}>T+1 / T+2 Business Days</Text>
              </View>
            </View>
          )}
        </View>

        {/* Informational Guidance Callout */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF', borderColor: colors.border },
          ]}
        >
          <Ionicons
            name={isConfirmed ? 'mail-outline' : 'information-circle-outline'}
            size={20}
            color={colors.primary}
            style={{ marginTop: 2 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBoxTitle, { color: colors.primary }]}>
              {isConfirmed ? 'Folio & Allotment Confirmation' : 'Live Status Synchronisation'}
            </Text>
            <Text style={[styles.infoBoxText, { color: colors.textSecondary }]}>
              {isConfirmed
                ? 'The Asset Management Company (AMC) will issue units and email your official statement. You can track live NAV valuations inside your TechArtha portfolio.'
                : 'TechArtha polls Cybrilla directly for live order status. Once your bank completes the transfer, tap "Refresh Payment Status" below or check your Portfolio Orders tab.'}
            </Text>
          </View>
        </View>

        {/* CTAs */}
        <View style={styles.actionContainer}>
          {!isConfirmed && !isCancelled && (
            <Pressable
              style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={() => fetchOrderStatus(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                    Refresh Payment Status
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {!isConfirmed && !isCancelled && paymentUrl && (
            <Pressable
              style={[styles.primaryButton, { backgroundColor: '#10B981' }]}
              onPress={handleOpenPaymentGateway}
            >
              <Ionicons name="open-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Open Cybrilla Payment Gateway</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Portfolio' })}
          >
            <Ionicons name="pie-chart-outline" size={19} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>View Orders in Portfolio</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Funds')}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>Explore Mutual Funds</Text>
          </Pressable>

          <Pressable
            style={styles.tertiaryButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          >
            <Text style={[styles.tertiaryButtonText, { color: colors.textMuted }]}>Return to Dashboard</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  topHeaderTitle: { fontSize: 16, fontWeight: '800' },
  container: { padding: 20, paddingBottom: 40 },
  heroSection: { alignItems: 'center', marginVertical: 12 },
  iconRingOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconRingInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    marginBottom: 10,
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusPillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, lineHeight: 19, textAlign: 'center', paddingHorizontal: 10, marginBottom: 10 },

  receiptCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptTitle: { fontSize: 14, fontWeight: '800' },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedTagText: { fontSize: 10, fontWeight: '800' },
  divider: { height: 1, marginVertical: 12 },

  amountDisplayRow: { alignItems: 'center', paddingVertical: 6 },
  amountLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  amountValue: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  rowLabel: { fontSize: 12, fontWeight: '500' },
  rowVal: { fontSize: 13, fontWeight: '700' },
  rowValMono: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  allotmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  allotmentText: { fontSize: 11, fontWeight: '800', color: '#0369A1' },

  infoBox: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 22,
  },
  infoBoxTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  infoBoxText: { fontSize: 11, lineHeight: 16 },

  actionContainer: { gap: 10 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '700' },
  tertiaryButton: { alignItems: 'center', paddingVertical: 10 },
  tertiaryButtonText: { fontSize: 13, fontWeight: '600' },
});
