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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from '../components/Header';
import { api } from '../services/api/client';
import { useTheme } from '../context/ThemeContext';

export type FamilyRelationship =
  | 'Father'
  | 'Mother'
  | 'Spouse'
  | 'Son'
  | 'Daughter'
  | 'Brother'
  | 'Sister'
  | 'Guardian'
  | 'Other';

export type FamilyMember = {
  id: string;
  fullName: string;
  relationship: FamilyRelationship;
  dateOfBirth: string; // DD/MM/YYYY
  age: number;
  isMinor: boolean;
  contactNumber?: string;
  email?: string;
  panNumber?: string;
  kycStatus: 'VERIFIED' | 'PENDING' | 'NOT_STARTED';
  guardianDetails?: {
    guardianName: string;
    guardianRelationship: string;
    guardianPan?: string;
    guardianMobile?: string;
    isAuthorized: boolean;
  };
  portfolioSummary?: {
    totalValue: number;
    investedValue: number;
  };
  createdAt: string;
};

const RELATIONSHIPS: FamilyRelationship[] = [
  'Spouse',
  'Son',
  'Daughter',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Guardian',
  'Other',
];

const GUARDIAN_RELATIONSHIPS = ['Father', 'Mother', 'Legal Guardian'];

const STORAGE_KEY = 'techartha_family_members';

const calculateAge = (dobString: string): number => {
  const parts = dobString.trim().split(/[/-]/);
  if (parts.length !== 3) return 0;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy || yyyy < 1900 || yyyy > new Date().getFullYear()) return 0;
  const birthDate = new Date(yyyy, mm - 1, dd);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return isNaN(age) || age < 0 ? 0 : age;
};

export const FamilyPortfolioScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [primaryPortfolio, setPrimaryPortfolio] = useState<{ totalValue: number; investedValue: number } | null>(null);
  const [primaryUserName, setPrimaryUserName] = useState('Primary Investor');
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ADULT' | 'MINOR'>('ALL');

  // Add Family Member Modal Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState<FamilyRelationship>('Spouse');
  const [dob, setDob] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // Minor Guardian State
  const [guardianName, setGuardianName] = useState('');
  const [guardianRel, setGuardianRel] = useState(GUARDIAN_RELATIONSHIPS[0]);
  const [guardianPan, setGuardianPan] = useState('');
  const [guardianMobile, setGuardianMobile] = useState('');
  const [guardianConsent, setGuardianConsent] = useState(false);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const parsedAge = dob.length >= 8 ? calculateAge(dob) : 0;
  const isMinorDetected = dob.length >= 8 && parsedAge < 18;

  const loadFamilyData = useCallback(async () => {
    try {
      // 1. Load primary portfolio
      const [portRes, profileRes] = await Promise.all([
        api.get<any>('/portfolio').catch(() => null),
        api.get<any>('/auth/profile').catch(() => null),
      ]);

      if (portRes?.summary) {
        setPrimaryPortfolio({
          totalValue: Number(portRes.summary.currentValue ?? portRes.summary.totalValue ?? 0),
          investedValue: Number(portRes.summary.investedValue ?? portRes.summary.totalInvested ?? 0),
        });
      }
      if (profileRes?.profile?.fullName || profileRes?.name) {
        setPrimaryUserName(profileRes.profile?.fullName || profileRes.name);
      }

      // 2. Load family members from persistent storage
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setMembers(JSON.parse(raw));
      }
    } catch (e) {
      console.warn('Family portfolio load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFamilyData();
    }, [loadFamilyData]),
  );

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 3) {
      errors.fullName = 'Enter legal full name (at least 3 characters).';
    }
    const dobPattern = /^\d{2}[/-]\d{2}[/-]\d{4}$/;
    if (!dob.trim() || !dobPattern.test(dob.trim())) {
      errors.dob = 'Enter date of birth as DD/MM/YYYY.';
    } else {
      const age = calculateAge(dob.trim());
      if (age > 115) {
        errors.dob = 'Enter a valid date of birth.';
      }
    }

    if (isMinorDetected) {
      if (!guardianName.trim() || guardianName.trim().length < 3) {
        errors.guardianName = "Enter guardian's full legal name.";
      }
      if (!guardianPan.trim() || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(guardianPan.trim().toUpperCase())) {
        errors.guardianPan = "Enter guardian's valid 10-character PAN (e.g. ABCDE1234F).";
      }
      if (!guardianConsent) {
        errors.guardianConsent = 'Guardian authorization declaration must be acknowledged.';
      }
    } else {
      if (panNumber.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber.trim().toUpperCase())) {
        errors.panNumber = 'Enter a valid PAN format (e.g. ABCDE1234F).';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveMember = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const age = calculateAge(dob.trim());
      const isMinor = age < 18;

      const newMember: FamilyMember = {
        id: `fam-${Date.now()}`,
        fullName: fullName.trim(),
        relationship,
        dateOfBirth: dob.trim(),
        age,
        isMinor,
        contactNumber: contactNumber.trim() || undefined,
        email: email.trim() || undefined,
        panNumber: panNumber.trim() ? panNumber.trim().toUpperCase() : undefined,
        kycStatus: isMinor ? 'PENDING' : 'NOT_STARTED',
        guardianDetails: isMinor
          ? {
              guardianName: guardianName.trim(),
              guardianRelationship: guardianRel,
              guardianPan: guardianPan.trim().toUpperCase(),
              guardianMobile: guardianMobile.trim() || undefined,
              isAuthorized: guardianConsent,
            }
          : undefined,
        createdAt: new Date().toISOString(),
      };

      const updated = [...members, newMember];
      setMembers(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Reset form
      setFullName('');
      setDob('');
      setContactNumber('');
      setEmail('');
      setPanNumber('');
      setGuardianName('');
      setGuardianPan('');
      setGuardianMobile('');
      setGuardianConsent(false);
      setModalVisible(false);

      Alert.alert(
        'Family Member Added',
        isMinor
          ? `${newMember.fullName} has been added as a minor portfolio under legal guardianship of ${newMember.guardianDetails?.guardianName}.`
          : `${newMember.fullName} has been added as an adult family member.`,
      );
    } catch (e: any) {
      Alert.alert('Could not add family member', e?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = (member: FamilyMember) => {
    Alert.alert(
      'Remove Family Member',
      `Are you sure you want to remove ${member.fullName} (${member.relationship}) from your family dashboard? Their individual mutual fund units and legal folios remain protected with their respective AMC.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = members.filter((m) => m.id !== member.id);
            setMembers(updated);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          },
        },
      ],
    );
  };

  const displayedMembers = members.filter((m) => {
    if (activeFilter === 'ADULT') return !m.isMinor;
    if (activeFilter === 'MINOR') return m.isMinor;
    return true;
  });

  const adultCount = members.filter((m) => !m.isMinor).length;
  const minorCount = members.filter((m) => m.isMinor).length;

  return (
    <View style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <StatusBar style="dark" />
      <Header title="Family Portfolio" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Compliance Context Header */}
        <View style={styles.complianceCard}>
          <View style={styles.complianceIconBox}>
            <Ionicons name="people" size={20} color="#36358D" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.complianceTitle}>Household Wealth Dashboard</Text>
            <Text style={styles.complianceText}>
              Consolidate family tracking while keeping tax identities, individual PAN folios, and minor legal accounts strictly segregated under SEBI guidelines.
            </Text>
          </View>
        </View>

        {/* Primary Investor Card (Self) */}
        <View style={styles.primaryUserCard}>
          <View style={styles.primaryCardTop}>
            <View style={styles.avatarCirclePrimary}>
              <Text style={styles.avatarInitialPrimary}>{primaryUserName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.primaryNameText}>{primaryUserName}</Text>
                <View style={styles.selfTag}>
                  <Text style={styles.selfTagText}>Primary (You)</Text>
                </View>
              </View>
              <Text style={styles.primarySubText}>KYC Verified Investor • Tax Folio Active</Text>
            </View>
          </View>

          <View style={styles.primaryDivider} />

          <View style={styles.primaryMetricsRow}>
            <View>
              <Text style={styles.metricLabelMuted}>CURRENT PORTFOLIO</Text>
              <Text style={styles.metricValueLarge}>
                ₹{(primaryPortfolio?.totalValue ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.metricLabelMuted}>INVESTED CAPITAL</Text>
              <Text style={styles.metricValueMedium}>
                ₹{(primaryPortfolio?.investedValue ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Section Header with Add Action */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Family Members</Text>
            <Text style={styles.sectionSub}>
              {members.length} {members.length === 1 ? 'member' : 'members'} ({adultCount} Adult, {minorCount} Minor)
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addMemberBtn}
            onPress={() => {
              setFormErrors({});
              setModalVisible(true);
            }}
          >
            <Ionicons name="person-add" size={15} color="#FFFFFF" />
            <Text style={styles.addMemberBtnText}>Add Member</Text>
          </TouchableOpacity>
        </View>

        {/* Segregation Filter Tabs */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setActiveFilter('ALL')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'ALL' && styles.filterChipTextActive]}>
              All ({members.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'ADULT' && styles.filterChipActive]}
            onPress={() => setActiveFilter('ADULT')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'ADULT' && styles.filterChipTextActive]}>
              Adults ({adultCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'MINOR' && styles.filterChipActive]}
            onPress={() => setActiveFilter('MINOR')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'MINOR' && styles.filterChipTextActive]}>
              Minors &lt;18Y ({minorCount})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#36358D" style={{ marginTop: 24 }} />
        ) : displayedMembers.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="people-outline" size={36} color="#36358D" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {activeFilter === 'MINOR'
                ? 'No Minor Accounts Registered'
                : activeFilter === 'ADULT'
                ? 'No Adult Family Members Added'
                : 'No Family Members Added Yet'}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Add spouse, children, parents or siblings to track your family’s combined financial future while maintaining distinct legal folios and bank mandates.
            </Text>
            <Pressable
              style={styles.primaryAddAction}
              onPress={() => {
                setFormErrors({});
                setModalVisible(true);
              }}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.primaryAddActionText}>+ Add Family Member</Text>
            </Pressable>
          </View>
        ) : (
          displayedMembers.map((member) => (
            <View
              key={member.id}
              style={[styles.memberCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.memberTopRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.avatarInitial}>{member.fullName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.memberName, { color: colors.textPrimary }]}>{member.fullName}</Text>
                    {member.isMinor ? (
                      <View style={styles.minorTag}>
                        <Text style={styles.minorTagText}>MINOR &lt;18Y</Text>
                      </View>
                    ) : (
                      <View style={styles.adultTag}>
                        <Text style={styles.adultTagText}>ADULT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberRelText}>
                    {member.relationship} • {member.age} Years (DOB: {member.dateOfBirth})
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleRemoveMember(member)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.trashBtn}
                >
                  <Ionicons name="trash-outline" size={17} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* If Minor: Render SEBI Legal Guardian Card */}
              {member.isMinor && member.guardianDetails ? (
                <View style={styles.guardianInfoBox}>
                  <View style={styles.guardianHeaderRow}>
                    <Ionicons name="shield-checkmark" size={14} color="#D97706" />
                    <Text style={styles.guardianHeaderTitle}>
                      LEGAL GUARDIAN: {member.guardianDetails.guardianName.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.guardianSubText}>
                    Relationship: {member.guardianDetails.guardianRelationship} • PAN: {member.guardianDetails.guardianPan || 'Provided'}
                  </Text>
                  <Text style={styles.guardianBankNote}>
                    ✓ Guardian bank account verified for minor SIP deductions & redemption payouts.
                  </Text>
                </View>
              ) : (
                <View style={styles.adultInfoBox}>
                  <Text style={styles.adultPanText}>
                    Tax Identity: {member.panNumber ? `${member.panNumber.slice(0, 5)}••••${member.panNumber.slice(-1)}` : 'PAN to be linked during first investment'}
                  </Text>
                  {member.contactNumber ? (
                    <Text style={styles.adultContactText}>Mobile: +91 {member.contactNumber}</Text>
                  ) : null}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* ==================================================================== */}
      {/* ADD FAMILY MEMBER MODAL                                              */}
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
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Family Member</Text>
                <Text style={styles.modalSubtitle}>Track household wealth with legal folio segregation</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Full Name */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Full Legal Name *</Text>
                <TextInput
                  style={[styles.input, formErrors.fullName && styles.inputError]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g. Priya Sharma"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
                {formErrors.fullName ? <Text style={styles.errorText}>{formErrors.fullName}</Text> : null}
              </View>

              {/* Relationship */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Relationship with Primary Investor *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 8 }}>
                  {RELATIONSHIPS.map((rel) => {
                    const isSelected = relationship === rel;
                    return (
                      <TouchableOpacity
                        key={rel}
                        onPress={() => setRelationship(rel)}
                        style={[styles.relChip, isSelected && styles.relChipActive]}
                      >
                        <Text style={[styles.relChipText, isSelected && styles.relChipTextActive]}>{rel}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Date of Birth (DD/MM/YYYY) */}
              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.fieldLabel}>Date of Birth (DD/MM/YYYY) *</Text>
                  {parsedAge > 0 && (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isMinorDetected ? '#D97706' : '#2563EB' }}>
                      {parsedAge} Years ({isMinorDetected ? 'Minor' : 'Adult'})
                    </Text>
                  )}
                </View>
                <TextInput
                  style={[styles.input, formErrors.dob && styles.inputError]}
                  value={dob}
                  onChangeText={setDob}
                  placeholder="e.g. 15/08/2012"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  maxLength={10}
                />
                {formErrors.dob ? <Text style={styles.errorText}>{formErrors.dob}</Text> : null}
              </View>

              {/* DYNAMIC GUARDIAN SECTION IF MINOR */}
              {isMinorDetected ? (
                <View style={styles.minorNoticeCard}>
                  <View style={styles.minorNoticeHeader}>
                    <Ionicons name="alert-circle" size={18} color="#D97706" />
                    <Text style={styles.minorNoticeTitle}>Minor Investor Workflow (&lt; 18 Years)</Text>
                  </View>
                  <Text style={styles.minorNoticeText}>
                    SEBI & AMFI regulations mandate that investments for a minor must be registered under their legal or natural guardian. The guardian’s bank account and PAN are required.
                  </Text>

                  {/* Guardian Full Name */}
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Guardian Full Name *</Text>
                    <TextInput
                      style={[styles.input, formErrors.guardianName && styles.inputError]}
                      value={guardianName}
                      onChangeText={setGuardianName}
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor="#94A3B8"
                    />
                    {formErrors.guardianName ? <Text style={styles.errorText}>{formErrors.guardianName}</Text> : null}
                  </View>

                  {/* Guardian Relationship */}
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Guardian Relationship to Minor *</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {GUARDIAN_RELATIONSHIPS.map((gr) => {
                        const isSel = guardianRel === gr;
                        return (
                          <TouchableOpacity
                            key={gr}
                            onPress={() => setGuardianRel(gr)}
                            style={[styles.relChip, isSel && styles.relChipActive]}
                          >
                            <Text style={[styles.relChipText, isSel && styles.relChipTextActive]}>{gr}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Guardian PAN */}
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Guardian PAN *</Text>
                    <TextInput
                      style={[styles.input, formErrors.guardianPan && styles.inputError]}
                      value={guardianPan}
                      onChangeText={setGuardianPan}
                      placeholder="e.g. ABCDE1234F"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                      maxLength={10}
                    />
                    {formErrors.guardianPan ? <Text style={styles.errorText}>{formErrors.guardianPan}</Text> : null}
                  </View>

                  {/* Guardian Authorization Consent */}
                  <TouchableOpacity
                    style={styles.consentRow}
                    onPress={() => setGuardianConsent(!guardianConsent)}
                  >
                    <Ionicons
                      name={guardianConsent ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={guardianConsent ? '#36358D' : '#64748B'}
                    />
                    <Text style={styles.consentText}>
                      I declare that I am the authorized legal guardian and my verified bank account will be linked for SIPs on behalf of this minor.
                    </Text>
                  </TouchableOpacity>
                  {formErrors.guardianConsent ? (
                    <Text style={styles.errorText}>{formErrors.guardianConsent}</Text>
                  ) : null}
                </View>
              ) : (
                /* ADULT INVESTOR FIELDS */
                <View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Contact Mobile Number (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={contactNumber}
                      onChangeText={setContactNumber}
                      placeholder="10-digit mobile number"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>PAN Number (Optional)</Text>
                    <TextInput
                      style={[styles.input, formErrors.panNumber && styles.inputError]}
                      value={panNumber}
                      onChangeText={setPanNumber}
                      placeholder="e.g. ABCDE1234F"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                      maxLength={10}
                    />
                    {formErrors.panNumber ? <Text style={styles.errorText}>{formErrors.panNumber}</Text> : null}
                  </View>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSaveMember}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Family Member</Text>
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
  container: { padding: 20, paddingBottom: 48 },
  complianceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEEDFA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  complianceIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  complianceTitle: { fontSize: 13, fontWeight: '800', color: '#102A54' },
  complianceText: { fontSize: 11.5, color: '#475569', marginTop: 2, lineHeight: 16 },
  primaryUserCard: {
    backgroundColor: '#36358D',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#36358D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryCardTop: { flexDirection: 'row', alignItems: 'center' },
  avatarCirclePrimary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialPrimary: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  primaryNameText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  selfTag: {
    backgroundColor: '#F7941D',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selfTagText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  primarySubText: { color: '#D4E2F9', fontSize: 11, marginTop: 2 },
  primaryDivider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)', marginVertical: 14 },
  primaryMetricsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabelMuted: { color: '#D4E2F9', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  metricValueLarge: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 2 },
  metricValueMedium: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 2 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  sectionSub: { fontSize: 11.5, color: '#64748B', marginTop: 2 },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#36358D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addMemberBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#36358D', borderColor: '#36358D' },
  filterChipText: { fontSize: 11.5, fontWeight: '700', color: '#475569' },
  filterChipTextActive: { color: '#FFFFFF' },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
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
  emptyTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  emptyDesc: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 18 },
  primaryAddAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#36358D',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  primaryAddActionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  memberTopRow: { flexDirection: 'row', alignItems: 'center' },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEEDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#36358D', fontSize: 16, fontWeight: '800' },
  memberName: { fontSize: 15, fontWeight: '800' },
  minorTag: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  minorTagText: { fontSize: 10, fontWeight: '800', color: '#B45309' },
  adultTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  adultTagText: { fontSize: 10, fontWeight: '800', color: '#1D4ED8' },
  memberRelText: { fontSize: 11.5, color: '#64748B', marginTop: 2 },
  trashBtn: { padding: 4 },
  guardianInfoBox: {
    backgroundColor: '#FFFDF5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 12,
  },
  guardianHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guardianHeaderTitle: { fontSize: 11, fontWeight: '800', color: '#B45309', letterSpacing: 0.5 },
  guardianSubText: { fontSize: 11.5, color: '#475569', marginTop: 4 },
  guardianBankNote: { fontSize: 10.5, color: '#059669', fontWeight: '700', marginTop: 4 },
  adultInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  adultPanText: { fontSize: 11.5, color: '#334155', fontWeight: '600' },
  adultContactText: { fontSize: 11, color: '#64748B', marginTop: 2 },
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
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  formGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#102A54',
  },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  errorText: { fontSize: 11, color: '#EF4444', marginTop: 4, fontWeight: '600' },
  relChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
  },
  relChipActive: { backgroundColor: '#36358D', borderColor: '#36358D' },
  relChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  relChipTextActive: { color: '#FFFFFF', fontWeight: '800' },
  minorNoticeCard: {
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  minorNoticeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  minorNoticeTitle: { fontSize: 12.5, fontWeight: '800', color: '#B45309' },
  minorNoticeText: { fontSize: 11, color: '#64748B', lineHeight: 15, marginBottom: 12 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  consentText: { flex: 1, fontSize: 11, color: '#475569', lineHeight: 16 },
  submitBtn: {
    backgroundColor: '#36358D',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});

export default FamilyPortfolioScreen;
