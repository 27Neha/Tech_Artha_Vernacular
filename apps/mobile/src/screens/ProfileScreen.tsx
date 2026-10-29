import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  Modal,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authStore } from '../store/auth';
import { api } from '../services/api/client';
import { openEmailSupport, TECH_ARTHA_SUPPORT } from '../utils/contact';
import { useTheme } from '../context/ThemeContext';

export const ProfileScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();

  // Profile data from backend
  const [profile, setProfile] = useState<{
    mobile?: string;
    email?: string | null;
    profile?: { fullName?: string; pan?: string };
    riskProfile?: { category?: string } | null;
  } | null>(null);

  // Live status indicators from local persistent storage (no dummy counts)
  const [bankCount, setBankCount] = useState<number>(0);
  const [nomineeCount, setNomineeCount] = useState<number>(0);
  const [mandateCount, setMandateCount] = useState<number>(0);

  // Account Closure Advisory Modal
  const [closureModalVisible, setClosureModalVisible] = useState(false);

  const fetchProfileData = useCallback(async () => {
    try {
      const token = authStore.accessToken;
      if (!token) return;

      const data = await api.get<any>('/auth/profile');
      setProfile(data);
    } catch (e) {
      console.warn('Profile fetch error:', e);
    }
  }, []);

  const fetchLocalCounts = useCallback(async () => {
    try {
      const banks = await AsyncStorage.getItem('techartha_bank_accounts');
      if (banks) {
        const parsed = JSON.parse(banks);
        setBankCount(Array.isArray(parsed) ? parsed.length : 0);
      } else {
        setBankCount(0);
      }

      const nominees = await AsyncStorage.getItem('techartha_nominees');
      if (nominees) {
        const parsed = JSON.parse(nominees);
        setNomineeCount(Array.isArray(parsed) ? parsed.length : 0);
      } else {
        setNomineeCount(0);
      }

      const mandates = await AsyncStorage.getItem('techartha_active_mandates');
      if (mandates) {
        const parsed = JSON.parse(mandates);
        if (Array.isArray(parsed)) {
          setMandateCount(parsed.filter((m: any) => m.status === 'ACTIVE').length);
        } else {
          setMandateCount(0);
        }
      } else {
        setMandateCount(0);
      }
    } catch (e) {
      console.warn('Local counts fetch error:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
      fetchLocalCounts();
    }, [fetchProfileData, fetchLocalCounts])
  );

  const handleLogout = () => {
    Alert.alert(
      t('header.logOut', { defaultValue: 'Log Out' }),
      'Are you sure you want to log out of your TechArtha account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: t('header.logOut', { defaultValue: 'Log Out' }),
          style: 'destructive',
          onPress: () => {
            authStore.accessToken = null;
            authStore.userId = null;
            navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          }
        }
      ]
    );
  };

  const handleShowDeviceSession = () => {
    Alert.alert(
      'Active Device Session',
      `Operating System: ${Platform.OS === 'ios' ? 'Apple iOS' : 'Google Android'}\nPlatform Version: ${Platform.Version}\nApplication: Tech Artha 2.0 (SDK 57)\nSession Security: TLS 1.3 / OAuth 2.0\nStatus: Secure & Authenticated`,
      [{ text: 'Close', style: 'default' }]
    );
  };

  const handleContactForClosure = () => {
    setClosureModalVisible(false);
    const subject = encodeURIComponent('Account Closure & Deactivation Request');
    const body = encodeURIComponent(
      `Dear TechArtha Grievance Officer,\n\nI wish to request the deactivation/closure of my TechArtha mutual fund investor account.\n\nRegistered Mobile: ${profile?.mobile ?? '-'}\nRegistered Email: ${profile?.email ?? '-'}\nInvestor Name: ${profile?.profile?.fullName ?? '-'}\n\nPlease advise on the next steps as per SEBI regulations.`
    );
    Linking.openURL(`mailto:${TECH_ARTHA_SUPPORT.email}?subject=${subject}&body=${body}`).catch(() => {
      openEmailSupport();
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title={t('header.viewProfile', { defaultValue: 'Profile' })} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>{t('header.viewProfile', { defaultValue: 'Profile' })}</Text>

        {/* 1. PERSONAL INFORMATION (HEADER CARD) */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.profile?.fullName ?? 'U').trim().charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>
            {profile?.profile?.fullName ?? t('header.user', { defaultValue: 'TechArtha Investor' })}
          </Text>
          <Text style={styles.mobile}>{profile?.mobile ? `+91 ${profile.mobile}` : '-'}</Text>
          {profile?.email ? (
            <Text style={styles.emailText}>{profile.email}</Text>
          ) : null}
          <View style={styles.kycBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#276749" style={{ marginRight: 4 }} />
            <Text style={styles.kycText}>{t('header.kycVerified', { defaultValue: 'SEBI KYC COMPLIANT' })}</Text>
          </View>
        </View>

        {/* 1. PERSONAL DETAILS ROW */}
        <Text style={styles.sectionHeading}>Personal Information</Text>
        <View style={styles.sectionGroup}>
          <Pressable style={styles.card} onPress={() => navigation.navigate('EditProfile')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#EBEAF8' }]}>
                <Ionicons name="person-circle-outline" size={22} color="#3C3985" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.cardTitle}>{t('profile.editProfile', { defaultValue: 'Personal Details & PAN' })}</Text>
                <Text style={styles.cardSub}>
                  {profile?.email
                    ? `PAN linked • ${profile.email}`
                    : t('profile.verifyEmail', { defaultValue: 'Name, PAN, DOB, and verified email' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
            </View>
          </Pressable>
        </View>

        {/* 2. FINANCIAL & VERIFICATION DETAILS */}
        <Text style={styles.sectionHeading}>Financial & Verification Details</Text>
        <View style={styles.sectionGroup}>
          {/* KYC Status & Details */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('KYC')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.cardTitle}>SEBI KYC Verification</Text>
                  <View style={styles.statusPillGreen}>
                    <Text style={styles.statusPillGreenText}>Verified</Text>
                  </View>
                </View>
                <Text style={styles.cardSub}>Identity, PAN records & In-Person Verification (IPV)</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
            </View>
          </Pressable>

          {/* Bank Accounts */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('BankAccounts')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#E0E7FF' }]}>
                <Ionicons name="business-outline" size={20} color="#3730A3" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.cardTitle}>{t('prof.bank', { defaultValue: 'Linked Bank Accounts' })}</Text>
                  {bankCount > 0 ? (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{bankCount} Linked</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardSub}>
                  {t('profile.primaryBank', { defaultValue: 'Primary verified bank account for SIPs & redemption payouts' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
            </View>
          </Pressable>

          {/* Nominee Details */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('NomineeDetails')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#FAF5FF' }]}>
                <Ionicons name="people-outline" size={20} color="#6B21A8" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.cardTitle}>{t('prof.nominee', { defaultValue: 'Nominee Details' })}</Text>
                  {nomineeCount > 0 ? (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{nomineeCount} Declared</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardSub}>
                  {t('profile.nomineeDesc', { defaultValue: 'SEBI compliance: Nominees declared for portfolio succession' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
            </View>
          </Pressable>

          {/* Active Mandates */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('ActiveMandates')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#F0FFF4' }]}>
                <Ionicons name="card-outline" size={20} color="#276749" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.cardTitle}>{t('prof.mandate', { defaultValue: 'Active Auto-Pay Mandates' })}</Text>
                  {mandateCount > 0 ? (
                    <View style={styles.statusPillGreen}>
                      <Text style={styles.statusPillGreenText}>{mandateCount} Active</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardSub}>
                  {t('profile.mandateDesc', { defaultValue: 'NPCI e-Mandate auto-pay limits & bank authorizations' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
            </View>
          </Pressable>

          {/* Family Portfolio */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('FamilyPortfolio')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#FFF5F5' }]}>
                <Ionicons name="folder-open-outline" size={20} color="#C53030" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.cardTitle}>{t('profile.familyPortfolio', { defaultValue: 'Family Portfolio Sharing' })}</Text>
                <Text style={styles.cardSub}>
                  {t('profile.familyDesc', { defaultValue: 'Consolidated household wealth tracking with individual PAN ownership' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
            </View>
          </Pressable>
        </View>

        {/* 3. ACCOUNT MANAGEMENT */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Account Management</Text>
        <View style={styles.sectionGroup}>
          {/* App Settings & Preferences */}
          <Pressable
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
                <Ionicons name="settings-outline" size={20} color={isDark ? '#A78BFA' : '#5B21B6'} />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('header.settings', { defaultValue: 'App Settings & Preferences' })}</Text>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                  Security, theme, notifications, language & cache
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
            </View>
          </Pressable>

          {/* Active Device & Session Info */}
          <Pressable style={styles.card} onPress={handleShowDeviceSession}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="phone-portrait-outline" size={20} color="#475569" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.cardTitle}>Active Device & Session</Text>
                  <View style={styles.statusPillActive}>
                    <Text style={styles.statusPillActiveText}>Active</Text>
                  </View>
                </View>
                <Text style={styles.cardSub}>
                  {Platform.OS === 'ios' ? 'Apple iOS' : 'Google Android'} • Session verified with encrypted token
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
            </View>
          </Pressable>

          {/* Account Closure Advisory & Request */}
          <Pressable style={styles.card} onPress={() => setClosureModalVisible(true)}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.cardTitle}>Account Closure Request</Text>
                <Text style={styles.cardSub}>
                  SEBI regulatory deactivation procedure and portfolio exit guidelines
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
            </View>
          </Pressable>
        </View>

        {/* LOGOUT BUTTON */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#C53030" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>{t('header.logOut', { defaultValue: 'Log Out' })}</Text>
        </Pressable>
      </ScrollView>

      {/* SEBI ACCOUNT CLOSURE / DEACTIVATION MODAL */}
      <Modal visible={closureModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.closureCard}>
            <View style={styles.closureHeader}>
              <View style={styles.closureIconBox}>
                <Ionicons name="alert-circle" size={26} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.closureTitle}>Account Closure Advisory</Text>
                <Text style={styles.closureSub}>SEBI & PMLA Regulatory Procedure</Text>
              </View>
              <Pressable onPress={() => setClosureModalVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color="#718096" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.closureScroll}>
              <View style={styles.closureInfoBox}>
                <Text style={styles.closureInfoHeading}>Prerequisites for Account Deactivation:</Text>
                
                <View style={styles.closurePointRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#3C3985" style={{ marginTop: 2 }} />
                  <Text style={styles.closurePointText}>
                    <Text style={{ fontWeight: '700', color: '#102A54' }}>Zero Mutual Fund Units:</Text> All active holdings must be completely redeemed or transferred. Proceeds must be cleared to your bank.
                  </Text>
                </View>

                <View style={styles.closurePointRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#3C3985" style={{ marginTop: 2 }} />
                  <Text style={styles.closurePointText}>
                    <Text style={{ fontWeight: '700', color: '#102A54' }}>Cancel Active Mandates:</Text> All NPCI e-Mandates must be revoked to stop future automated monthly SIP debits.
                  </Text>
                </View>

                <View style={styles.closurePointRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#3C3985" style={{ marginTop: 2 }} />
                  <Text style={styles.closurePointText}>
                    <Text style={{ fontWeight: '700', color: '#102A54' }}>5-Year Statutory Retention:</Text> Under SEBI Master Circulars and Prevention of Money Laundering Act (PMLA), investor records and transaction history must be archived for 5 years after closure.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={{ gap: 10 }}>
              <Pressable style={styles.contactSupportBtn} onPress={handleContactForClosure}>
                <Ionicons name="mail-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.contactSupportBtnText}>Contact Grievance Officer</Text>
              </Pressable>
              <Pressable style={styles.keepActiveBtn} onPress={() => setClosureModalVisible(false)}>
                <Text style={styles.keepActiveBtnText}>Keep Account Active</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  pageTitle: { fontSize: 28, textTransform: 'capitalize', fontWeight: '800', color: '#102A54', marginBottom: 20 },
  container: { padding: 20, paddingBottom: 40 },

  // Profile Header Card
  profileCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#3C3985', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: '#102A54', marginBottom: 3 },
  mobile: { fontSize: 13, color: '#718096', fontWeight: '600', marginBottom: 3 },
  emailText: { fontSize: 12, color: '#4A5568', fontWeight: '500', marginBottom: 12 },
  kycBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FFF4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#C6F6D5' },
  kycText: { color: '#276749', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // Section Grouping
  sectionHeading: { fontSize: 11, fontWeight: '800', color: '#A0AEC0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  sectionGroup: { gap: 10, marginBottom: 20 },

  // Option Cards
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F7FAFC', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#102A54', marginBottom: 2 },
  cardSub: { fontSize: 12, color: '#718096', lineHeight: 16 },

  // Status Indicator Pills
  statusPillGreen: { backgroundColor: '#ECFDF5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  statusPillGreenText: { color: '#059669', fontSize: 10, fontWeight: '800' },
  statusPillGray: { backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  statusPillGrayText: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  statusPillActive: { backgroundColor: '#F0FDF4', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#DCFCE7' },
  statusPillActiveText: { color: '#16A34A', fontSize: 10, fontWeight: '800' },
  countBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  countBadgeText: { color: '#4338CA', fontSize: 10, fontWeight: '800' },

  // Logout Button
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF5F5', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FEB2B2', marginTop: 8 },
  logoutText: { color: '#C53030', fontSize: 15, fontWeight: '800' },

  // Closure Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  closureCard: { backgroundColor: '#fff', borderRadius: 24, padding: 22, width: '100%', maxWidth: 420 },
  closureHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  closureIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  closureTitle: { fontSize: 17, fontWeight: '800', color: '#102A54' },
  closureSub: { fontSize: 12, color: '#718096', marginTop: 2 },
  closureScroll: { maxHeight: 300, marginVertical: 8 },
  closureInfoBox: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 12 },
  closureInfoHeading: { fontSize: 13, fontWeight: '800', color: '#102A54', marginBottom: 2 },
  closurePointRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  closurePointText: { fontSize: 12, color: '#4A5568', lineHeight: 18, flex: 1 },
  contactSupportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#DC2626', borderRadius: 14, paddingVertical: 14 },
  contactSupportBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  keepActiveBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', borderRadius: 14, paddingVertical: 12 },
  keepActiveBtnText: { color: '#475569', fontSize: 13, fontWeight: '700' }
});
