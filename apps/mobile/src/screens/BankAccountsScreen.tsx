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

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: 'Savings' | 'Current';
  isPrimary: boolean;
  status: 'VERIFIED' | 'PENDING';
}

export const BankAccountsScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();

  const [accounts, setAccounts] = useState<BankAccount[]>([
    {
      id: 'acc_1',
      bankName: 'HDFC Bank',
      accountNumber: '••••••••4829',
      ifscCode: 'HDFC0001234',
      accountType: 'Savings',
      isPrimary: true,
      status: 'VERIFIED'
    }
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountType, setAccountType] = useState<'Savings' | 'Current'>('Savings');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSetPrimary = (id: string) => {
    setAccounts(prev =>
      prev.map(acc => ({
        ...acc,
        isPrimary: acc.id === id
      }))
    );
    Alert.alert('Primary Account Updated', 'This account will be used as default for SIPs & redemptions.');
  };

  const handleAddAccount = () => {
    setFormError('');
    if (!bankName.trim()) {
      setFormError('Please enter bank name.');
      return;
    }
    if (!accountNumber.trim() || accountNumber.length < 9) {
      setFormError('Please enter a valid bank account number.');
      return;
    }
    if (accountNumber !== confirmAccountNumber) {
      setFormError('Account numbers do not match.');
      return;
    }
    if (!ifsc.trim() || ifsc.trim().length !== 11) {
      setFormError('Please enter a valid 11-character IFSC code.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const masked = '••••••••' + accountNumber.slice(-4);
      const newAcc: BankAccount = {
        id: 'acc_' + Date.now(),
        bankName: bankName.trim(),
        accountNumber: masked,
        ifscCode: ifsc.trim().toUpperCase(),
        accountType,
        isPrimary: accounts.length === 0,
        status: 'VERIFIED'
      };
      setAccounts(prev => [...prev, newAcc]);
      setIsSubmitting(false);
      setModalVisible(false);
      setBankName('');
      setAccountNumber('');
      setConfirmAccountNumber('');
      setIfsc('');
      Alert.alert('Bank Account Linked', 'Your bank account has been verified via penny drop and added successfully.');
    }, 900);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Title & Trust Header */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>{t('profile.bankAccountsTitle', { defaultValue: 'Bank Accounts' })}</Text>
          <Text style={styles.subtitle}>
            {t('profile.bankAccountsSubtitle', { defaultValue: 'Manage your verified bank accounts for deposits, SIP investments, and instant redemptions.' })}
          </Text>
        </View>

        {/* Security / SEBI Compliance Banner */}
        <View style={styles.securityBanner}>
          <Ionicons name="shield-checkmark" size={20} color="#10B981" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.securityTitle}>Bank Verification Guaranteed</Text>
            <Text style={styles.securityDesc}>
              Accounts are verified via instant penny drop under NPCI & SEBI mutual fund guidelines. Investments can only be made from bank accounts registered in your name.
            </Text>
          </View>
        </View>

        {/* Account List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Linked Accounts ({accounts.length})</Text>
          <Pressable
            style={styles.addInlineBtn}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={16} color="#3C3985" />
            <Text style={styles.addInlineText}>Add New</Text>
          </Pressable>
        </View>

        {accounts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="business-outline" size={36} color="#A0AEC0" />
            </View>
            <Text style={styles.emptyTitle}>No Bank Accounts Linked</Text>
            <Text style={styles.emptySubtitle}>
              Link your bank account to start investing in mutual funds and set up auto-pay SIPs seamlessly.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.primaryBtnText}>+ Link Bank Account</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {accounts.map(acc => (
              <View key={acc.id} style={[styles.bankCard, acc.isPrimary && styles.bankCardPrimary]}>
                <View style={styles.cardTopRow}>
                  <View style={styles.bankIconContainer}>
                    <Ionicons name="business" size={22} color="#3C3985" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.bankName}>{acc.bankName}</Text>
                      {acc.isPrimary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.accType}>{acc.accountType} Account</Text>
                  </View>
                  <View style={styles.verifiedTag}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={styles.verifiedTagText}>Verified</Text>
                  </View>
                </View>

                <View style={styles.cardDetailsDivider} />

                <View style={styles.cardDetailsRow}>
                  <View>
                    <Text style={styles.detailLabel}>Account Number</Text>
                    <Text style={styles.detailValue}>{acc.accountNumber}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.detailLabel}>IFSC Code</Text>
                    <Text style={styles.detailValue}>{acc.ifscCode}</Text>
                  </View>
                </View>

                {!acc.isPrimary && (
                  <Pressable
                    style={styles.setPrimaryBtn}
                    onPress={() => handleSetPrimary(acc.id)}
                  >
                    <Text style={styles.setPrimaryText}>Set as Primary Bank</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Helpful Tips Section */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#4A5568" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Important Points</Text>
            <Text style={styles.infoText}>
              • The name on your bank account must match the name registered on your PAN card.
              {'\n'}• Third-party bank transfers are prohibited by SEBI regulations.
              {'\n'}• Redemptions and dividend payouts are credited directly to your primary bank account.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal to Add Bank Account */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Bank Account</Text>
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

              <Text style={styles.inputLabel}>Bank Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. State Bank of India, HDFC, ICICI"
                value={bankName}
                onChangeText={setBankName}
              />

              <Text style={styles.inputLabel}>Account Type</Text>
              <View style={styles.typeSelectorRow}>
                <Pressable
                  style={[styles.typeOption, accountType === 'Savings' && styles.typeOptionSelected]}
                  onPress={() => setAccountType('Savings')}
                >
                  <Text style={[styles.typeText, accountType === 'Savings' && styles.typeTextSelected]}>
                    Savings Account
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.typeOption, accountType === 'Current' && styles.typeOptionSelected]}
                  onPress={() => setAccountType('Current')}
                >
                  <Text style={[styles.typeText, accountType === 'Current' && styles.typeTextSelected]}>
                    Current Account
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>Account Number</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter your account number"
                keyboardType="number-pad"
                secureTextEntry={false}
                value={accountNumber}
                onChangeText={setAccountNumber}
              />

              <Text style={styles.inputLabel}>Confirm Account Number</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Re-enter your account number"
                keyboardType="number-pad"
                value={confirmAccountNumber}
                onChangeText={setConfirmAccountNumber}
              />

              <Text style={styles.inputLabel}>IFSC Code</Text>
              <TextInput
                style={[styles.modalInput, { textTransform: 'uppercase' }]}
                placeholder="e.g. SBIN0001234"
                maxLength={11}
                autoCapitalize="characters"
                value={ifsc}
                onChangeText={setIfsc}
              />

              <View style={styles.pennyDropNotice}>
                <Ionicons name="flash-outline" size={16} color="#3C3985" />
                <Text style={styles.pennyDropText}>
                  We will deposit ₹1 to verify your account with your bank immediately.
                </Text>
              </View>

              <Pressable
                style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleAddAccount}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Verify & Link Account</Text>
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
  securityBanner: {
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
  securityTitle: { fontSize: 13, fontWeight: '700', color: '#065F46', marginBottom: 2 },
  securityDesc: { fontSize: 11, color: '#047857', lineHeight: 16 },
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
  bankCard: {
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
  bankCardPrimary: {
    borderColor: '#3C3985',
    borderWidth: 1.5
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
  accType: { fontSize: 12, color: '#64748B', marginTop: 2 },
  primaryBadge: {
    backgroundColor: '#3C3985',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6
  },
  primaryBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  verifiedTagText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  cardDetailsDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14
  },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  detailLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '700', color: '#1E293B', letterSpacing: 0.5 },
  setPrimaryBtn: {
    marginTop: 14,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  setPrimaryText: { fontSize: 12, fontWeight: '700', color: '#3C3985' },
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
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC'
  },
  typeOptionSelected: {
    borderColor: '#3C3985',
    backgroundColor: '#EBEAF8'
  },
  typeText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  typeTextSelected: { color: '#3C3985', fontWeight: '800' },
  pennyDropNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    marginBottom: 20
  },
  pennyDropText: { fontSize: 11, color: '#475569', flex: 1, lineHeight: 16 },
  submitBtn: {
    backgroundColor: '#3C3985',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' }
});
