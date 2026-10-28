import React, { useCallback, useState } from 'react';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../services/api/client';
import { ChoiceChips } from '../components/ChoiceChips';
import { Header } from '../components/Header';

/**
 * What GET /nominees returns per row. The server masks the identity number and derives
 * isMinor from the date of birth, so neither is computed here.
 */
type ApiNominee = {
  id: string;
  fullName: string;
  relationship: string;
  dateOfBirth: string;
  allocationPercentage: number;
  identityProofType: string | null;
  identityProofMasked: string | null;
  isMinor: boolean;
  guardianName: string | null;
  guardianRelationship: string | null;
  registeredWithAmc: boolean;
};

interface Nominee {
  id: string;
  fullName: string;
  relationship: string;
  dateOfBirth: string;
  sharePercentage: number;
  panOrAadhaar?: string;
  isMinor: boolean;
  guardianName?: string;
  guardianRelationship?: string;
}

// Labels for display; the API enum is the lowercase form, which toApiRelationship sends.
const RELATIONSHIPS = [
  'Spouse',
  'Son',
  'Daughter',
  'Mother',
  'Father',
  'Brother',
  'Sister',
  'Grandson',
  'Granddaughter',
  'Grandfather',
  'Grandmother',
  'Other'
];

/** The guardian's relationship to a minor nominee, for the same chips. */
const GUARDIAN_OPTIONS = RELATIONSHIPS.map((label) => ({ value: label.toLowerCase(), label }));

const toApiRelationship = (label: string) => label.trim().toLowerCase();

/** The form collects DD/MM/YYYY; the API takes an ISO date. */
const toIsoDate = (ddmmyyyy: string) => {
  const match = ddmmyyyy.trim().match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
};

const toDisplayDate = (iso: string) => {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
};

const fromApi = (n: ApiNominee): Nominee => ({
  id: n.id,
  fullName: n.fullName,
  relationship: n.relationship.charAt(0).toUpperCase() + n.relationship.slice(1),
  dateOfBirth: toDisplayDate(n.dateOfBirth),
  sharePercentage: n.allocationPercentage,
  panOrAadhaar: n.identityProofMasked ?? undefined,
  isMinor: n.isMinor,
  guardianName: n.guardianName ?? undefined,
  guardianRelationship: n.guardianRelationship ?? undefined,
});

export const NomineeDetailsScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();

  // Loaded from the server. This used to be seeded with a hardcoded "Aarav Sharma" at
  // 100%, which showed every investor a fabricated instruction about who inherits their
  // units - and persisted nothing they entered over it.
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [summary, setSummary] = useState<{ allocated: number; remaining: number; isComplete: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{
        nominees: ApiNominee[];
        allocatedPercentage: number;
        remainingPercentage: number;
        isComplete: boolean;
        message: string;
      }>('/nominees');
      setNominees((data?.nominees ?? []).map(fromApi));
      setSummary({
        allocated: data?.allocatedPercentage ?? 0,
        remaining: data?.remainingPercentage ?? 100,
        isComplete: !!data?.isComplete,
        message: data?.message ?? '',
      });
    } catch (e) {
      Alert.alert('Could not load nominees', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [fullName, setFullName] = useState('');
  // Nothing pre-selected: who the nominee is, and their share, are the investor's answers.
  const [relationship, setRelationship] = useState<string | null>(null);
  const [dob, setDob] = useState('');
  const [share, setShare] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [editAllocModalVisible, setEditAllocModalVisible] = useState(false);
  const [selectedNominee, setSelectedNominee] = useState<Nominee | null>(null);
  const [editShareValue, setEditShareValue] = useState('');
  const [editError, setEditError] = useState('');

  const totalShareAllocated =
    summary?.allocated ?? nominees.reduce((acc, curr) => acc + curr.sharePercentage, 0);

  const handleOpenEditShare = (nominee: Nominee) => {
    setSelectedNominee(nominee);
    setEditShareValue(nominee.sharePercentage.toString());
    setEditError('');
    setEditAllocModalVisible(true);
  };

  const handleSaveShareAllocation = async () => {
    setEditError('');
    const parsed = parseInt(editShareValue, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) {
      setEditError('Share percentage must be between 1% and 100%.');
      return;
    }
    if (!selectedNominee) return;

    try {
      // A full update: the API validates the new total against the other nominees, so a
      // change that would push the nomination past 100% is refused with the amount left.
      await api.put(`/nominees/${selectedNominee.id}`, {
        fullName: selectedNominee.fullName,
        relationship: toApiRelationship(selectedNominee.relationship),
        dateOfBirth: toIsoDate(selectedNominee.dateOfBirth),
        allocationPercentage: parsed,
        guardianName: selectedNominee.guardianName,
        // The guardian relationship already on record, not an assumed one.
        guardianRelationship: selectedNominee.isMinor ? (selectedNominee.guardianRelationship ?? undefined) : undefined,
      });
      setEditAllocModalVisible(false);
      setSelectedNominee(null);
      await load();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Could not update the allocation.');
    }
  };

  const handleAddNominee = async () => {
    setFormError('');
    if (!fullName.trim()) {
      setFormError('Please enter nominee full legal name.');
      return;
    }
    if (!relationship) {
      setFormError("Choose the nominee's relationship to you.");
      return;
    }
    const isoDob = toIsoDate(dob);
    if (!isoDob) {
      setFormError('Please enter the date of birth as DD/MM/YYYY.');
      return;
    }
    if (isMinor && (!guardianName.trim() || !guardianRelationship)) {
      setFormError("Enter the guardian's name and their relationship to the nominee.");
      return;
    }
    const parsedShare = parseInt(share, 10);
    if (isNaN(parsedShare) || parsedShare <= 0 || parsedShare > 100) {
      setFormError('Share allocation must be between 1% and 100%.');
      return;
    }

    setIsSubmitting(true);
    try {
      // The server derives minority from the date of birth and requires a guardian for
      // a minor, so the form's own isMinor box is a prompt, not the decision.
      await api.post('/nominees', {
        fullName: fullName.trim(),
        relationship: toApiRelationship(relationship),
        dateOfBirth: isoDob,
        allocationPercentage: parsedShare,
        identityProofType: idNumber.trim() ? (idNumber.trim().length === 12 ? 'aadhaar' : 'pan') : undefined,
        identityProofNumber: idNumber.trim() || undefined,
        guardianName: guardianName.trim() || undefined,
        guardianRelationship: guardianName.trim() ? (guardianRelationship ?? undefined) : undefined,
      });

      setModalVisible(false);
      setFullName('');
      setDob('');
      setShare('');
      setRelationship(null);
      setIdNumber('');
      setIsMinor(false);
      setGuardianName('');
      setGuardianRelationship(null);
      await load();
      // The server's own account of where the nomination stands - registered with the
      // fund house, waiting for the account or the full 100%, or refused and why.
      Alert.alert('Nominee saved', 'Your nominee has been saved. Where the nomination stands is shown at the top of this screen.');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not save the nominee.');
    } finally {
      setIsSubmitting(false);
    }
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
          onPress: async () => {
            try {
              await api.del(`/nominees/${id}`);
              await load();
            } catch (e) {
              Alert.alert('Could not remove nominee', e instanceof Error ? e.message : 'Please try again.');
            }
          },
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

        {/* The server's own wording, which states where the nomination actually stands -
            recorded with us, and sent to the AMC when the folio exists. */}
        {summary?.message ? (
          <View style={styles.statusNote}>
            <Ionicons
              name={summary.isComplete ? 'checkmark-circle-outline' : 'information-circle-outline'}
              size={16}
              color={summary.isComplete ? '#2F7D32' : '#7A5B00'}
            />
            <Text style={[styles.statusNoteText, summary.isComplete && styles.statusNoteTextDone]}>
              {summary.message}
            </Text>
          </View>
        ) : null}

        {loading ? <ActivityIndicator style={{ marginTop: 20 }} color="#3C3985" /> : null}

        {/* Nominee List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Nominees ({nominees.length}/3)</Text>
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
                  <Text style={styles.inputLabel}>Guardian&apos;s relationship to the nominee</Text>
                  <ChoiceChips options={GUARDIAN_OPTIONS} value={guardianRelationship} onChange={setGuardianRelationship} />
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
  statusNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#F0D48A', borderRadius: 10, padding: 12, marginTop: 14 },
  statusNoteText: { flex: 1, color: '#7A5B00', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  statusNoteTextDone: { color: '#2F7D32' },

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
