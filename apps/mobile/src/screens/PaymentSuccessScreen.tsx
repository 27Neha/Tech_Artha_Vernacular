import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export const PaymentSuccessScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();

  const orderId = route.params?.orderId || 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const amount = route.params?.amount || 5000;
  const schemeName = route.params?.schemeName || 'Direct Plan Mutual Fund';
  const mode = route.params?.mode || 'lumpsum';
  const paymentMethod = route.params?.paymentMethod || 'UPI / NetBanking';
  const timestamp = route.params?.timestamp || new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top', 'right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Success Block */}
        <View style={styles.heroSection}>
          <View style={styles.iconRingOuter}>
            <View style={styles.iconRingInner}>
              <Ionicons name="checkmark-sharp" size={44} color="#FFFFFF" />
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <View style={styles.liveDot} />
            <Text style={styles.statusPillText}>Payment Received by Clearing Corp</Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Order Placed Successfully!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your mutual fund purchase order has been routed to the AMC via BSE StarMF / Cybrilla. Units will be credited to your folio.
          </Text>
        </View>

        {/* Transaction Receipt Card */}
        <View style={[styles.receiptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.receiptHeader}>
            <Text style={[styles.receiptTitle, { color: colors.textPrimary }]}>Transaction Receipt</Text>
            <View style={[styles.verifiedTag, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <Ionicons name="shield-checkmark" size={13} color={isDark ? '#34D399' : '#059669'} />
              <Text style={[styles.verifiedTagText, { color: isDark ? '#34D399' : '#059669' }]}>SEBI / ICCL Verified</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Amount Paid Big Display */}
          <View style={styles.amountDisplayRow}>
            <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Total Amount Paid</Text>
            <Text style={[styles.amountValue, { color: colors.primary }]}>
              ₹{Number(amount).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Detail Rows */}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Order ID</Text>
            <Text style={[styles.rowValMono, { color: colors.textPrimary }]}>{orderId}</Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Scheme Name</Text>
            <Text style={[styles.rowVal, { color: colors.textPrimary, maxWidth: '60%', textAlign: 'right' }]}>
              {schemeName}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Investment Type</Text>
            <Text style={[styles.rowVal, { color: colors.textPrimary }]}>
              {mode === 'sip' ? 'Monthly SIP (1st Instalment)' : 'One-Time Lumpsum'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Payment Method</Text>
            <Text style={[styles.rowVal, { color: colors.textPrimary }]}>{paymentMethod}</Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Payment Timestamp</Text>
            <Text style={[styles.rowVal, { color: colors.textSecondary }]}>{timestamp}</Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>NAV Allotment Timeline</Text>
            <View style={styles.allotmentBadge}>
              <Ionicons name="time-outline" size={14} color="#0284C7" />
              <Text style={styles.allotmentText}>T+1 / T+2 Business Days</Text>
            </View>
          </View>
        </View>

        {/* Informational Guidance Callout */}
        <View style={[styles.infoBox, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF', borderColor: colors.border }]}>
          <Ionicons name="mail-outline" size={20} color={colors.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBoxTitle, { color: colors.primary }]}>Folio & Allotment Confirmation</Text>
            <Text style={[styles.infoBoxText, { color: colors.textSecondary }]}>
              The fund house (AMC) will issue units and email your official Consolidated Account Statement (CAS). You can track real-time valuations inside your TechArtha portfolio.
            </Text>
          </View>
        </View>

        {/* CTAs */}
        <View style={styles.actionContainer}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Portfolio' })}
          >
            <Ionicons name="pie-chart-outline" size={19} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>View in My Portfolio</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Funds')}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>Explore More Schemes</Text>
          </Pressable>

          <Pressable
            style={styles.tertiaryButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          >
            <Text style={[styles.tertiaryButtonText, { color: colors.textMuted }]}>Go to Dashboard</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  heroSection: { alignItems: 'center', marginVertical: 14, textAlign: 'center' },
  iconRingOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconRingInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#059669' },
  statusPillText: { fontSize: 11, fontWeight: '800', color: '#059669', textTransform: 'uppercase' },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, lineHeight: 19, textAlign: 'center', paddingHorizontal: 12, marginBottom: 10 },

  receiptCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptTitle: { fontSize: 14, fontWeight: '800' },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  verifiedTagText: { fontSize: 10, fontWeight: '800' },
  divider: { height: 1, marginVertical: 12 },

  amountDisplayRow: { alignItems: 'center', paddingVertical: 6 },
  amountLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  amountValue: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  rowLabel: { fontSize: 12, fontWeight: '500' },
  rowVal: { fontSize: 13, fontWeight: '700' },
  rowValMono: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  allotmentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  allotmentText: { fontSize: 11, fontWeight: '800', color: '#0369A1' },

  infoBox: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 24,
  },
  infoBoxTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  infoBoxText: { fontSize: 11, lineHeight: 16 },

  actionContainer: { gap: 10 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#3C3985',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondaryButton: {
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
