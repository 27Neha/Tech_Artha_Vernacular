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

interface Nominee {
  id: string;
  fullName: string;
  relationship: string;
  dateOfBirth: string;
  sharePercentage: number;
  panOrAadhaar?: string;
  isMinor: boolean;
  guardianName?: string;
}

const RELATIONSHIPS = [
  'Spouse',
  'Son',
  'Daughter',
  'Mother',
  'Father',
  'Brother',
  'Sister',
  'Other'
];

export const NomineeDetailsScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();

  const [nominees, setNominees] = useState<Nominee[]>([
    {
      id: 'nom_1',
      fullName: 'Aarav Sharma',
      relationship: 'Spouse',
      dateOfBirth: '15/08/1992',
      sharePercentage: 100,
      panOrAadhaar: '•••• •••• 9812',
      isMinor: false
    }
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0]);
  const [dob, setDob] = useState('');
  const [share, setShare] = useState('100');
  const [idNumber, setIdNumber] = useState('');
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [editAllocModalVisible, setEditAllocModalVisible] = useState(false);
  const [selectedNominee, setSelectedNominee] = useState<Nominee | null>(null);
  const [editShareValue, setEditShareValue] = useState('');
  const [editError, setEditError] = useState('');

  const totalShareAllocated = nominees.reduce((acc, curr) => acc + curr.sharePercentage, 0);

  const handleOpenEditShare = (nominee: Nominee) => {
    setSelectedNominee(nominee);
    setEditShareValue(nominee.sharePercentage.toString());
    setEditError('');
    setEditAllocModalVisible(true);
  };

  const handleSaveShareAllocation = () => {
    setEditError('');
    const parsed = parseInt(editShareValue, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) {
      setEditError('Share percentage must be between 1% and 100%.');
      return;
    }

    if (!selectedNominee) return;

    setNominees(prev =>
      prev.map(n =>
        n.id === selectedNominee.id ? { ...n, sharePercentage: parsed } : n
      )
    );
    setEditAllocModalVisible(false);
    setSelectedNominee(null);
    Alert.alert('Share Allocation Updated', `Updated ${selectedNominee.fullName}'s share allocation to ${parsed}%.`);
  };

  const handleAddNominee = () => {
    setFormError('');
    if (!fullName.trim()) {
      setFormError('Please enter nominee full legal name.');
      return;
    }
    if (!dob.trim() || dob.length < 8) {
      setFormError('Please enter a valid Date of Birth (DD/MM/YYYY).');
      return;
    }
    const parsedShare = parseInt(share, 10);
    if (isNaN(parsedShare) || parsedShare <= 0 || parsedShare > 100) {
      setFormError('Share allocation must be between 1% and 100%.');
      return;
    }
    if (isMinor && !guardianName.trim()) {
      setFormError('Guardian name is mandatory when nominee is a minor.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newNom: Nominee = {
        id: 'nom_' + Date.now(),
        fullName: fullName.trim(),
        relationship,
        dateOfBirth: dob.trim(),
        sharePercentage: parsedShare,
        panOrAadhaar: idNumber.trim() ? '•••• ' + idNumber.slice(-4) : undefined,
        isMinor,
        guardianName: isMinor ? guardianName.trim() : undefined
      };
      setNominees(prev => [...prev, newNom]);
      setIsSubmitting(false);
      setModalVisible(false);
      setFullName('');
      setDob('');
      setShare('100');
      setIdNumber('');
      setIsMinor(false);
      setGuardianName('');
      Alert.alert('Nominee Added', 'Nominee details have been registered under SEBI regulatory guidelines.');
    }, 850);
  };

  const handleDeleteNominee = (id: string) => {
    Alert.alert(
      'Remove Nominee',
      'Are you sure you want to remove this nominee from your mutual fund holdings?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setNominees(prev => prev.filter(n => n.id !== id))
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Title & Regulatory Context */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>{t('profile.nomineesTitle', { defaultValue: 'Nominee Details' })}</Text>
          <Text style={styles.subtitle}>
            {t('profile.nomineesSubtitle', { defaultValue: 'Secure your wealth by nominating trusted family members. Mandatory under SEBI regulations.' })}
          </Text>
        </View>

        {/* Regulatory SEBI Compliance Card */}
        <View style={styles.complianceCard}>
          <View style={styles.complianceIconBox}>
            <Ionicons name="document-lock" size={20} color="#3C3985" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.complianceTitle}>SEBI Regulatory Mandate</Text>
            <Text style={styles.complianceDesc}>
              You can declare up to 3 nominees for your investments. The total combined share allocation across all nominees must equal 100%.
            </Text>
          </View>
        </View>

        {/* Allocation Summary Pill */}
        <View style={styles.allocationRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="pie-chart-outline" size={16} color="#4A5568" />
            <Text style={styles.allocationLabel}>Total Share Allocated:</Text>
          </View>
          <View style={[styles.allocationPill, totalShareAllocated === 100 ? styles.pillValid : styles.pillWarning]}>
            <Text style={[styles.allocationValue, totalShareAllocated === 100 ? styles.valValid : styles.valWarning]}>
              {totalShareAllocated}% / 100%
            </Text>
          </View>
        </View>

        {/* Nominee List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Registered Nominees ({nominees.length}/3)</Text>
          {nominees.length < 3 && (
            <Pressable
              style={styles.addInlineBtn}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="person-add" size={15} color="#3C3985" />
              <Text style={styles.addInlineText}>Add Nominee</Text>
            </Pressable>
          )}
        </View>

        {nominees.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="people-outline" size={36} color="#A0AEC0" />
            </View>
            <Text style={styles.emptyTitle}>No Nominees Registered</Text>
            <Text style={styles.emptySubtitle}>
              Protect your loved ones by assigning a legal nominee for your mutual fund portfolio.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.primaryBtnText}>+ Add Nominee</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {nominees.map((nom, index) => (
              <View key={nom.id} style={styles.nomineeCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.avatarPill}>
                    <Text style={styles.avatarInitial}>{nom.fullName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.nomineeName}>{nom.fullName}</Text>
                      {nom.isMinor && (
                        <View style={styles.minorTag}>
                          <Text style={styles.minorTagText}>MINOR</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.nomineeRel}>{nom.relationship} • DOB: {nom.dateOfBirth}</Text>
                  </View>
                  <Pressable
                    hitSlop={8}
                    onPress={() => handleDeleteNominee(nom.id)}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardMetaRow}>
                  <View>
                    <Text style={styles.metaLabel}>Share Allocation</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.metaValueHighlight}>{nom.sharePercentage}%</Text>
                      <Pressable 
                        style={styles.editShareBtn}
                        onPress={() => handleOpenEditShare(nom)}
                        hitSlop={6}
                      >
                        <Ionicons name="pencil" size={12} color="#3C3985" style={{ marginRight: 3 }} />
                        <Text style={styles.editShareText}>Change %</Text>
                      </Pressable>
                    </View>
                  </View>
                  {nom.panOrAadhaar ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.metaLabel}>ID Document</Text>
                      <Text style={styles.metaValue}>{nom.panOrAadhaar}</Text>
                    </View>
                  ) : null}
                  {nom.isMinor && nom.guardianName ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.metaLabel}>Guardian</Text>
                      <Text style={styles.metaValue}>{nom.guardianName}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Instructions / Compliance footer */}
        <View style={styles.complianceFooter}>
          <Ionicons name="shield-outline" size={18} color="#64748B" />
          <Text style={styles.footerNote}>
            Nomination is held at the folio level across all Asset Management Companies (AMCs) and RTAs (CAMS & KFintech).
          </Text>
        </View>
      </ScrollView>

      {/* Add Nominee Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Nominee Details</Text>
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

              <Text style={styles.inputLabel}>Full Legal Name (as per PAN/Aadhaar)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Priya Sharma"
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.inputLabel}>Relationship with Investor</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {RELATIONSHIPS.map(rel => (
                    <Pressable
                      key={rel}
                      style={[styles.relPill, relationship === rel && styles.relPillActive]}
                      onPress={() => setRelationship(rel)}
                    >
                      <Text style={[styles.relText, relationship === rel && styles.relTextActive]}>{rel}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.inputLabel}>Date of Birth (DD/MM/YYYY)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="DD/MM/YYYY"
                maxLength={10}
                value={dob}
                onChangeText={setDob}
              />

              <Text style={styles.inputLabel}>Share Percentage (%)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 100 or 50"
                keyboardType="number-pad"
                maxLength={3}
                value={share}
                onChangeText={setShare}
              />

              <Text style={styles.inputLabel}>Nominee PAN or Aadhaar (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter last 4 digits or ID"
                value={idNumber}
                onChangeText={setIdNumber}
              />

              {/* Minor Toggle */}
              <Pressable
                style={styles.minorRow}
                onPress={() => setIsMinor(!isMinor)}
              >
                <View style={[styles.checkbox, isMinor && styles.checkboxActive]}>
                  {isMinor && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.minorLabel}>Nominee is a minor (below 18 years of age)</Text>
              </Pressable>

              {isMinor && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.inputLabel}>Guardian Legal Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter guardian's full name"
                    value={guardianName}
                    onChangeText={setGuardianName}
                  />
                </View>
              )}

              <Pressable
                style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleAddNominee}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Nominee Details</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Share Allocation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={editAllocModalVisible}
        onRequestClose={() => setEditAllocModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Change Share Allocation</Text>
                {selectedNominee && (
                  <Text style={styles.editNomineeSub}>Nominee: {selectedNominee.fullName}</Text>
                )}
              </View>
              <Pressable hitSlop={10} onPress={() => setEditAllocModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#A0AEC0" />
              </Pressable>
            </View>

            {editError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{editError}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Share Percentage (%)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 50, 75, or 100"
              keyboardType="number-pad"
              maxLength={3}
              value={editShareValue}
              onChangeText={setEditShareValue}
              autoFocus
            />

            {/* Quick Presets */}
            <View style={styles.presetRow}>
              {[25, 33, 50, 75, 100].map(val => (
                <Pressable
                  key={val}
                  style={[styles.presetPill, editShareValue === val.toString() && styles.presetPillActive]}
                  onPress={() => setEditShareValue(val.toString())}
                >
                  <Text style={[styles.presetText, editShareValue === val.toString() && styles.presetTextActive]}>
                    {val}%
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.helperText}>
              SEBI requires total allocation among all declared nominees to equal 100%.
            </Text>

            <Pressable
              style={styles.submitBtn}
              onPress={handleSaveShareAllocation}
            >
              <Text style={styles.submitBtnText}>Update Allocation</Text>
            </Pressable>
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
  complianceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#D4E2FF',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    marginBottom: 16
  },
  complianceIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBEAF8',
    alignItems: 'center',
    justifyContent: 'center'
  },
  complianceTitle: { fontSize: 13, fontWeight: '700', color: '#3C3985', marginBottom: 2 },
  complianceDesc: { fontSize: 11, color: '#4A5568', lineHeight: 16 },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24
  },
  allocationLabel: { fontSize: 13, fontWeight: '700', color: '#334155' },
  allocationPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  pillValid: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  pillWarning: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  allocationValue: { fontSize: 12, fontWeight: '800' },
  valValid: { color: '#059669' },
  valWarning: { color: '#D97706' },
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
  nomineeCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  avatarPill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#3C3985',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitial: { color: '#fff', fontSize: 18, fontWeight: '800' },
  nomineeName: { fontSize: 15, fontWeight: '800', color: '#102A54' },
  nomineeRel: { fontSize: 12, color: '#64748B', marginTop: 2 },
  minorTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  minorTagText: { fontSize: 9, fontWeight: '800', color: '#B45309' },
  deleteBtn: {
    padding: 6
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  metaLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 2 },
  metaValueHighlight: { fontSize: 15, fontWeight: '800', color: '#3C3985' },
  metaValue: { fontSize: 12, fontWeight: '700', color: '#334155' },
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
  complianceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    paddingHorizontal: 4
  },
  footerNote: { fontSize: 11, color: '#64748B', flex: 1, lineHeight: 16 },
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
  relPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  relPillActive: {
    borderColor: '#3C3985',
    backgroundColor: '#EBEAF8'
  },
  relText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  relTextActive: { color: '#3C3985', fontWeight: '800' },
  minorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 6
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxActive: {
    backgroundColor: '#3C3985',
    borderColor: '#3C3985'
  },
  minorLabel: { fontSize: 12, fontWeight: '600', color: '#334155' },
  editShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBEAF8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  editShareText: { fontSize: 11, fontWeight: '700', color: '#3C3985' },
  editModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24
  },
  editNomineeSub: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '600' },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 8
  },
  presetPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  presetPillActive: {
    backgroundColor: '#3C3985',
    borderColor: '#3C3985'
  },
  presetText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  presetTextActive: { color: '#fff' },
  helperText: { fontSize: 11, color: '#94A3B8', marginTop: 6, lineHeight: 16 },
  submitBtn: {
    backgroundColor: '#3C3985',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' }
});
