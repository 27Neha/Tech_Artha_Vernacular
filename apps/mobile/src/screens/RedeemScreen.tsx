import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../services/api/client';
import { Header } from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { TransactionAuth, TransactionOtpModal, TransactionPayload } from '../components/TransactionOtpModal';

/**
 * Professional WealthTech Redemption Flow — SEBI & Cybrilla compliance.
 *
 * Holdings are retrieved directly from GET /redemptions/holdings.
 * Allows partial (amount or units) and full redemption.
 * Explicitly outlines processing timelines, exit load, and taxation.
 * Requires 2FA transaction OTP before submission to Cybrilla.
 */
type Holding = {
  folioNumber: string;
  schemeIsin: string;
  schemeName: string | null;
  units: number;
  redeemableUnits: number;
  redeemableValue: number | null;
  nav: number | null;
  navDate: string | null;
};

type HoldingsResponse = {
  holdings: Holding[];
  canRedeem: boolean;
  message: string;
};

type Mode = 'amount' | 'units' | 'full';

export const RedeemScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const initialFolio = route.params?.folioNumber;
  const initialIsin = route.params?.schemeIsin;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HoldingsResponse | null>(null);
  const [selected, setSelected] = useState<Holding | null>(null);
  const [mode, setMode] = useState<Mode>('amount');
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<TransactionPayload | null>(null);
  const [completedStatus, setCompletedStatus] = useState<{ status: string; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<HoldingsResponse>('/redemptions/holdings');
      setData(res);
      if (res?.holdings?.length) {
        if (initialFolio && initialIsin) {
          const matched = res.holdings.find(
            (h) => h.folioNumber === initialFolio && h.schemeIsin === initialIsin
          );
          if (matched) setSelected(matched);
          else setSelected(res.holdings[0]);
        } else if (res.holdings.length === 1) {
          setSelected(res.holdings[0]);
        }
      }
    } catch (e) {
      Alert.alert('Could not load your holdings', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [initialFolio, initialIsin]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleReview = () => {
    if (!selected) return;

    const numeric = Number(value);
    if (mode !== 'full') {
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return Alert.alert(
          'Check the figure',
          mode === 'amount' ? 'Enter a valid amount to withdraw.' : 'Enter a valid number of units to sell.'
        );
      }
      if (mode === 'units' && numeric > selected.redeemableUnits) {
        return Alert.alert('Too many units', `You hold ${selected.redeemableUnits} redeemable units in this folio.`);
      }
      if (mode === 'amount' && selected.redeemableValue != null && numeric > selected.redeemableValue) {
        return Alert.alert(
          'Amount exceeds available balance',
          `Your available redeemable balance in this holding is ₹${selected.redeemableValue.toLocaleString('en-IN')}.`
        );
      }
    }

    setShowReviewModal(true);
  };

  const handleProceedToAuth = () => {
    if (!selected) return;
    const numeric = Number(value);
    setShowReviewModal(false);

    setPendingAuth({
      action: 'REDEMPTION',
      folioNumber: selected.folioNumber,
      schemeIsin: selected.schemeIsin,
      ...(mode === 'full' ? { fullExit: true } : mode === 'amount' ? { amount: numeric } : { units: numeric }),
    });
  };

  const placeAuthorised = async (auth: TransactionAuth) => {
    const payload = pendingAuth;
    setPendingAuth(null);
    if (!payload) return;

    setSubmitting(true);
    try {
      const result = await api.post<{ status: string; message: string }>('/redemptions', {
        ...payload,
        ...auth,
      });

      setCompletedStatus({
        status: result?.status || 'SUBMITTED',
        message: result?.message || 'Your withdrawal request has been placed successfully with the AMC.',
      });
    } catch (e) {
      Alert.alert('Withdrawal failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
        <Header title="Redeem Investment" onBack={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: 40 }} color="#36358D" size="large" />
      </SafeAreaView>
    );
  }

  // Completion State Screen
  if (completedStatus) {
    return (
      <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
        <StatusBar style="dark" />
        <Header title="Redemption Status" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.successContainer}>
          <View style={styles.successIconBox}>
            <Ionicons name="checkmark-circle" size={64} color="#16A34A" />
          </View>
          <Text style={styles.successTitle}>Redemption Request Placed</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{completedStatus.status}</Text>
          </View>
          <Text style={styles.successDesc}>{completedStatus.message}</Text>

          <View style={styles.successCard}>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Holding</Text>
              <Text style={styles.successValue}>{selected?.schemeName ?? selected?.schemeIsin}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Folio</Text>
              <Text style={styles.successValue}>{selected?.folioNumber}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Settlement Destination</Text>
              <Text style={styles.successValue}>Registered Bank Account</Text>
            </View>
            <View style={[styles.successRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.successLabel}>Estimated Timeline</Text>
              <Text style={[styles.successValue, { color: '#36358D', fontWeight: '800' }]}>
                T+2 to T+4 Working Days
              </Text>
            </View>
          </View>

          <View style={{ width: '100%', gap: 12 }}>
            <Pressable
              style={styles.investMoreSuccessBtn}
              onPress={() => navigation.navigate('Funds')}
              accessibilityRole="button"
              accessibilityLabel="Invest More in Mutual Funds"
            >
              <Ionicons name="trending-up" size={18} color="#FFFFFF" />
              <Text style={styles.investMoreSuccessBtnText}>Invest More</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Portfolio' })}
              accessibilityRole="button"
              accessibilityLabel="Back to Portfolio"
            >
              <Text style={styles.secondaryButtonText}>Back to Portfolio</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="Redeem Investment" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Redeem Investment</Text>
          <Text style={styles.sub}>
            Withdraw funds to your verified bank account. Cybrilla processes orders directly with the AMC.
          </Text>
        </View>

        {!data?.canRedeem ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={32} color="#64748B" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>Nothing to withdraw yet</Text>
            <Text style={styles.emptyText}>
              Units appear here once the AMC has allotted your purchase. Until units are allotted by the fund house,
              there is no redeemable balance.
            </Text>
            <Pressable
              style={[styles.primaryButton, { marginTop: 16 }]}
              onPress={() => navigation.navigate('Funds')}
              accessibilityRole="button"
              accessibilityLabel="Explore Funds to Invest More"
            >
              <Ionicons name="trending-up" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Invest More</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.sectionHeader}>Select Holding to Redeem</Text>
            {data.holdings.map((holding) => {
              const isSelected =
                selected?.folioNumber === holding.folioNumber && selected?.schemeIsin === holding.schemeIsin;
              return (
                <Pressable
                  key={`${holding.folioNumber}:${holding.schemeIsin}`}
                  style={[styles.holdingCard, isSelected && styles.holdingSelected]}
                  onPress={() => setSelected(holding)}
                >
                  <View style={styles.holdingTopRow}>
                    <Text style={styles.holdingName} numberOfLines={1}>
                      {holding.schemeName ?? holding.schemeIsin}
                    </Text>
                    <View style={isSelected ? styles.radioSelected : styles.radioUnselected}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </View>

                  <Text style={styles.holdingMeta}>Folio: {holding.folioNumber}</Text>

                  <View style={styles.holdingMetricsRow}>
                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel}>Redeemable Units</Text>
                      <Text style={styles.metricValue}>
                        {holding.redeemableUnits.toFixed(3)} / {holding.units.toFixed(3)}
                      </Text>
                    </View>
                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel}>Available Value</Text>
                      <Text style={styles.metricValue}>
                        {holding.redeemableValue != null
                          ? `₹${holding.redeemableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </Text>
                    </View>
                  </View>

                  {holding.nav != null && (
                    <Text style={styles.navSubtext}>
                      Latest NAV: ₹{holding.nav.toFixed(4)} {holding.navDate ? `(${holding.navDate})` : ''}
                    </Text>
                  )}
                </Pressable>
              );
            })}

            {selected ? (
              <View style={styles.formCard}>
                <Text style={styles.sectionHeader}>How much would you like to redeem?</Text>
                <View style={styles.modeRow}>
                  {(['amount', 'units', 'full'] as Mode[]).map((option) => (
                    <Pressable
                      key={option}
                      style={[styles.modeBtn, mode === option && styles.modeBtnOn]}
                      onPress={() => {
                        setMode(option);
                        setValue('');
                      }}
                    >
                      <Text style={[styles.modeText, mode === option && styles.modeTextOn]}>
                        {option === 'amount' ? 'By Amount' : option === 'units' ? 'By Units' : 'Full Exit'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {mode !== 'full' ? (
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputPrefix}>{mode === 'amount' ? '₹' : 'Units'}</Text>
                    <TextInput
                      value={value}
                      onChangeText={setValue}
                      keyboardType="decimal-pad"
                      placeholder={mode === 'amount' ? 'Enter amount (e.g. 5000)' : 'Enter units (e.g. 25.5)'}
                      placeholderTextColor="#A0AEC0"
                      style={styles.input}
                    />
                  </View>
                ) : (
                  <View style={styles.fullExitBox}>
                    <Ionicons name="information-circle" size={18} color="#36358D" />
                    <Text style={styles.fullExitText}>
                      Redeeming all {selected.redeemableUnits} available units in this folio.
                    </Text>
                  </View>
                )}

                {/* Statutory Charges & Timeline Disclosure */}
                <View style={styles.infoDisclosureCard}>
                  <Text style={styles.disclosureTitle}>Applicable Terms & Timelines</Text>
                  <View style={styles.disclosureRow}>
                    <Ionicons name="time-outline" size={15} color="#36358D" />
                    <Text style={styles.disclosureText}>
                      <Text style={{ fontWeight: '700' }}>Processing:</Text> T+2 to T+4 working days directly to your
                      registered bank account.
                    </Text>
                  </View>
                  <View style={styles.disclosureRow}>
                    <Ionicons name="pricetag-outline" size={15} color="#36358D" />
                    <Text style={styles.disclosureText}>
                      <Text style={{ fontWeight: '700' }}>Exit Load & Taxes:</Text> Deducted by AMC if applicable (e.g.
                      typically 1% if held &lt; 1 year for equity funds). TechArtha charges ₹0 fee.
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={[styles.primaryButton, submitting && styles.disabled]}
                  onPress={handleReview}
                  disabled={submitting}
                >
                  <Text style={styles.primaryButtonText}>{submitting ? 'Placing…' : 'Review Withdrawal'}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : null}
          </>
        )}

        <View style={styles.retentionBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.retentionTitle}>Keep Growing Your Wealth</Text>
            <Text style={styles.retentionSub}>
              Explore curated, high-performing funds aligned with your financial goals.
            </Text>
          </View>
          <Pressable
            style={styles.retentionBtn}
            onPress={() => navigation.navigate('Funds')}
            accessibilityRole="button"
            accessibilityLabel="Explore Funds to Invest More"
          >
            <Text style={styles.retentionBtnText}>Invest More</Text>
            <Ionicons name="arrow-forward" size={14} color="#36358D" />
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          TechArtha operates in compliance with SEBI and AMFI guidelines. Redemption proceeds are credited solely to
          your verified bank account held in your own name.
        </Text>
      </ScrollView>

      {/* Review & Confirmation Modal */}
      <Modal
        visible={showReviewModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowReviewModal(false)}>
          <Pressable style={styles.reviewSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewTitle}>Confirm Withdrawal Details</Text>
              <Pressable onPress={() => setShowReviewModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.reviewSummaryCard}>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Scheme</Text>
                <Text style={styles.reviewValue} numberOfLines={2}>
                  {selected?.schemeName ?? selected?.schemeIsin}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Folio</Text>
                <Text style={styles.reviewValue}>{selected?.folioNumber}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Withdrawal Type</Text>
                <Text style={styles.reviewValue}>
                  {mode === 'full' ? 'Full Exit' : mode === 'amount' ? `₹${value}` : `${value} Units`}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Destination</Text>
                <Text style={styles.reviewValue}>Registered Bank Account</Text>
              </View>
              <View style={[styles.reviewRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.reviewLabel}>Estimated Settlement</Text>
                <Text style={[styles.reviewValue, { color: '#36358D', fontWeight: '800' }]}>
                  T+2 to T+4 Working Days
                </Text>
              </View>
            </View>

            <Text style={styles.reviewNote}>
              This action requires 2FA authentication. Once submitted, the order is forwarded to the fund house for
              allotment.
            </Text>

            <Pressable style={styles.primaryButton} onPress={handleProceedToAuth}>
              <Text style={styles.primaryButtonText}>Proceed to 2FA Authentication</Text>
              <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Existing Transaction OTP Modal (Preserved exactly) */}
      <TransactionOtpModal
        visible={pendingAuth !== null}
        payload={pendingAuth}
        onCancel={() => setPendingAuth(null)}
        onAuthorised={placeAuthorised}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  content: { padding: 20, paddingBottom: 48 },
  headerBlock: { marginBottom: 16 },
  title: { color: '#102A54', fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  sub: { color: '#64748B', fontSize: 13, marginTop: 4, lineHeight: 19 },
  sectionHeader: { fontSize: 14, color: '#102A54', fontWeight: '800', marginTop: 16, marginBottom: 10 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyTitle: { color: '#102A54', fontSize: 16, fontWeight: '800' },
  emptyText: { color: '#64748B', fontSize: 13, lineHeight: 20, marginTop: 6, textAlign: 'center' },
  holdingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  holdingSelected: { borderColor: '#36358D', backgroundColor: '#F9F9FE' },
  holdingTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  holdingName: { color: '#102A54', fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
  radioUnselected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  radioSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#36358D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#36358D' },
  holdingMeta: { color: '#64748B', fontSize: 12, marginTop: 4, fontWeight: '500' },
  holdingMetricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  metricCol: { flex: 1 },
  metricLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  metricValue: { fontSize: 14, color: '#102A54', fontWeight: '800', marginTop: 2 },
  navSubtext: { fontSize: 11, color: '#64748B', marginTop: 8, fontStyle: 'italic' },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  modeBtnOn: { backgroundColor: '#36358D', borderColor: '#36358D' },
  modeText: { color: '#64748B', fontSize: 13, fontWeight: '700' },
  modeTextOn: { color: '#fff' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputPrefix: { fontSize: 16, fontWeight: '800', color: '#36358D', marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 16, color: '#102A54', fontWeight: '700' },
  fullExitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0EFFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  fullExitText: { color: '#36358D', fontSize: 13, fontWeight: '600', flex: 1 },
  infoDisclosureCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    gap: 6,
  },
  disclosureTitle: { fontSize: 12, fontWeight: '800', color: '#102A54', marginBottom: 2 },
  disclosureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  disclosureText: { fontSize: 11, color: '#64748B', flex: 1, lineHeight: 16 },
  primaryButton: {
    backgroundColor: '#36358D',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#36358D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  investMoreSuccessBtn: {
    backgroundColor: '#36358D',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#36358D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  investMoreSuccessBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  retentionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EFFB',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#DEDBF7',
  },
  retentionTitle: { fontSize: 13, fontWeight: '800', color: '#102A54' },
  retentionSub: { fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 16 },
  retentionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DEDBF7',
  },
  retentionBtnText: { fontSize: 12, fontWeight: '800', color: '#36358D' },
  disclaimer: { color: '#94A3B8', fontSize: 11, lineHeight: 17, marginTop: 24, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reviewSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewTitle: { fontSize: 18, fontWeight: '800', color: '#102A54' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  reviewLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  reviewValue: { fontSize: 13, color: '#102A54', fontWeight: '800', textAlign: 'right', flex: 1, marginLeft: 16 },
  reviewNote: { fontSize: 12, color: '#64748B', lineHeight: 17, marginBottom: 18 },
  successContainer: { padding: 24, alignItems: 'center' },
  successIconBox: { marginTop: 20, marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#102A54', textAlign: 'center' },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 14,
  },
  statusBadgeText: { color: '#15803D', fontSize: 12, fontWeight: '800' },
  successDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  successCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  successLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  successValue: { fontSize: 13, color: '#102A54', fontWeight: '800', flex: 1, textAlign: 'right', marginLeft: 16 },
});

export default RedeemScreen;
