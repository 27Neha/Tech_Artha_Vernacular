import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { api } from '../services/api/client';
import { useTheme } from '../context/ThemeContext';
import type { MandateItem } from './MandateScreen';

type MandatesResponse = {
  canCreate: boolean;
  mandates: MandateItem[];
  message: string | null;
};

type AccountStatusResponse = {
  hasInvestmentAccount: boolean;
  bankAccount: {
    holderName: string | null;
    maskedNumber: string | null;
    ifscCode: string | null;
    type: string | null;
  } | null;
};

export const MandateSuccessScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();

  const paramMandateId: string | undefined = route.params?.mandateId;

  const [mandate, setMandate] = useState<MandateItem | null>(() => {
    if (!paramMandateId && !route.params?.status) return null;
    return {
      id: paramMandateId ?? '',
      mandateType: route.params?.mandateType ?? 'UPI',
      mandateLimit: Number(route.params?.mandateLimit ?? 0),
      status: route.params?.status ?? 'CREATED',
      umrn: route.params?.umrn ?? null,
      authorizationUrl: route.params?.authorizationUrl ?? null,
      createdAt: route.params?.createdAt ?? new Date().toISOString(),
    };
  });
  const [bankAccount, setBankAccount] = useState<AccountStatusResponse['bankAccount']>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [reauthorizing, setReauthorizing] = useState(false);

  const syncMandateStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const [mandatesRes, statusRes] = await Promise.all([
        api.get<MandatesResponse>('/mandates').catch(() => null),
        api.get<AccountStatusResponse>('/buckets/account-status').catch(() => null),
      ]);

      if (statusRes?.bankAccount) {
        setBankAccount(statusRes.bankAccount);
      }

      const list = mandatesRes?.mandates ?? [];
      if (list.length > 0) {
        const matched = paramMandateId
          ? list.find((m) => m.id === paramMandateId) ?? list[0]
          : list[0];
        setMandate(matched);
      }
    } finally {
      setRefreshing(false);
    }
  }, [paramMandateId]);

  useEffect(() => {
    void syncMandateStatus();
  }, [syncMandateStatus]);

  const handleOpenBankAuthorization = async () => {
    if (!mandate?.id) return;
    setReauthorizing(true);
    try {
      const updated = await api.post<MandateItem>(`/mandates/${encodeURIComponent(mandate.id)}/authorize`, {});
      setMandate(updated);
      if (updated.authorizationUrl) {
        await Linking.openURL(updated.authorizationUrl);
      } else {
        Alert.alert('Status Updated', `Current mandate status: ${updated.status}`);
      }
    } catch (e) {
      if (mandate.authorizationUrl) {
        await Linking.openURL(mandate.authorizationUrl).catch(() => {
          Alert.alert('Could not open approval page', 'Please try again from the Mandates screen.');
        });
      } else {
        Alert.alert('Could not open approval page', e instanceof Error ? e.message : 'Please try again.');
      }
    } finally {
      setReauthorizing(false);
    }
  };

  const status = (mandate?.status ?? 'PENDING_VERIFICATION').toUpperCase();
  const isApproved = status === 'APPROVED';
  const isFailed = ['REJECTED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(status);
  const isPending = !isApproved && !isFailed;

  const heroTone = isApproved
    ? {
        ringOuter: 'rgba(16, 185, 129, 0.14)',
        ringInner: '#059669',
        icon: 'checkmark-sharp' as const,
        pillBg: '#ECFDF5',
        pillBorder: '#A7F3D0',
        pillText: '#059669',
        pillLabel: 'Approved by Bank & NPCI',
        title: 'Mandate Approved',
        subtitle:
          'Your bank has approved this auto-debit mandate. You can now use it to collect recurring SIP instalments automatically.',
      }
    : isFailed
      ? {
          ringOuter: 'rgba(220, 38, 38, 0.14)',
          ringInner: '#DC2626',
          icon: 'close-sharp' as const,
          pillBg: '#FEF2F2',
          pillBorder: '#FECACA',
          pillText: '#DC2626',
          pillLabel: `Mandate ${status.charAt(0) + status.slice(1).toLowerCase()}`,
          title: 'Mandate Not Approved',
          subtitle:
            'Your bank or clearing house did not approve this mandate request. You can set up a fresh mandate from the Mandates page.',
        }
      : {
          ringOuter: 'rgba(217, 119, 6, 0.14)',
          ringInner: '#D97706',
          icon: 'time-outline' as const,
          pillBg: '#FFFBEB',
          pillBorder: '#FDE68A',
          pillText: '#B45309',
          pillLabel: status === 'SUBMITTED' ? 'Submitted to Bank' : 'Awaiting Bank Confirmation',
          title: 'Mandate Authorization in Progress',
          subtitle:
            'Return here after approving the mandate with your bank. Bank and NPCI confirmation can take a few minutes to reflect.',
        };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title="Mandate Status" onBack={() => navigation.navigate('Mandates')} showSettings={false} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Status Block */}
        <View style={styles.heroSection}>
          <View style={[styles.iconRingOuter, { backgroundColor: heroTone.ringOuter }]}>
            <View style={[styles.iconRingInner, { backgroundColor: heroTone.ringInner }]}>
              <Ionicons name={heroTone.icon} size={40} color="#FFFFFF" />
            </View>
          </View>

          <View style={[styles.statusPill, { backgroundColor: heroTone.pillBg, borderColor: heroTone.pillBorder }]}>
            <Text style={[styles.statusPillText, { color: heroTone.pillText }]}>{heroTone.pillLabel}</Text>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{heroTone.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{heroTone.subtitle}</Text>
        </View>

        {/* Mandate Details Card */}
        <View style={[styles.receiptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.receiptHeader}>
            <Text style={[styles.receiptTitle, { color: colors.textPrimary }]}>Mandate Details</Text>
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Pressable onPress={() => void syncMandateStatus()} style={styles.syncChip} hitSlop={8}>
                <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                <Text style={[styles.syncChipText, { color: colors.primary }]}>Refresh</Text>
              </Pressable>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Mandate Reference ID</Text>
            <Text style={[styles.rowValMono, { color: colors.textPrimary }]}>
              {mandate?.id || '—'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>NPCI UMRN</Text>
            <Text style={[styles.rowValMono, { color: colors.textPrimary }]}>
              {mandate?.umrn ? mandate.umrn : 'Assigned upon bank approval'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Mandate Method</Text>
            <Text style={[styles.rowVal, { color: colors.textPrimary }]}>
              {mandate
                ? mandate.mandateType === 'UPI'
                  ? 'UPI Autopay'
                  : 'e-NACH'
                : '—'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Linked Bank Account</Text>
            <Text style={[styles.rowVal, { color: colors.textPrimary }]}>
              {bankAccount?.maskedNumber
                ? `${bankAccount.holderName ? `${bankAccount.holderName} • ` : ''}${bankAccount.maskedNumber}`
                : 'Registered investment account'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Max Limit per Instalment</Text>
            <Text style={[styles.rowValHighlight, { color: colors.primary }]}>
              {mandate?.mandateLimit ? `₹${Number(mandate.mandateLimit).toLocaleString('en-IN')}` : '—'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Gateway Status</Text>
            <Text style={[styles.rowVal, { color: heroTone.pillText, fontWeight: '800' }]}>
              {mandate?.status ?? 'Awaiting Mandate'}
            </Text>
          </View>
        </View>

        {/* Regulatory Note */}
        <View style={[styles.infoBox, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF', borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBoxTitle, { color: colors.primary }]}>How Auto-Debit Works</Text>
            <Text style={[styles.infoBoxText, { color: colors.textSecondary }]}>
              A mandate only sets the ceiling your bank allows per instalment. Money is debited only when you have an active SIP on its scheduled instalment date.
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionContainer}>
          {isPending && mandate?.id ? (
            <>
              <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.primary }, refreshing && styles.disabledBtn]}
                onPress={() => void syncMandateStatus()}
                disabled={refreshing}
              >
                <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  {refreshing ? 'Checking with Bank...' : 'Check Approval Status'}
                </Text>
              </Pressable>

              {mandate.authorizationUrl ? (
                <Pressable
                  style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
                  onPress={() => void handleOpenBankAuthorization()}
                  disabled={reauthorizing}
                >
                  <Ionicons name="open-outline" size={17} color={colors.primary} />
                  <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                    {reauthorizing ? 'Opening Bank Page...' : 'Open Bank Approval Page'}
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {isApproved ? (
            <Pressable
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Funds')}
            >
              <Ionicons name="trending-up-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Explore Funds & Start a SIP</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Mandates')}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>
              Back to Auto-Debit Mandates
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, paddingBottom: 44 },

  heroSection: { alignItems: 'center', marginTop: 8, marginBottom: 22 },
  iconRingOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconRingInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  statusPillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 8 },

  receiptCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptTitle: { fontSize: 15, fontWeight: '700' },
  syncChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  syncChipText: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, marginVertical: 14 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLabel: { fontSize: 12, fontWeight: '600', flex: 1 },
  rowVal: { fontSize: 13, fontWeight: '700', textAlign: 'right', flex: 1 },
  rowValMono: { fontSize: 12, fontWeight: '600', textAlign: 'right', flex: 1 },
  rowValHighlight: { fontSize: 15, fontWeight: '800', textAlign: 'right' },

  infoBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 22,
  },
  infoBoxTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  infoBoxText: { fontSize: 12, lineHeight: 18 },

  actionContainer: { gap: 10 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '700' },
  disabledBtn: { opacity: 0.6 },
});
