import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { authStore } from '../store/auth';
import { api, API_URL } from '../services/api/client';

export const ProfileScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();

  // Real account data, replacing the placeholder avatar initial and +91 XXXXX XXXXX.
  const [profile, setProfile] = useState<{
    mobile?: string;
    email?: string | null;
    profile?: { fullName?: string };
    riskProfile?: { category?: string } | null;
  } | null>(null);

  const fetchProfileData = useCallback(async () => {
    try {
      const token = authStore.accessToken;
      if (!token) return;

      setProfile(await api.get('/auth/profile'));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [fetchProfileData])
  );

  const handleLogout = () => {
    authStore.accessToken = null;
    authStore.userId = null;
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>{t('header.viewProfile', { defaultValue: 'Profile' })}</Text>
        
        {/* Avatar Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.profile?.fullName ?? 'U').trim().charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>
            {profile?.profile?.fullName ?? t('header.user', { defaultValue: 'User' })}
          </Text>
          <Text style={styles.mobile}>{profile?.mobile ?? '-'}</Text>
          <View style={styles.kycBadge}><Text style={styles.kycText}>{t('header.kycVerified', { defaultValue: 'KYC VERIFIED' })}</Text></View>
        </View>

        {/* MENU */}
        <View style={{ gap: 12, marginBottom: 24 }}>
          {/* Edit Profile */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('EditProfile')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#EEEDFA' }]}>
                <Ionicons name="person-circle-outline" size={22} color="#36358D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('profile.editProfile', { defaultValue: 'Personal Information' })}</Text>
                <Text style={styles.cardSub}>
                  {profile?.email
                    ? profile.email
                    : t('profile.verifyEmail', { defaultValue: 'PAN, DOB, and email verification' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </Pressable>

          {/* Bank Accounts Dedicated Screen */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('BankAccounts')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#EEEDFA' }]}>
                <Ionicons name="business-outline" size={20} color="#36358D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('prof.bank', { defaultValue: 'Bank Accounts' })}</Text>
                <Text style={styles.cardSub}>{t('profile.primaryBank', { defaultValue: 'Manage linked bank accounts for SIP & payouts' })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </Pressable>

          {/* Nominee Details Dedicated Screen */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('NomineeDetails')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#FAF5FF' }]}>
                <Ionicons name="people-outline" size={20} color="#6B21A8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('prof.nominee', { defaultValue: 'Nominee Details' })}</Text>
                <Text style={styles.cardSub}>{t('profile.nomineeDesc', { defaultValue: 'SEBI compliance: Add up to 3 legal nominees' })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </Pressable>

          {/* Family Portfolio */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('FamilyPortfolio')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="folder-open-outline" size={20} color="#F7941D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('profile.familyPortfolio', { defaultValue: 'Family Portfolio' })}</Text>
                <Text style={styles.cardSub}>{t('profile.familyDesc', { defaultValue: 'Manage wealth together with family members' })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </Pressable>

          {/* Active Mandates Dedicated Screen */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('ActiveMandates')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="card-outline" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('prof.mandate', { defaultValue: 'Active Mandates' })}</Text>
                <Text style={styles.cardSub}>{t('profile.mandateDesc', { defaultValue: 'Manage e-Mandate auto-pay limits & NPCI authorizations' })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </Pressable>
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('header.logOut', { defaultValue: 'Log Out' })}</Text>
        </Pressable>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7FC' },
  pageTitle: { fontSize: 26, fontWeight: '900', color: '#102A54', marginBottom: 20, letterSpacing: -0.3 },
  container: { padding: 20, paddingBottom: 40 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#36358D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: '#EEEDFA',
  },
  avatarText: { color: '#FFFFFF', fontSize: 32, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: '#102A54', marginBottom: 4 },
  mobile: { fontSize: 13, color: '#64748B', marginBottom: 14, fontWeight: '600' },
  kycBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  kycText: { color: '#059669', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardActive: { borderColor: '#36358D' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EEEDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 20 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#102A54', marginBottom: 2 },
  cardSub: { fontSize: 11.5, color: '#64748B' },
  chevron: { fontSize: 20, color: '#94A3B8', fontWeight: '300' },
  expandedContent: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },

  innerBox: { borderWidth: 1, borderColor: '#E6E8F6', borderRadius: 14, padding: 16, backgroundColor: '#F8FAFC' },
  smBtn: { backgroundColor: '#36358D', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  smBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  smBtnOutlined: {
    backgroundColor: '#EEEDFA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#36358D',
    borderStyle: 'dashed',
  },
  smBtnOutlinedText: { color: '#36358D', fontSize: 12, fontWeight: '800' },
  outlineBtn: { borderWidth: 1.5, borderColor: '#36358D', paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  outlineBtnText: { color: '#36358D', fontSize: 13, fontWeight: '800' },

  logoutBtn: {
    backgroundColor: '#FEF2F2',
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 8,
  },
  logoutText: { color: '#DC2626', fontSize: 14, fontWeight: '800' },
});
