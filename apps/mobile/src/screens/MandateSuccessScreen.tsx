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

export const MandateSuccessScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();

  const mandateId = route.params?.mandateId || 'MND-' + Math.floor(100000 + Math.random() * 900000);
  const mandateType = route.params?.mandateType || 'UPI';
  const mandateLimit = route.params?.mandateLimit || 10000;
  const umrn = route.params?.umrn || 'NACH' + Math.floor(1000000000 + Math.random() * 9000000000);
  const status = route.params?.status || 'APPROVED';
  const bankName = route.params?.bankName || 'Verified Investor Bank';
  const accountEnding = route.params?.accountEnding || '••••4321';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top', 'right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Animated Badge & Success Illustration */}
        <View style={styles.heroSection}>
          <View style={styles.iconRingOuter}>
            <View style={styles.iconRingInner}>
              <Ionicons name="checkmark-sharp" size={44} color="#FFFFFF" />
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <View style={styles.liveDot} />
            <Text style={styles.statusPillText}>Mandate Successfully Registered</Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Auto-Debit Configured</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your bank has approved the recurring mandate. You can now start automated SIP investments without manual UPI PIN entry each month.
          </Text>
        </View>

        {/* Mandate Receipt Card */}
        <View style={[styles.receiptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.receiptHeader}>
            <Text style={[styles.receiptTitle, { color: colors.textPrimary }]}>Mandate Authorization Summary</Text>
            <View style={[styles.verifiedTag, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <Ionicons name="shield-checkmark" size={13} color={isDark ? '#34D399' : '#059669'} />
              <Text style={[styles.verifiedTagText, { color: isDark ? '#34D399' : '#059669' }]}>NPCI / RBI Active</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Key-Value Rows */}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Mandate Reference ID</Text>
            <Text style={[styles.rowValMono, { color: colors.textPrimary }]}>{mandateId}</Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>NPCI UMRN</Text>
            <Text style={[styles.rowValMono, { color: colors.textPrimary }]}>{umrn}</Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Debit Type</Text>
            <Text style={[styles.rowVal, { color: colors.textPrimary }]}>
              {mandateType === 'UPI' ? 'UPI Autopay' : 'e-NACH NetBanking'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Authorized Bank</Text>
            <Text style={[styles.rowVal, { color: colors.textPrimary }]}>{bankName} ({accountEnding})</Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Maximum Limit per Debit</Text>
            <Text style={[styles.rowValHighlight, { color: colors.primary }]}>
              ₹{Number(mandateLimit).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Authorization Status</Text>
            <View style={styles.statusRowBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.statusSuccessText}>{status}</Text>
            </View>
          </View>
        </View>

        {/* Security & Regulatory Callout */}
        <View style={[styles.infoBox, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF', borderColor: colors.border }]}>
          <Ionicons name="information-circle" size={22} color={colors.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBoxTitle, { color: colors.primary }]}>Zero Unauthorized Deductions</Text>
            <Text style={[styles.infoBoxText, { color: colors.textSecondary }]}>
              Money is only deducted when you have an active, confirmed SIP order on its scheduled instalment date. You will receive an SMS reminder 48 hours prior to any deduction.
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionContainer}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Funds')}
          >
            <Ionicons name="compass-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Explore Funds & Start SIP</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('ActiveMandates')}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>View All Mandates</Text>
          </Pressable>

          <Pressable
            style={styles.tertiaryButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Portfolio' })}
          >
            <Text style={[styles.tertiaryButtonText, { color: colors.textMuted }]}>Return to Portfolio</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  heroSection: { alignItems: 'center', marginVertical: 16, textAlign: 'center' },
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
    marginBottom: 12,
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#059669' },
  statusPillText: { fontSize: 11, fontWeight: '800', color: '#059669', textTransform: 'uppercase' },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 13, lineHeight: 20, textAlign: 'center', paddingHorizontal: 10, marginBottom: 12 },

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
  divider: { height: 1, marginVertical: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowLabel: { fontSize: 12, fontWeight: '500' },
  rowVal: { fontSize: 13, fontWeight: '700' },
  rowValMono: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  rowValHighlight: { fontSize: 15, fontWeight: '900' },
  statusRowBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusSuccessText: { fontSize: 13, fontWeight: '800', color: '#10B981' },

  infoBox: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 24,
  },
  infoBoxTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  infoBoxText: { fontSize: 11, lineHeight: 17 },

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
