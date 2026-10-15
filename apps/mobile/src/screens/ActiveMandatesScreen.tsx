import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../components/Header';

interface Mandate {
  id: string;
  umrn: string; // Unique Mandate Reference Number
  bankName: string;
  accountNumber: string;
  maxLimit: number;
  type: 'e-Mandate' | 'NPCI NACH';
  status: 'ACTIVE' | 'PENDING' | 'CANCELLED';
  createdDate: string;
  expiryDate: string;
  activeSipsCount: number;
}

export const ActiveMandatesScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();

  const [mandates, setMandates] = useState<Mandate[]>([
    {
      id: 'mnd_1',
      umrn: 'NACH00000000049182',
      bankName: 'HDFC Bank',
      accountNumber: '••••••••4829',
      maxLimit: 100000,
      type: 'e-Mandate',
      status: 'ACTIVE',
      createdDate: '12 Jan 2026',
      expiryDate: '31 Dec 2055',
      activeSipsCount: 2
    }
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [bankName, setBankName] = useState('HDFC Bank');
  const [accountNumber, setAccountNumber] = useState('••••••••4829');
  const [maxLimit, setMaxLimit] = useState('100000');
  const [mandateType, setMandateType] = useState<'e-Mandate' | 'NPCI NACH'>('e-Mandate');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleCancelMandate = (id: string, activeSips: number) => {
    if (activeSips > 0) {
      Alert.alert(
        'Active SIPs Linked',
        `This mandate is currently funding ${activeSips} active SIP installment(s). Pausing or cancelling will stop those scheduled investments. Are you sure you wish to proceed?`,
        [
          { text: 'Keep Active', style: 'cancel' },
          {
            text: 'Cancel Mandate',
            style: 'destructive',
            onPress: () => {
              setMandates(prev => prev.map(m => m.id === id ? { ...m, status: 'CANCELLED' } : m));
              Alert.alert('Mandate Cancelled', 'The auto-debit authorization has been revoked with NPCI.');
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Cancel Mandate',
        'Are you sure you want to cancel this auto-pay mandate?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: () => {
              setMandates(prev => prev.map(m => m.id === id ? { ...m, status: 'CANCELLED' } : m));
              Alert.alert('Mandate Cancelled', 'The auto-debit authorization has been revoked with NPCI.');
            }
          }
        ]
      );
    }
  };

  const handleCreateMandate = () => {
    setFormError('');
    const parsedLimit = parseInt(maxLimit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1000) {
      setFormError('Minimum auto-debit limit is ₹1,000.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newMnd: Mandate = {
        id: 'mnd_' + Date.now(),
        umrn: 'NACH' + Math.floor(10000000000000 + Math.random() * 90000000000000),
        bankName,
        accountNumber,
        maxLimit: parsedLimit,
        type: mandateType,
        status: 'ACTIVE',
        createdDate: 'Today',
        expiryDate: 'Until Cancelled',
        activeSipsCount: 0
      };
      setMandates(prev => [newMnd, ...prev]);
      setIsSubmitting(false);
      setModalVisible(false);
      Alert.alert('e-Mandate Created', 'Your auto-pay mandate has been registered with NPCI. You can now start automated SIPs without entering OTP every month.');
    }, 900);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Title Header */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>{t('profile.mandatesTitle', { defaultValue: 'Active Mandates' })}</Text>
          <Text style={styles.subtitle}>
            {t('profile.mandatesSubtitle', { defaultValue: 'Automate your monthly SIP installments seamlessly through NPCI e-Mandate and Net Banking.' })}
          </Text>
        </View>

        {/* Security & NPCI Assurance Banner */}
        <View style={styles.assuranceBanner}>
          <Ionicons name="card" size={20} color="#047857" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.assuranceTitle}>NPCI & RBI Regulated Auto-Pay</Text>
            <Text style={styles.assuranceDesc}>
              Debits only trigger for authorized investment orders placed by you. No funds can be deducted without an active scheduled SIP.
            </Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Mandates ({mandates.length})</Text>
          <Pressable
            style={styles.addInlineBtn}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={16} color="#3C3985" />
            <Text style={styles.addInlineText}>Set Up Mandate</Text>
          </Pressable>
        </View>

        {mandates.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="card-outline" size={36} color="#A0AEC0" />
            </View>
            <Text style={styles.emptyTitle}>No Active Mandates</Text>
            <Text style={styles.emptySubtitle}>
              Set up a one-time e-mandate via UPI or Net Banking to enable 1-click SIP investments.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.primaryBtnText}>+ Set Up Auto-Pay Mandate</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {mandates.map(mnd => (
              <View key={mnd.id} style={[styles.mandateCard, mnd.status === 'CANCELLED' && styles.mandateCardDisabled]}>
                <View style={styles.cardTopRow}>
                  <View style={[styles.bankIconContainer, mnd.status === 'CANCELLED' && { backgroundColor: '#F1F5F9' }]}>
                    <Ionicons 
                      name="card-outline" 
                      size={22} 
                      color={mnd.status === 'ACTIVE' ? '#3C3985' : '#94A3B8'} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.bankName}>{mnd.bankName}</Text>
                      <View style={styles.typePill}>
                        <Text style={styles.typePillText}>{mnd.type}</Text>
                      </View>
                    </View>
                    <Text style={styles.accNum}>A/C: {mnd.accountNumber}</Text>
                  </View>
                  <View style={[styles.statusBadge, mnd.status === 'ACTIVE' ? styles.statusActive : styles.statusCancelled]}>
                    <Ionicons 
                      name={mnd.status === 'ACTIVE' ? 'checkmark-circle' : 'close-circle'} 
                      size={13} 
                      color={mnd.status === 'ACTIVE' ? '#059669' : '#DC2626'} 
                    />
                    <Text style={[styles.statusText, mnd.status === 'ACTIVE' ? styles.textActive : styles.textCancelled]}>
                      {mnd.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardMetaGrid}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Max Daily Limit</Text>
                    <Text style={styles.metaValueHighlight}>₹{mnd.maxLimit.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Active SIPs</Text>
                    <Text style={styles.metaValue}>{mnd.activeSipsCount} linked</Text>
                  </View>
                  <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
                    <Text style={styles.metaLabel}>Expiry Date</Text>
                    <Text style={styles.metaValue}>{mnd.expiryDate}</Text>
                  </View>
                </View>

                <View style={styles.umrnContainer}>
                  <Text style={styles.umrnLabel}>UMRN: </Text>
                  <Text style={styles.umrnValue}>{mnd.umrn}</Text>
                </View>

                {mnd.status === 'ACTIVE' && (
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.cancelActionBtn}
                      onPress={() => handleCancelMandate(mnd.id, mnd.activeSipsCount)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                      <Text style={styles.cancelActionText}>Revoke Mandate</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Informational Guidance */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#4A5568" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>What is a Maximum Daily Limit?</Text>
            <Text style={styles.infoText}>
              The limit (e.g. ₹1,00,000) is a security cap authorized with your bank. Only your actual SIP amount (e.g. ₹1,500/month) will ever be deducted on scheduled investment dates.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Set Up Mandate Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Up Auto-Pay Mandate</Text>
              <Pressable hitSlop={10} onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#A0AEC0" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {formError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Select Linked Bank</Text>
              <View style={styles.bankSelectBox}>
                <Ionicons name="business" size={20} color="#3C3985" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bankSelectName}>{bankName}</Text>
                  <Text style={styles.bankSelectAcc}>{accountNumber}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
              </View>

              <Text style={styles.inputLabel}>Authorization Method</Text>
              <View style={styles.authMethodRow}>
                <Pressable
                  style={[styles.authOption, mandateType === 'e-Mandate' && styles.authOptionActive]}
                  onPress={() => setMandateType('e-Mandate')}
                >
                  <Ionicons name="flash-outline" size={16} color={mandateType === 'e-Mandate' ? '#3C3985' : '#64748B'} />
                  <Text style={[styles.authOptionText, mandateType === 'e-Mandate' && styles.authOptionTextActive]}>
                    UPI / Net Banking (Instant)
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.authOption, mandateType === 'NPCI NACH' && styles.authOptionActive]}
                  onPress={() => setMandateType('NPCI NACH')}
                >
                  <Ionicons name="document-text-outline" size={16} color={mandateType === 'NPCI NACH' ? '#3C3985' : '#64748B'} />
                  <Text style={[styles.authOptionText, mandateType === 'NPCI NACH' && styles.authOptionTextActive]}>
                    Debit Card (OTP)
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>Maximum Per-Day Limit (₹)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="100000"
                keyboardType="number-pad"
                value={maxLimit}
                onChangeText={setMaxLimit}
              />
              <Text style={styles.helperText}>
                Standard cap is ₹1,00,000 to cover future SIP expansions.
              </Text>

              <Pressable
                style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleCreateMandate}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Authorize with Bank</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  container: { padding: 20, paddingBottom: 40 },
  titleSection: { marginBottom: 20 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#102A54', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#64748B', lineHeight: 19 },
  assuranceBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    marginBottom: 24
  },
  assuranceTitle: { fontSize: 13, fontWeight: '700', color: '#065F46', marginBottom: 2 },
  assuranceDesc: { fontSize: 11, color: '#047857', lineHeight: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#102A54' },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBEAF8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4
  },
  addInlineText: { fontSize: 12, fontWeight: '700', color: '#3C3985' },
  mandateCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  mandateCardDisabled: {
    opacity: 0.7,
    borderColor: '#CBD5E1'
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  bankIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF'
  },
  bankName: { fontSize: 15, fontWeight: '800', color: '#102A54' },
  typePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  typePillText: { fontSize: 9, fontWeight: '800', color: '#475569' },
  accNum: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusActive: { backgroundColor: '#ECFDF5' },
  statusCancelled: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 11, fontWeight: '800' },
  textActive: { color: '#059669' },
  textCancelled: { color: '#DC2626' },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14
  },
  cardMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  metaCol: {},
  metaLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 2 },
  metaValueHighlight: { fontSize: 14, fontWeight: '800', color: '#3C3985' },
  metaValue: { fontSize: 12, fontWeight: '700', color: '#334155' },
  umrnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginTop: 12
  },
  umrnLabel: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  umrnValue: { fontSize: 10, fontWeight: '700', color: '#0F172A', letterSpacing: 0.5 },
  actionRow: {
    marginTop: 12,
    alignItems: 'flex-end'
  },
  cancelActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  cancelActionText: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#102A54', marginBottom: 6 },
  emptySubtitle: { fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  primaryBtn: {
    backgroundColor: '#3C3985',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12
  },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginTop: 24
  },
  infoTitle: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 },
  infoText: { fontSize: 11, color: '#64748B', lineHeight: 17 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#102A54' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14
  },
  errorText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6, marginTop: 12 },
  bankSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    borderRadius: 12
  },
  bankSelectName: { fontSize: 14, fontWeight: '700', color: '#102A54' },
  bankSelectAcc: { fontSize: 12, color: '#64748B' },
  authMethodRow: {
    gap: 8
  },
  authOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  authOptionActive: {
    borderColor: '#3C3985',
    backgroundColor: '#EBEAF8'
  },
  authOptionText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  authOptionTextActive: { color: '#3C3985', fontWeight: '800' },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: '#0F172A'
  },
  helperText: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  submitBtn: {
    backgroundColor: '#3C3985',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' }
});
