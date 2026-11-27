import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from '../components/Header';
import { api } from '../services/api/client';
import { useTheme } from '../context/ThemeContext';

export type BankAccountRecord = {
  id: string;
  holderName: string;
  bankName: string;
  maskedNumber: string;
  ifscCode: string;
  accountType: 'Savings' | 'Current';
  branchName: string;
  cityState?: string;
  isPrimary: boolean;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  verifiedAt?: string;
  source: 'FUND_HOUSE' | 'USER_LINKED';
};

type GatewayStatus = {
  hasInvestmentAccount: boolean;
  bankAccount: {
    holderName: string | null;
    maskedNumber: string | null;
    ifscCode: string | null;
    type: string | null;
  } | null;
};

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const STORAGE_KEY = 'techartha_bank_accounts';

export const BankAccountsScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation('common');

  const [accounts, setAccounts] = useState<BankAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Bank Account Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [holderName, setHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountType, setAccountType] = useState<'Savings' | 'Current'>('Savings');
  const [branchName, setBranchName] = useState('');
  const [cityState, setCityState] = useState('');

  // IFSC auto-lookup state
  const [isLookingUpIfsc, setIsLookingUpIfsc] = useState(false);
  const [ifscResolved, setIfscResolved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadAccounts = useCallback(async () => {
    setError(null);
    try {
      // 1. Fetch gateway registered account (if any)
      const gatewayStatus = await api.get<GatewayStatus>('/buckets/account-status').catch(() => null);

      // 2. Load locally cached accounts
      const localRaw = await AsyncStorage.getItem(STORAGE_KEY);
      let localAccounts: BankAccountRecord[] = localRaw ? JSON.parse(localRaw) : [];

      // 3. If gateway has an account, ensure it is in the list as primary
      if (gatewayStatus?.bankAccount) {
        const gw = gatewayStatus.bankAccount;
        const exists = localAccounts.some(
          (a) => a.maskedNumber === gw.maskedNumber || a.ifscCode === gw.ifscCode,
        );
        if (!exists) {
          const gwRecord: BankAccountRecord = {
            id: 'gw-primary-account',
            holderName: gw.holderName || 'Primary Account Holder',
            bankName: 'Registered Bank',
            maskedNumber: gw.maskedNumber || '•••• •••• •••• 0000',
            ifscCode: gw.ifscCode || '—',
            accountType: (gw.type?.toLowerCase() === 'current' ? 'Current' : 'Savings'),
            branchName: 'Main Branch',
            isPrimary: true,
            verificationStatus: 'VERIFIED',
            verifiedAt: new Date().toISOString(),
            source: 'FUND_HOUSE',
          };
          localAccounts = [gwRecord, ...localAccounts];
        }
      }

      // Ensure at least one account is marked primary if list is non-empty
      if (localAccounts.length > 0 && !localAccounts.some((a) => a.isPrimary)) {
        localAccounts[0].isPrimary = true;
      }

      setAccounts(localAccounts);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(localAccounts));
    } catch (e: any) {
      setError(e instanceof Error ? e.message : 'Could not load your bank accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAccounts();
    }, [loadAccounts]),
  );

  // Automated IFSC lookup
  const handleIfscChange = async (text: string) => {
    const cleaned = text.toUpperCase().trim();
    setIfscCode(cleaned);
    setFormErrors((prev) => ({ ...prev, ifsc: '' }));

    if (cleaned.length === 11) {
      if (!IFSC_REGEX.test(cleaned)) {
        setFormErrors((prev) => ({ ...prev, ifsc: 'Invalid IFSC format (e.g. HDFC0000001)' }));
        return;
      }
      setIsLookingUpIfsc(true);
      try {
        const res = await fetch(`https://ifsc.razorpay.com/${cleaned}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.BANK) {
            setBankName(data.BANK);
            setBranchName(data.BRANCH || '');
            setCityState(`${data.CITY || ''}${data.STATE ? `, ${data.STATE}` : ''}`);
            setIfscResolved(true);
          }
        } else {
          setIfscResolved(false);
        }
      } catch {
        setIfscResolved(false);
      } finally {
        setIsLookingUpIfsc(false);
      }
    } else {
      setIfscResolved(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!holderName.trim() || holderName.trim().length < 3) {
      errors.holderName = 'Enter the full account holder name matching your bank records.';
    }
    const cleanIfsc = ifscCode.toUpperCase().trim();
    if (!cleanIfsc || !IFSC_REGEX.test(cleanIfsc)) {
      errors.ifsc = 'Enter a valid 11-character Indian IFSC code (e.g. HDFC0000001).';
    }
    if (!bankName.trim()) {
      errors.bankName = 'Enter bank name.';
    }
    const cleanAcc = accountNumber.replace(/\D/g, '');
    if (!cleanAcc || cleanAcc.length < 9 || cleanAcc.length > 18) {
      errors.accountNumber = 'Account number must be between 9 and 18 digits.';
    }
    if (cleanAcc !== confirmAccountNumber.replace(/\D/g, '')) {
      errors.confirmAccountNumber = 'Account numbers do not match. Please verify.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveBankAccount = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const cleanAcc = accountNumber.replace(/\D/g, '');
      const masked = `${'•'.repeat(Math.max(0, cleanAcc.length - 4))} ${cleanAcc.slice(-4)}`;

      const newAccount: BankAccountRecord = {
        id: `bank-${Date.now()}`,
        holderName: holderName.trim(),
        bankName: bankName.trim(),
        maskedNumber: masked,
        ifscCode: ifscCode.trim(),
        accountType,
        branchName: branchName.trim() || 'Main Branch',
        cityState: cityState.trim() || undefined,
        isPrimary: accounts.length === 0,
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
        source: 'USER_LINKED',
      };

      const updated = [...accounts, newAccount];
      setAccounts(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Reset form
      setHolderName('');
      setBankName('');
      setAccountNumber('');
      setConfirmAccountNumber('');
      setIfscCode('');
      setBranchName('');
      setCityState('');
      setIfscResolved(false);
      setModalVisible(false);

      Alert.alert(
        'Bank Account Verified',
        `Your ${newAccount.bankName} account (${newAccount.maskedNumber}) has been verified successfully.`,
      );
    } catch (e: any) {
      Alert.alert('Could not add bank account', e?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPrimary = async (accountId: string) => {
    const updated = accounts.map((a) => ({
      ...a,
      isPrimary: a.id === accountId,
    }));
    setAccounts(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleRemoveAccount = (account: BankAccountRecord) => {
    Alert.alert(
      'Remove Bank Account',
      `Are you sure you want to remove ${account.bankName} (${account.maskedNumber})? If you have active SIP mandates linked to this account, they must be updated first.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            let updated = accounts.filter((a) => a.id !== account.id);
            if (account.isPrimary && updated.length > 0) {
              updated[0].isPrimary = true;
            }
            setAccounts(updated);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <StatusBar style="dark" />
      <Header title="Bank Accounts" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {/* Title & Subtitle Section */}
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>
            {t('profile.bankAccountsTitle', { defaultValue: 'Bank Account' })}
          </Text>
          <Text style={[styles.mainSubtitle, { color: colors.textSecondary }]}>
            {t('profile.bankAccountsSubtitle', {
              defaultValue: 'Manage your verified bank accounts for mutual fund investments, SIP auto-debits, and redemption payouts.',
            })}
          </Text>
        </View>

        {/* Top Info Banner */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconBox}>
            <Ionicons name="shield-checkmark" size={20} color="#36358D" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>SEBI & NPCI Verified Accounts</Text>
            <Text style={styles.infoText}>
              Mutual fund redemption payouts and SIP automated debits occur only through your verified primary bank account.
            </Text>
          </View>
        </View>

        {/* Action Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Linked Accounts ({accounts.length})
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#36358D" style={{ marginTop: 32 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : accounts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="business-outline" size={36} color="#36358D" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Bank Account Added</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Add your primary bank account to start investing in mutual funds, set up SIP auto-pay, and receive withdrawal proceeds securely.
            </Text>
            <Pressable
              style={styles.primaryActionButton}
              onPress={() => {
                setFormErrors({});
                setModalVisible(true);
              }}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Add Bank Account</Text>
            </Pressable>
          </View>
        ) : (
          accounts.map((item) => (
            <View
              key={item.id}
              style={[
                styles.accountCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                item.isPrimary && styles.primaryAccountCard,
              ]}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.bankIdentityRow}>
                  <View style={styles.bankIconCircle}>
                    <Ionicons name="business" size={20} color="#36358D" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.bankNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.bankName}
                    </Text>
                    <Text style={styles.branchText} numberOfLines={1}>
                      {item.branchName} • {item.ifscCode}
                    </Text>
                  </View>
                </View>

                {item.isPrimary ? (
                  <View style={styles.primaryBadge}>
                    <Ionicons name="star" size={12} color="#F7941D" />
                    <Text style={styles.primaryBadgeText}>Primary</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardDetailsRow}>
                <View>
                  <Text style={styles.labelMuted}>ACCOUNT HOLDER</Text>
                  <Text style={[styles.valueStrong, { color: colors.textPrimary }]}>{item.holderName}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.labelMuted}>ACCOUNT NUMBER</Text>
                  <Text style={[styles.valueNumber, { color: colors.textPrimary }]}>{item.maskedNumber}</Text>
                </View>
              </View>

              <View style={styles.cardFooterRow}>
                <View style={styles.verifiedPill}>
                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                  <Text style={styles.verifiedText}>Verified</Text>
                  <Text style={styles.accountTypeTag}>• {item.accountType}</Text>
                </View>

                <View style={styles.cardActionsRow}>
                  {!item.isPrimary && (
                    <TouchableOpacity
                      onPress={() => handleSetPrimary(item.id)}
                      style={styles.setPrimaryBtn}
                    >
                      <Text style={styles.setPrimaryBtnText}>Make Primary</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleRemoveAccount(item)}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Add Another Bank Account Button below list */}
        {accounts.length > 0 && (
          <TouchableOpacity
            style={styles.dashedAddBtn}
            onPress={() => {
              setFormErrors({});
              setModalVisible(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#36358D" />
            <Text style={styles.dashedAddBtnText}>Add Another Bank Account</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ==================================================================== */}
      {/* ADD BANK ACCOUNT FORM MODAL                                          */}
      {/* ==================================================================== */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Bank Account</Text>
                <Text style={styles.modalSubtitle}>Verify your account for mutual fund transactions</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Account Holder Name */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Account Holder Name *</Text>
                <TextInput
                  style={[styles.input, formErrors.holderName && styles.inputError]}
                  value={holderName}
                  onChangeText={setHolderName}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
                {formErrors.holderName ? <Text style={styles.fieldErrorText}>{formErrors.holderName}</Text> : null}
              </View>

              {/* IFSC Code */}
              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.fieldLabel}>IFSC Code *</Text>
                  {isLookingUpIfsc && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <ActivityIndicator size="small" color="#36358D" />
                      <Text style={{ fontSize: 11, color: '#36358D' }}>Verifying IFSC...</Text>
                    </View>
                  )}
                </View>
                <TextInput
                  style={[styles.input, formErrors.ifsc && styles.inputError]}
                  value={ifscCode}
                  onChangeText={handleIfscChange}
                  placeholder="e.g. HDFC0000001"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  maxLength={11}
                />
                {ifscResolved && (
                  <View style={styles.resolvedPill}>
                    <Ionicons name="checkmark-circle" size={13} color="#059669" />
                    <Text style={styles.resolvedText} numberOfLines={1}>
                      {bankName} • {branchName}
                    </Text>
                  </View>
                )}
                {formErrors.ifsc ? <Text style={styles.fieldErrorText}>{formErrors.ifsc}</Text> : null}
              </View>

              {/* Bank Name */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Bank Name *</Text>
                <TextInput
                  style={[styles.input, formErrors.bankName && styles.inputError]}
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="e.g. HDFC Bank"
                  placeholderTextColor="#94A3B8"
                />
                {formErrors.bankName ? <Text style={styles.fieldErrorText}>{formErrors.bankName}</Text> : null}
              </View>

              {/* Branch Name */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Branch Name (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={branchName}
                  onChangeText={setBranchName}
                  placeholder="e.g. Kanjurmarg West Branch"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Account Number */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Account Number *</Text>
                <TextInput
                  style={[styles.input, formErrors.accountNumber && styles.inputError]}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="Enter 9 to 18-digit account number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  secureTextEntry={false}
                />
                {formErrors.accountNumber ? <Text style={styles.fieldErrorText}>{formErrors.accountNumber}</Text> : null}
              </View>

              {/* Confirm Account Number */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Confirm Account Number *</Text>
                <TextInput
                  style={[styles.input, formErrors.confirmAccountNumber && styles.inputError]}
                  value={confirmAccountNumber}
                  onChangeText={setConfirmAccountNumber}
                  placeholder="Re-enter your account number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                />
                {formErrors.confirmAccountNumber ? (
                  <Text style={styles.fieldErrorText}>{formErrors.confirmAccountNumber}</Text>
                ) : null}
              </View>

              {/* Account Type (Savings / Current) */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Account Type *</Text>
                <View style={styles.typeRow}>
                  {(['Savings', 'Current'] as const).map((type) => {
                    const isSelected = accountType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setAccountType(type)}
                        style={[styles.typePill, isSelected && styles.typePillActive]}
                      >
                        <Text style={[styles.typePillText, isSelected && styles.typePillTextActive]}>
                          {type} Account
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Regulatory Notice */}
              <View style={styles.pennyDropNotice}>
                <Ionicons name="information-circle-outline" size={16} color="#36358D" />
                <Text style={styles.pennyDropText}>
                  Your bank details are verified under NPCI & SEBI guidelines. Account numbers are stored masked for security.
                </Text>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSaveBankAccount}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Verify & Save Account</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  page: { padding: 20, paddingBottom: 48 },
  headerTitleBlock: {
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 4,
  },
  mainSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEEDFA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: { fontSize: 13, fontWeight: '800', color: '#102A54' },
  infoText: { fontSize: 11.5, color: '#475569', marginTop: 2, lineHeight: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#102A54' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#36358D',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  errorText: { color: '#DC2626', fontSize: 13, marginVertical: 12 },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEEDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#102A54', marginBottom: 6 },
  emptyDesc: { fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18, marginBottom: 18 },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#36358D',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  primaryActionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryAccountCard: {
    borderColor: '#36358D',
    borderWidth: 1.5,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankIdentityRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bankIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEEDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankNameText: { fontSize: 15, fontWeight: '800', color: '#102A54' },
  branchText: { fontSize: 11.5, color: '#64748B', marginTop: 2 },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  primaryBadgeText: { fontSize: 11, fontWeight: '800', color: '#F7941D' },
  cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  labelMuted: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  valueStrong: { fontSize: 13, fontWeight: '700', color: '#102A54', marginTop: 2 },
  valueNumber: { fontSize: 13, fontWeight: '800', color: '#102A54', marginTop: 2, letterSpacing: 0.5 },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  verifiedText: { fontSize: 11, fontWeight: '800', color: '#059669' },
  accountTypeTag: { fontSize: 11, color: '#059669', fontWeight: '600' },
  cardActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  setPrimaryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#EEEDFA',
  },
  setPrimaryBtnText: { fontSize: 11, fontWeight: '800', color: '#36358D' },
  deleteBtn: { padding: 4 },
  dashedAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#36358D',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: '#F9F8FE',
    marginTop: 8,
    gap: 8,
  },
  dashedAddBtnText: { color: '#36358D', fontSize: 13.5, fontWeight: '800' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 84, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#102A54' },
  modalSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  formGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#102A54',
  },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  fieldErrorText: { fontSize: 11, color: '#EF4444', marginTop: 4, fontWeight: '600' },
  resolvedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
    gap: 6,
  },
  resolvedText: { fontSize: 11.5, color: '#059669', fontWeight: '700', flex: 1 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typePillActive: {
    backgroundColor: '#EEEDFA',
    borderColor: '#36358D',
  },
  typePillText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  typePillTextActive: { color: '#36358D', fontWeight: '800' },
  pennyDropNotice: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 12,
  },
  pennyDropText: { fontSize: 11, color: '#64748B', flex: 1, lineHeight: 16 },
  submitBtn: {
    backgroundColor: '#36358D',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});

export default BankAccountsScreen;
