import React, { useCallback, useState } from 'react';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api/client';
import { useTheme } from '../context/ThemeContext';

/**
 * Auto-debit mandates (UPI Autopay and e-NACH) — GET/POST /mandates & POST /mandates/:id/authorize.
 *
 * Combines the real Cybrilla/ONDC gateway contract (status polling on focus, re-authorization
 * token refresh, and zero fabricated UMRNs) with a structured WealthTech UI that distinguishes
 * mandatory fields from optional fields.
 */
export type MandateItem = {
  id: string;
  mandateType: 'UPI' | 'E_MANDATE';
  mandateLimit: number;
  status: string;
  umrn: string | null;
  authorizationUrl: string | null;
  createdAt: string;
};

type MandatesResponse = {
  canCreate: boolean;
  mandates: MandateItem[];
  message: string | null;
};

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

const PRESET_LIMITS = [1000, 5000, 10000, 25000, 50000];

const STATUS_META: Record<
  string,
  { label: string; bg: string; border: string; text: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  APPROVED: {
    label: 'Approved',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    text: '#059669',
    icon: 'checkmark-circle',
  },
  CREATED: {
    label: 'Awaiting Bank Approval',
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#B45309',
    icon: 'time-outline',
  },
  SUBMITTED: {
    label: 'Submitted to Bank',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    text: '#1D4ED8',
    icon: 'sync-outline',
  },
  REJECTED: {
    label: 'Rejected',
    bg: '#FEF2F2',
    border: '#FECACA',
    text: '#DC2626',
    icon: 'close-circle-outline',
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: '#F1F5F9',
    border: '#CBD5E1',
    text: '#475569',
    icon: 'ban-outline',
  },
  EXPIRED: {
    label: 'Expired',
    bg: '#F1F5F9',
    border: '#CBD5E1',
    text: '#475569',
    icon: 'alert-circle-outline',
  },
  FAILED: {
    label: 'Failed',
    bg: '#FEF2F2',
    border: '#FECACA',
    text: '#DC2626',
    icon: 'alert-circle-outline',
  },
};

export const MandateScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();

  const [data, setData] = useState<MandatesResponse | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Neither has an unchosen silent submission: investor actively selects protocol and limit
  const [mandateType, setMandateType] = useState<'UPI' | 'E_MANDATE' | null>(null);
  const [limit, setLimit] = useState('');
  const [referenceLabel, setReferenceLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authorizingId, setAuthorizingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [mandatesRes, statusRes] = await Promise.all([
        api.get<MandatesResponse>('/mandates'),
        api.get<AccountStatusResponse>('/buckets/account-status').catch(() => null),
      ]);
      setData(mandatesRes);
      if (mandatesRes?.mandates) {
        await AsyncStorage.setItem('techartha_active_mandates', JSON.stringify(mandatesRes.mandates));
      }
      if (statusRes) {
        setAccountStatus(statusRes);
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load your mandates.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh whenever the screen gains focus (e.g., returning from the bank's approval page)
  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const openAuthorizationUrl = async (url: string, mandate: MandateItem) => {
    try {
      await Linking.openURL(url);
      navigation.navigate('MandateSuccess', {
        mandateId: mandate.id,
        mandateType: mandate.mandateType,
        mandateLimit: mandate.mandateLimit,
        umrn: mandate.umrn,
        status: mandate.status,
        authorizationUrl: url,
      });
    } catch {
      Alert.alert('Could not open the bank approval page', 'Please try again.');
    }
  };

  /**
   * Requests a fresh authorization URL from POST /mandates/:id/authorize for a mandate
   * that is still awaiting bank approval, then opens it in the browser.
   */
  const handleReauthorize = async (mandate: MandateItem) => {
    setAuthorizingId(mandate.id);
    try {
      const updated = await api.post<MandateItem>(`/mandates/${encodeURIComponent(mandate.id)}/authorize`, {});
      await loadData();
      if (updated.authorizationUrl) {
        await openAuthorizationUrl(updated.authorizationUrl, updated);
      } else {
        Alert.alert(
          'Authorization Link Unavailable',
          'The gateway did not return an active authorization link for this mandate. Check its status below.',
        );
      }
    } catch (e) {
      Alert.alert('Could not open approval page', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setAuthorizingId(null);
    }
  };

  const handleCreateMandate = async () => {
    if (!mandateType) {
      Alert.alert('Select Mandate Method', 'Please choose UPI Autopay or e-NACH before continuing.');
      return;
    }
    const numericLimit = Number(limit);
    if (!Number.isFinite(numericLimit) || numericLimit < 100) {
      Alert.alert(
        'Enter Valid Debit Limit',
        'Enter the maximum amount that may be debited per SIP instalment (at least ₹100).',
      );
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.post<MandateItem>('/mandates', {
        mandateType,
        mandateLimit: numericLimit,
      });
      setMandateType(null);
      setLimit('');
      setReferenceLabel('');
      await loadData();

      if (created.authorizationUrl) {
        Alert.alert(
          'Mandate Created — Approve with Your Bank',
          'Your mandate request has been registered with the gateway. Complete bank authorization now so SIPs can use it.',
          [
            {
              text: 'View Status',
              style: 'cancel',
              onPress: () =>
                navigation.navigate('MandateSuccess', {
                  mandateId: created.id,
                  mandateType: created.mandateType,
                  mandateLimit: created.mandateLimit,
                  umrn: created.umrn,
                  status: created.status,
                  authorizationUrl: created.authorizationUrl,
                }),
            },
            {
              text: 'Approve Now',
              onPress: () => void openAuthorizationUrl(created.authorizationUrl!, created),
            },
          ],
        );
      } else {
        navigation.navigate('MandateSuccess', {
          mandateId: created.id,
          mandateType: created.mandateType,
          mandateLimit: created.mandateLimit,
          umrn: created.umrn,
          status: created.status,
        });
      }
    } catch (e) {
      Alert.alert(
        'Could Not Register Mandate',
        e instanceof Error ? e.message : 'Please try again once your investment account is active.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const bank = accountStatus?.bankAccount ?? null;
  const mandates = data?.mandates ?? [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title="Auto-Debit Mandates" onBack={() => navigation.goBack()} showSettings={false} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Intro Block */}
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Auto-Debit Mandates</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            A SIP collects each recurring instalment from your registered bank account through an approved UPI Autopay or e-NACH mandate.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Syncing mandate status with gateway...
            </Text>
          </View>
        ) : null}

        {loadError ? (
          <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorBannerTitle}>Could not load mandates</Text>
              <Text style={styles.errorBannerText}>{loadError}</Text>
            </View>
            <Pressable onPress={() => void loadData()} style={styles.retryChip}>
              <Text style={styles.retryChipText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Prerequisite Notice from Backend when Investment Account is not open yet */}
        {data?.message ? (
          <View style={[styles.noticeCard, { backgroundColor: isDark ? '#451A03' : '#FFFBEB', borderColor: '#FDE68A' }]}>
            <Ionicons name="information-circle-outline" size={20} color="#B45309" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.noticeTitle, { color: isDark ? '#FBBF24' : '#92400E' }]}>
                Investment Account Required for Gateway Authorization
              </Text>
              <Text style={[styles.noticeText, { color: isDark ? '#FDE68A' : '#B45309' }]}>
                {data.message}
              </Text>
              <View style={styles.noticeActions}>
                <Pressable style={styles.noticeActionBtn} onPress={() => navigation.navigate('Funds')}>
                  <Text style={styles.noticeActionBtnText}>Explore Funds</Text>
                  <Ionicons name="arrow-forward" size={14} color="#B45309" />
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {/* ============================================================== */}
        {/* EXISTING MANDATES LIST                                         */}
        {/* ============================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
            YOUR MANDATES ({mandates.length})
          </Text>
          {!loading && (
            <Pressable onPress={() => void loadData()} style={styles.refreshRowBtn} hitSlop={8}>
              <Ionicons name="refresh-outline" size={14} color={colors.primary} />
              <Text style={[styles.refreshRowText, { color: colors.primary }]}>Refresh</Text>
            </Pressable>
          )}
        </View>

        {mandates.length === 0 && !loading ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF' }]}>
              <Ionicons name="repeat-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Auto-Debit Mandates Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Once you set up and approve a UPI Autopay or e-NACH mandate below, it will appear here with its live bank status and UMRN.
            </Text>
          </View>
        ) : (
          mandates.map((m) => {
            const meta = STATUS_META[m.status] ?? {
              label: m.status,
              bg: '#FFFBEB',
              border: '#FDE68A',
              text: '#B45309',
              icon: 'time-outline' as const,
            };
            const isAuthorizing = authorizingId === m.id;

            return (
              <View key={m.id} style={[styles.mandateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.mandateTopRow}>
                  <View style={styles.mandateTitleGroup}>
                    <View style={[styles.typeIconBox, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF' }]}>
                      <Ionicons
                        name={m.mandateType === 'UPI' ? 'flash-outline' : 'business-outline'}
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <View>
                      <Text style={[styles.mandateTypeTitle, { color: colors.textPrimary }]}>
                        {m.mandateType === 'UPI' ? 'UPI Autopay' : 'e-NACH Mandate'}
                      </Text>
                      <Text style={[styles.mandateDateText, { color: colors.textSecondary }]}>
                        Created {new Date(m.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                    <Ionicons name={meta.icon} size={13} color={meta.text} />
                    <Text style={[styles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

                <View style={styles.mandateMetricsRow}>
                  <View style={styles.metricCol}>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Max Debit per Instalment</Text>
                    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                      ₹{Number(m.mandateLimit).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.metricCol}>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>NPCI UMRN</Text>
                    <Text style={[styles.metricValueMono, { color: colors.textSecondary }]}>
                      {m.umrn ? m.umrn : 'Pending bank approval'}
                    </Text>
                  </View>
                </View>

                <View style={styles.mandateActionsRow}>
                  {m.authorizationUrl ? (
                    <Pressable
                      style={[styles.approveBankBtn, { backgroundColor: colors.primary }, isAuthorizing && styles.disabledBtn]}
                      onPress={() => void handleReauthorize(m)}
                      disabled={isAuthorizing}
                    >
                      {isAuthorizing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="open-outline" size={15} color="#FFFFFF" />
                          <Text style={styles.approveBankBtnText}>Approve with Bank</Text>
                        </>
                      )}
                    </Pressable>
                  ) : null}

                  <Pressable
                    style={[styles.detailsBtn, { borderColor: colors.border, backgroundColor: colors.canvas }]}
                    onPress={() =>
                      navigation.navigate('MandateSuccess', {
                        mandateId: m.id,
                        mandateType: m.mandateType,
                        mandateLimit: m.mandateLimit,
                        umrn: m.umrn,
                        status: m.status,
                        authorizationUrl: m.authorizationUrl,
                        createdAt: m.createdAt,
                      })
                    }
                  >
                    <Text style={[styles.detailsBtnText, { color: colors.textPrimary }]}>View Details</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        {/* ============================================================== */}
        {/* SET UP A NEW MANDATE FORM                                      */}
        {/* ============================================================== */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: 12 }]}>
          SET UP A NEW MANDATE
        </Text>

        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Registered Bank Account Context */}
          <View style={styles.fieldBlock}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Linked Bank Account</Text>
              <View style={[styles.reqTag, { backgroundColor: bank ? '#ECFDF5' : '#F1F5F9' }]}>
                <Text style={[styles.reqTagText, { color: bank ? '#059669' : '#64748B' }]}>
                  {bank ? 'Gateway Linked' : 'Set on First Order'}
                </Text>
              </View>
            </View>

            <View style={[styles.bankBox, { backgroundColor: colors.canvas, borderColor: colors.border }]}>
              <View style={[styles.bankIconWrap, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF' }]}>
                <Ionicons name="business-outline" size={18} color={colors.primary} />
              </View>
              {accountStatus?.hasInvestmentAccount && bank ? (
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bankTitle, { color: colors.textPrimary }]}>
                    {bank.holderName || 'Registered Investor Bank Account'}
                  </Text>
                  <Text style={[styles.bankSub, { color: colors.textSecondary }]}>
                    Account {bank.maskedNumber ?? '—'} • IFSC {bank.ifscCode ?? '—'}
                    {bank.type ? ` • ${bank.type.charAt(0).toUpperCase() + bank.type.slice(1)}` : ''}
                  </Text>
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bankTitle, { color: colors.textPrimary }]}>
                    No Bank Account Linked on Gateway Yet
                  </Text>
                  <Text style={[styles.bankSub, { color: colors.textSecondary }]}>
                    Your bank account is registered with Cybrilla when you place your first investment order.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* 1. Mandate Type (Mandatory) */}
          <View style={styles.fieldBlock}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>1. Authorization Method</Text>
              <View style={[styles.reqTag, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[styles.reqTagText, { color: '#DC2626' }]}>Required</Text>
              </View>
            </View>

            <View style={styles.methodRow}>
              <Pressable
                style={[
                  styles.methodOption,
                  { backgroundColor: colors.canvas, borderColor: colors.border },
                  mandateType === 'UPI' && { borderColor: colors.primary, backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' },
                ]}
                onPress={() => setMandateType('UPI')}
              >
                <View style={styles.methodHeader}>
                  <Ionicons
                    name="flash-outline"
                    size={18}
                    color={mandateType === 'UPI' ? colors.primary : colors.textSecondary}
                  />
                  <Ionicons
                    name={mandateType === 'UPI' ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={mandateType === 'UPI' ? colors.primary : colors.textPlaceholder}
                  />
                </View>
                <Text style={[styles.methodName, { color: colors.textPrimary }]}>UPI Autopay</Text>
                <Text style={[styles.methodDesc, { color: colors.textSecondary }]}>
                  Approve via UPI app (GPay, PhonePe, BHIM)
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.methodOption,
                  { backgroundColor: colors.canvas, borderColor: colors.border },
                  mandateType === 'E_MANDATE' && { borderColor: colors.primary, backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' },
                ]}
                onPress={() => setMandateType('E_MANDATE')}
              >
                <View style={styles.methodHeader}>
                  <Ionicons
                    name="globe-outline"
                    size={18}
                    color={mandateType === 'E_MANDATE' ? colors.primary : colors.textSecondary}
                  />
                  <Ionicons
                    name={mandateType === 'E_MANDATE' ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={mandateType === 'E_MANDATE' ? colors.primary : colors.textPlaceholder}
                  />
                </View>
                <Text style={[styles.methodName, { color: colors.textPrimary }]}>e-NACH</Text>
                <Text style={[styles.methodDesc, { color: colors.textSecondary }]}>
                  Approve via NetBanking or Debit Card
                </Text>
              </Pressable>
            </View>
          </View>

          {/* 2. Maximum Debit Limit (Mandatory) */}
          <View style={styles.fieldBlock}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>2. Maximum Limit per Instalment (₹)</Text>
              <View style={[styles.reqTag, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[styles.reqTagText, { color: '#DC2626' }]}>Required</Text>
              </View>
            </View>
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              Set this at or above the SIP amount you plan to invest. It is a ceiling — only your actual SIP instalment is debited.
            </Text>

            <View style={styles.presetRow}>
              {PRESET_LIMITS.map((preset) => {
                const active = Number(limit) === preset;
                return (
                  <Pressable
                    key={preset}
                    style={[
                      styles.presetChip,
                      { backgroundColor: colors.canvas, borderColor: colors.border },
                      active && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setLimit(String(preset))}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: colors.textPrimary },
                        active && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      ₹{preset.toLocaleString('en-IN')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.inputBox, { backgroundColor: colors.canvas, borderColor: colors.border }]}>
              <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>₹</Text>
              <TextInput
                value={limit}
                onChangeText={(v) => setLimit(v.replace(/\D/g, ''))}
                keyboardType="number-pad"
                placeholder="Enter amount (min ₹100)"
                placeholderTextColor={colors.textPlaceholder}
                style={[styles.input, { color: colors.textPrimary }]}
              />
            </View>
          </View>

          {/* 3. Reference Label (Optional) */}
          <View style={styles.fieldBlock}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>3. Reference Note</Text>
              <View style={[styles.reqTag, { backgroundColor: isDark ? colors.surfaceMuted : '#F1F5F9' }]}>
                <Text style={[styles.reqTagText, { color: colors.textSecondary }]}>Optional</Text>
              </View>
            </View>
            <TextInput
              value={referenceLabel}
              onChangeText={setReferenceLabel}
              placeholder="e.g., Monthly Equity SIP Mandate"
              placeholderTextColor={colors.textPlaceholder}
              style={[styles.optionalInput, { backgroundColor: colors.canvas, borderColor: colors.border, color: colors.textPrimary }]}
            />
          </View>

          {/* Submit Action */}
          <Pressable
            style={[
              styles.submitBtn,
              { backgroundColor: colors.primary },
              submitting && styles.disabledBtn,
            ]}
            onPress={() => void handleCreateMandate()}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Set Up Auto-Debit Mandate</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 18, paddingBottom: 44 },
  headerBlock: { marginBottom: 16 },
  pageTitle: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, lineHeight: 19 },

  loadingWrap: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  loadingText: { fontSize: 13, fontWeight: '500' },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorBannerTitle: { fontSize: 13, fontWeight: '700', color: '#991B1B' },
  errorBannerText: { fontSize: 12, color: '#B91C1C', marginTop: 2 },
  retryChip: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryChipText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  noticeTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  noticeText: { fontSize: 12, lineHeight: 18 },
  noticeActions: { flexDirection: 'row', marginTop: 10 },
  noticeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(180, 83, 9, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  noticeActionBtnText: { fontSize: 12, fontWeight: '700', color: '#B45309' },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginLeft: 2,
  },
  refreshRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refreshRowText: { fontSize: 12, fontWeight: '700' },

  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  emptySubtitle: { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  mandateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  mandateTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mandateTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mandateTypeTitle: { fontSize: 15, fontWeight: '700' },
  mandateDateText: { fontSize: 11, marginTop: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, marginVertical: 12 },
  mandateMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricCol: { flex: 1 },
  metricLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  metricValue: { fontSize: 15, fontWeight: '800' },
  metricValueMono: { fontSize: 12, fontWeight: '600' },
  mandateActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  approveBankBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  approveBankBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  detailsBtnText: { fontSize: 12, fontWeight: '700' },

  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginTop: 8,
  },
  fieldBlock: { marginBottom: 18 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: { fontSize: 14, fontWeight: '700' },
  fieldHint: { fontSize: 12, lineHeight: 17, marginBottom: 10 },
  reqTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  reqTagText: { fontSize: 10, fontWeight: '700' },

  bankBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bankIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankTitle: { fontSize: 13, fontWeight: '700' },
  bankSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },

  methodRow: { flexDirection: 'row', gap: 10 },
  methodOption: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
  },
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodName: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  methodDesc: { fontSize: 11, lineHeight: 15 },

  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetChipText: { fontSize: 12, fontWeight: '600' },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  currencyPrefix: { fontSize: 16, fontWeight: '700', marginRight: 6 },
  input: { flex: 1, fontSize: 15, fontWeight: '600' },
  optionalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 4,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  disabledBtn: { opacity: 0.6 },
});
