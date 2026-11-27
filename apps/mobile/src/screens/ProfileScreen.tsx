import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
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
import { useTheme } from '../context/ThemeContext';


export const ProfileScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

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
      // 1. Bank accounts from persistent storage & gateway
      const banks = await AsyncStorage.getItem('techartha_bank_accounts');
      if (banks) {
        const parsed = JSON.parse(banks);
        setBankCount(Array.isArray(parsed) ? parsed.length : 0);
      } else {
        const gwStatus = await api.get<{ bankAccount?: any }>('/buckets/account-status').catch(() => null);
        setBankCount(gwStatus?.bankAccount ? 1 : 0);
      }

      // 2. Nominees from live API with AsyncStorage fallback
      try {
        const nomRes = await api.get<{ nominees?: any[] }>('/nominees');
        if (Array.isArray(nomRes?.nominees)) {
          setNomineeCount(nomRes.nominees.length);
          await AsyncStorage.setItem('techartha_nominees', JSON.stringify(nomRes.nominees));
        }
      } catch {
        const nominees = await AsyncStorage.getItem('techartha_nominees');
        if (nominees) {
          const parsed = JSON.parse(nominees);
          setNomineeCount(Array.isArray(parsed) ? parsed.length : 0);
        } else {
          setNomineeCount(0);
        }
      }

      // 3. Mandates from live API with AsyncStorage fallback
      try {
        const manRes = await api.get<{ mandates?: any[] }>('/mandates');
        if (Array.isArray(manRes?.mandates)) {
          const activeCount = manRes.mandates.filter((m: any) => m.status === 'APPROVED' || m.status === 'ACTIVE').length;
          setMandateCount(activeCount);
          await AsyncStorage.setItem('techartha_active_mandates', JSON.stringify(manRes.mandates));
        }
      } catch {
        const mandates = await AsyncStorage.getItem('techartha_active_mandates');
        if (mandates) {
          const parsed = JSON.parse(mandates);
          if (Array.isArray(parsed)) {
            setMandateCount(parsed.filter((m: any) => m.status === 'APPROVED' || m.status === 'ACTIVE').length);
          } else {
            setMandateCount(0);
          }
        } else {
          setMandateCount(0);
        }
      }
    } catch (e) {
      console.warn('Counts fetch error:', e);
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title={t('header.viewProfile', { defaultValue: 'Profile' })} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>{t('header.viewProfile', { defaultValue: 'Profile' })}</Text>

        {/* 1. PERSONAL INFORMATION (HEADER CARD) */}

        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.profile?.fullName ?? 'U').trim().charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.textPrimary }]}>
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
          <Pressable style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('EditProfile')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#EBEAF8' }]}>
                <Ionicons name="person-circle-outline" size={22} color="#36358D" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('profile.editProfile', { defaultValue: 'Personal Details & PAN' })}</Text>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
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
          <Pressable style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('KYC')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>SEBI KYC Verification</Text>
                  <View style={styles.statusPillGreen}>
                    <Text style={styles.statusPillGreenText}>Verified</Text>
                  </View>
                </View>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Identity, PAN records & In-Person Verification (IPV)</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
            </View>
          </Pressable>

          {/* Bank Accounts */}
          <Pressable style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('BankAccounts')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#E0E7FF' }]}>
                <Ionicons name="business-outline" size={20} color="#3730A3" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('prof.bank', { defaultValue: 'Linked Bank Accounts' })}</Text>
                  {bankCount > 0 ? (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{bankCount} Linked</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                  {t('profile.primaryBank', { defaultValue: 'Primary verified bank account for SIPs & redemption payouts' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
            </View>
          </Pressable>

          {/* Nominee Details */}
          <Pressable style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('NomineeDetails')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#FAF5FF' }]}>
                <Ionicons name="people-outline" size={20} color="#6B21A8" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('prof.nominee', { defaultValue: 'Nominee Details' })}</Text>
                  {nomineeCount > 0 ? (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{nomineeCount} Declared</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                  {t('profile.nomineeDesc', { defaultValue: 'SEBI compliance: Nominees declared for portfolio succession' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
            </View>
          </Pressable>

          {/* Active Mandates */}
          <Pressable style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('ActiveMandates')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#F0FFF4' }]}>
                <Ionicons name="card-outline" size={20} color="#276749" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('prof.mandate', { defaultValue: 'Active Auto-Pay Mandates' })}</Text>
                  {mandateCount > 0 ? (
                    <View style={styles.statusPillGreen}>
                      <Text style={styles.statusPillGreenText}>{mandateCount} Active</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                  {t('profile.mandateDesc', { defaultValue: 'NPCI e-Mandate auto-pay limits & bank authorizations' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
            </View>
          </Pressable>

          {/* Family Portfolio */}
          <Pressable style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('FamilyPortfolio')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#FFF5F5' }]}>
                <Ionicons name="folder-open-outline" size={20} color="#C53030" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('profile.familyPortfolio', { defaultValue: 'Family Portfolio Sharing' })}</Text>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                  {t('profile.familyDesc', { defaultValue: 'Consolidated household wealth tracking with individual PAN ownership' })}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  pageTitle: { fontSize: 28, textTransform: 'capitalize', fontWeight: '800', color: '#102A54', marginBottom: 20 },
  container: { padding: 20, paddingBottom: 40 },

  // Profile Header Card
  profileCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#36358D', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
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
  countBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  countBadgeText: { color: '#4338CA', fontSize: 10, fontWeight: '800' },

  // Logout Button
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF5F5', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FEB2B2', marginTop: 8 },
  logoutText: { color: '#C53030', fontSize: 15, fontWeight: '800' },
});

export default ProfileScreen;
