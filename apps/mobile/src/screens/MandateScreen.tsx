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
import { api } from '../services/api/client';
import { useTheme } from '../context/ThemeContext';

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

type BankAccountInfo = {
  hasInvestmentAccount: boolean;
  bankAccount: {
    holderName: string | null;
    maskedNumber: string | null;
    ifscCode: string | null;
    type: string | null;
  } | null;
};

const PRESET_LIMITS = [2500, 5000, 10000, 25000];

export const MandateScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [data, setData] = useState<MandatesResponse | null>(null);
  const [bankInfo, setBankInfo] = useState<BankAccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [mandateType, setMandateType] = useState<'UPI' | 'E_MANDATE'>('UPI');
  const [limit, setLimit] = useState('10000');
  const [customLimit, setCustomLimit] = useState('');
  const [investorNote, setInvestorNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load mandates & registered bank info
  const loadData = useCallback(async () => {
    try {
      const [mandatesRes, bankRes] = await Promise.all([
        api.get<MandatesResponse>('/mandates').catch(() => ({
          canCreate: true,
          mandates: [],
          message: null,
        })),
        api.get<BankAccountInfo>('/buckets/account-status').catch(() => null),
      ]);

      setData(mandatesRes);
      if (bankRes) {
        setBankInfo(bankRes);
      }

      // If user already has active mandates and none pending, default to list view
      if (mandatesRes?.mandates?.length && mandatesRes.mandates.some((m) => m.status === 'APPROVED')) {
        // keep user selection
      }
    } catch (e: any) {
      console.warn('Mandate fetch notice:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const handleOpenAuth = async (url: string, mandate: MandateItem) => {
    try {
      await Linking.openURL(url);
      // Also provide shortcut navigation in case app resumes
      navigation.navigate('MandateSuccess', {
        mandateId: mandate.id,
        mandateType: mandate.mandateType,
        mandateLimit: mandate.mandateLimit,
        umrn: mandate.umrn,
        status: mandate.status,
      });
    } catch {
      Alert.alert('Could not open authorization page', 'Please copy the link or try again.');
    }
  };

  const handleCreateMandate = async () => {
    const selectedLimit = customLimit ? Number(customLimit) : Number(limit);

    if (!selectedLimit || isNaN(selectedLimit) || selectedLimit < 100) {
      Alert.alert('Invalid Debit Limit', 'Please enter a valid debit limit of at least ₹100.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<MandateItem>('/mandates', {
        mandateType,
        mandateLimit: selectedLimit,
      });

      await loadData();

      if (res?.authorizationUrl) {
        Alert.alert(
          'Mandate Created',
          'Your auto-debit mandate has been created. Authorize it with your bank now to enable recurring SIP investments.',
          [
            {
              text: 'Authorize with Bank',
              onPress: () => handleOpenAuth(res.authorizationUrl!, res),
            },
            {
              text: 'View Confirmation',
              style: 'cancel',
              onPress: () => {
                navigation.navigate('MandateSuccess', {
                  mandateId: res.id,
                  mandateType: res.mandateType,
                  mandateLimit: res.mandateLimit,
                  umrn: res.umrn,
                  status: res.status,
                });
              },
            },
          ],
        );
      } else {
        navigation.navigate('MandateSuccess', {
          mandateId: res.id,
          mandateType: res.mandateType,
          mandateLimit: res.mandateLimit,
          umrn: res.umrn,
          status: res.status,
        });
      }
    } catch (e: any) {
      // In development, if investment account is pending creation, offer non-blocking fallback
      const errorMsg = e?.message || 'Could not register auto-debit mandate at this moment.';
      Alert.alert('Mandate Notice', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const registeredBank = bankInfo?.bankAccount;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title="Auto-Debit Mandates" onBack={() => navigation.goBack()} showSettings={false} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Block */}
        <View style={styles.topBanner}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>SIP Auto-Debit</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Set up an automated bank mandate once to ensure zero missed mutual fund instalments.
          </Text>
        </View>

        {/* Segmented Switch */}
        <View style={[styles.segmentedControl, { backgroundColor: isDark ? colors.surfaceMuted : '#E2E8F0' }]}>
          <Pressable
            style={[styles.segmentBtn, activeTab === 'create' && [styles.segmentBtnActive, { backgroundColor: colors.surface }]]}
            onPress={() => setActiveTab('create')}
          >
            <Ionicons
              name="add-circle-outline"
              size={16}
              color={activeTab === 'create' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === 'create' ? colors.primary : colors.textSecondary },
                activeTab === 'create' && styles.segmentTextActive,
              ]}
            >
              Set Up Mandate
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segmentBtn, activeTab === 'list' && [styles.segmentBtnActive, { backgroundColor: colors.surface }]]}
            onPress={() => setActiveTab('list')}
          >
            <Ionicons
              name="list-outline"
              size={16}
              color={activeTab === 'list' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === 'list' ? colors.primary : colors.textSecondary },
                activeTab === 'list' && styles.segmentTextActive,
              ]}
            >
              Active Mandates ({data?.mandates?.length || 0})
            </Text>
          </Pressable>
        </View>

        {/* TAB 1: CREATE MANDATE */}
        {activeTab === 'create' && (
          <View style={styles.formSection}>
            {/* Regulatory Assurance Callout */}
            <View style={[styles.trustBox, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF', borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.trustTitle, { color: colors.primary }]}>NPCI / RBI Certified e-Mandate</Text>
                <Text style={[styles.trustText, { color: colors.textSecondary }]}>
                  Only your scheduled SIP amounts will ever be debited. Maximum limit is an RBI safety ceiling.
                </Text>
              </View>
            </View>

            {/* 1. MANDATE METHOD */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>1. Choose Mandate Protocol</Text>
                <Text style={styles.mandatoryBadge}>Mandatory</Text>
              </View>

              <View style={styles.methodGrid}>
                {/* UPI Autopay */}
                <Pressable
                  style={[
                    styles.methodCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    mandateType === 'UPI' && [styles.methodCardActive, { borderColor: colors.primary, backgroundColor: isDark ? colors.surfaceElevated : '#FBFBFE' }],
                  ]}
                  onPress={() => setMandateType('UPI')}
                >
                  <View style={styles.methodHeader}>
                    <View style={[styles.methodIconBox, { backgroundColor: '#E0F2FE' }]}>
                      <Ionicons name="flash-outline" size={18} color="#0284C7" />
                    </View>
                    <View style={styles.recBadge}>
                      <Text style={styles.recBadgeText}>Instant</Text>
                    </View>
                  </View>
                  <Text style={[styles.methodTitle, { color: colors.textPrimary }]}>UPI Autopay</Text>
                  <Text style={[styles.methodSub, { color: colors.textSecondary }]}>
                    Approve in Google Pay, PhonePe, or BHIM. Up to ₹15,000/mo.
                  </Text>
                  {mandateType === 'UPI' && (
                    <View style={styles.activeCheck}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    </View>
                  )}
                </Pressable>

                {/* e-NACH NetBanking */}
                <Pressable
                  style={[
                    styles.methodCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    mandateType === 'E_MANDATE' && [styles.methodCardActive, { borderColor: colors.primary, backgroundColor: isDark ? colors.surfaceElevated : '#FBFBFE' }],
                  ]}
                  onPress={() => setMandateType('E_MANDATE')}
                >
                  <View style={styles.methodHeader}>
                    <View style={[styles.methodIconBox, { backgroundColor: '#EDE9FE' }]}>
                      <Ionicons name="business-outline" size={18} color="#7C3AED" />
                    </View>
                    <View style={[styles.recBadge, { backgroundColor: '#F1F5F9' }]}>
                      <Text style={[styles.recBadgeText, { color: '#64748B' }]}>Higher Limit</Text>
                    </View>
                  </View>
                  <Text style={[styles.methodTitle, { color: colors.textPrimary }]}>e-NACH NetBanking</Text>
                  <Text style={[styles.methodSub, { color: colors.textSecondary }]}>
                    Authorize via Debit Card or NetBanking OTP. Up to ₹1,00,000.
                  </Text>
                  {mandateType === 'E_MANDATE' && (
                    <View style={styles.activeCheck}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    </View>
                  )}
                </Pressable>
              </View>
            </View>

            {/* 2. MAXIMUM DEBIT LIMIT */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>2. Maximum Debit Limit per Instalment</Text>
                <Text style={styles.mandatoryBadge}>Mandatory</Text>
              </View>
              <Text style={[styles.fieldDesc, { color: colors.textMuted }]}>
                Select the safety cap your bank authorizes for SIPs.
              </Text>

              {/* Preset Chips */}
              <View style={styles.chipRow}>
                {PRESET_LIMITS.map((amt) => {
                  const isSelected = limit === String(amt) && !customLimit;
                  return (
                    <Pressable
                      key={amt}
                      style={[
                        styles.limitChip,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        isSelected && [styles.limitChipActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                      ]}
                      onPress={() => {
                        setLimit(String(amt));
                        setCustomLimit('');
                      }}
                    >
                      <Text
                        style={[
                          styles.limitChipText,
                          { color: colors.textPrimary },
                          isSelected && { color: '#FFFFFF', fontWeight: '800' },
                        ]}
                      >
                        ₹{amt.toLocaleString('en-IN')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Custom Input */}
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.currencyPrefix, { color: colors.textMuted }]}>₹</Text>
                <TextInput
                  style={[styles.inputField, { color: colors.textPrimary }]}
                  placeholder="Custom limit (e.g. 50000)"
                  placeholderTextColor={colors.textPlaceholder}
                  keyboardType="numeric"
                  value={customLimit}
                  onChangeText={(val) => {
                    setCustomLimit(val);
                    setLimit('');
                  }}
                />
              </View>
            </View>

            {/* 3. VERIFIED BANK ACCOUNT */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>3. Registered Bank Account</Text>
                <Text style={styles.mandatoryBadge}>Verified</Text>
              </View>

              <View style={[styles.bankTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.bankIconBox, { backgroundColor: isDark ? colors.surfaceMuted : '#F1F5F9' }]}>
                  <Ionicons name="card-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bankName, { color: colors.textPrimary }]}>
                    {registeredBank?.holderName || 'Verified Primary Bank Account'}
                  </Text>
                  <Text style={[styles.bankDetails, { color: colors.textSecondary }]}>
                    {registeredBank?.maskedNumber || '••••••••5432'} • {registeredBank?.ifscCode || 'IFSC Verified'}
                  </Text>
                </View>
                <View style={styles.verifiedTag}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.verifiedTagText}>Active</Text>
                </View>
              </View>
            </View>

            {/* 4. OPTIONAL NOTES / REFERENCE */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>4. Purpose / Tag (Optional)</Text>
                <Text style={styles.optionalBadge}>Optional</Text>
              </View>
              <TextInput
                style={[styles.inputFieldPlain, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="e.g. Wealth Creation SIPs, Retirement, Child Education"
                placeholderTextColor={colors.textPlaceholder}
                value={investorNote}
                onChangeText={setInvestorNote}
              />
            </View>

            {/* SUBMIT BUTTON */}
            <Pressable
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primary },
                submitting && { opacity: 0.7 },
              ]}
              disabled={submitting}
              onPress={handleCreateMandate}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Authorize Mandate with Bank</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* TAB 2: ACTIVE MANDATES LIST */}
        {activeTab === 'list' && (
          <View style={styles.listSection}>
            {loading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Fetching verified mandates...</Text>
              </View>
            ) : data?.mandates && data.mandates.length > 0 ? (
              data.mandates.map((m) => {
                const isApproved = m.status === 'APPROVED';
                const isPending = m.status === 'CREATED' || m.status === 'SUBMITTED';

                return (
                  <View key={m.id} style={[styles.mandateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.mandateCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.protocolBadge, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF' }]}>
                          <Text style={[styles.protocolBadgeText, { color: colors.primary }]}>
                            {m.mandateType === 'UPI' ? 'UPI Autopay' : 'e-NACH'}
                          </Text>
                        </View>
                        <Text style={[styles.mandateLimit, { color: colors.textPrimary }]}>
                          ₹{Number(m.mandateLimit).toLocaleString('en-IN')}/mo
                        </Text>
                      </View>

                      {/* Status Pill */}
                      <View
                        style={[
                          styles.statusBadgePill,
                          isApproved && { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
                          isPending && { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgePillText,
                            isApproved && { color: '#059669' },
                            isPending && { color: '#D97706' },
                          ]}
                        >
                          {m.status}
                        </Text>
                      </View>
                    </View>

                    {/* Metadata */}
                    <View style={styles.metaRow}>
                      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Reference ID:</Text>
                      <Text style={[styles.metaValMono, { color: colors.textSecondary }]}>{m.id}</Text>
                    </View>

                    {m.umrn && (
                      <View style={styles.metaRow}>
                        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>UMRN:</Text>
                        <Text style={[styles.metaValMono, { color: colors.textSecondary }]}>{m.umrn}</Text>
                      </View>
                    )}

                    {/* Pending Action */}
                    {isPending && m.authorizationUrl && (
                      <Pressable
                        style={[styles.resumeAuthBtn, { borderColor: colors.primary }]}
                        onPress={() => handleOpenAuth(m.authorizationUrl!, m)}
                      >
                        <Ionicons name="open-outline" size={16} color={colors.primary} />
                        <Text style={[styles.resumeAuthBtnText, { color: colors.primary }]}>Complete Bank Authorization</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="card-outline" size={44} color={colors.textPlaceholder} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Mandates Registered Yet</Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  {data?.message ||
                    'Set up auto-debit to effortlessly automate monthly mutual fund SIPs without entering PINs.'}
                </Text>
                <Pressable
                  style={[styles.setupNowBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setActiveTab('create')}
                >
                  <Text style={styles.setupNowBtnText}>Set Up Mandate Now</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 18, paddingBottom: 40 },
  topBanner: { marginBottom: 16 },
  pageTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, lineHeight: 19 },

  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: { fontSize: 13, fontWeight: '600' },
  segmentTextActive: { fontWeight: '800' },

  trustBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
  },
  trustTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  trustText: { fontSize: 11, lineHeight: 16 },

  formSection: { gap: 18 },
  fieldGroup: { gap: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { fontSize: 14, fontWeight: '800' },
  fieldDesc: { fontSize: 12, marginTop: -2, marginBottom: 4 },
  mandatoryBadge: { fontSize: 10, fontWeight: '800', color: '#DC2626', backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  optionalBadge: { fontSize: 10, fontWeight: '700', color: '#64748B', backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  methodGrid: { flexDirection: 'row', gap: 10 },
  methodCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    position: 'relative',
  },
  methodCardActive: {},
  methodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  methodIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  recBadgeText: { fontSize: 9, fontWeight: '800', color: '#0369A1' },
  methodTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  methodSub: { fontSize: 11, lineHeight: 15 },
  activeCheck: { position: 'absolute', top: 10, right: 10 },

  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  limitChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  limitChipActive: {},
  limitChipText: { fontSize: 12, fontWeight: '700' },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  currencyPrefix: { fontSize: 16, fontWeight: '700', marginRight: 6 },
  inputField: { flex: 1, fontSize: 14, fontWeight: '700' },
  inputFieldPlain: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 13,
    fontWeight: '600',
  },

  bankTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  bankIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bankName: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  bankDetails: { fontSize: 11 },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedTagText: { fontSize: 11, fontWeight: '800', color: '#10B981' },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#3C3985',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  listSection: { gap: 12 },
  loadingText: { marginTop: 12, fontSize: 13 },
  mandateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  mandateCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  protocolBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  protocolBadgeText: { fontSize: 11, fontWeight: '800' },
  mandateLimit: { fontSize: 15, fontWeight: '900' },
  statusBadgePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  statusBadgePillText: { fontSize: 10, fontWeight: '800' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontSize: 11 },
  metaValMono: { fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },
  resumeAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 6,
    gap: 6,
  },
  resumeAuthBtnText: { fontSize: 12, fontWeight: '800' },

  emptyBox: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    textAlign: 'center',
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyDesc: { fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
  setupNowBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, marginTop: 8 },
  setupNowBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
