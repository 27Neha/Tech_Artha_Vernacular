import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { authStore } from '../store/auth';
import { api } from '../services/api/client';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

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
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title={t('header.viewProfile', { defaultValue: 'Profile' })} />
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
              <View style={[styles.iconBox, { backgroundColor: '#EBEAF8' }]}>
                <Ionicons name="person-circle-outline" size={22} color="#3C3985" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('profile.editProfile', { defaultValue: 'Personal Information' })}</Text>
                <Text style={styles.cardSub}>
                  {profile?.email
                    ? profile.email
                    : t('profile.verifyEmail', { defaultValue: 'PAN, DOB, and email verification' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
            </View>
          </Pressable>

          {/* Bank Accounts Dedicated Screen */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('BankAccounts')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#E0E7FF' }]}>
                <Ionicons name="business-outline" size={20} color="#3730A3" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('prof.bank', { defaultValue: 'Bank Accounts' })}</Text>
                <Text style={styles.cardSub}>{t('profile.primaryBank', { defaultValue: 'Manage linked bank accounts for SIP & payouts' })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
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
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
            </View>
          </Pressable>

          {/* Family Portfolio */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('FamilyPortfolio')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#FFF5F5' }]}>
                <Ionicons name="folder-open-outline" size={20} color="#C53030" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('profile.familyPortfolio', { defaultValue: 'Family Portfolio' })}</Text>
                <Text style={styles.cardSub}>{t('profile.familyDesc', { defaultValue: 'Manage wealth together with family members' })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
            </View>
          </Pressable>

          {/* Active Mandates Dedicated Screen */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('ActiveMandates')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#F0FFF4' }]}>
                <Ionicons name="card-outline" size={20} color="#276749" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('prof.mandate', { defaultValue: 'Active Mandates' })}</Text>
                <Text style={styles.cardSub}>{t('profile.mandateDesc', { defaultValue: 'Manage e-Mandate auto-pay limits & NPCI authorizations' })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
            </View>
          </Pressable>
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('header.logOut', { defaultValue: 'Log Out' })}</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  pageTitle: { fontSize: 28, textTransform: 'capitalize', fontWeight: '800', color: '#102A54', marginBottom: 24 },
  container: { padding: 24, paddingBottom: 40 },
  profileCard: { backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', marginBottom: 32, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3C3985', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', color: '#102A54', marginBottom: 4 },
  mobile: { fontSize: 14, color: '#718096', marginBottom: 16, fontWeight: '600' },
  kycBadge: { backgroundColor: '#F0FFF4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#C6F6D5' },
  kycText: { color: '#276749', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  cardActive: { borderColor: '#3C3985' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F7FAFC', alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#102A54', marginBottom: 2 },
  cardSub: { fontSize: 12, color: '#A0AEC0' },
  chevron: { fontSize: 20, color: '#CBD5E0', fontWeight: '300' },
  expandedContent: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F7FAFC' },
  
  innerBox: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, backgroundColor: '#F7FAFC' },
  smBtn: { backgroundColor: '#3C3985', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  smBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  smBtnOutlined: { backgroundColor: '#EBEBFA', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#3C3985', borderStyle: 'dashed' },
  smBtnOutlinedText: { color: '#3C3985', fontSize: 12, fontWeight: '800' },
  outlineBtn: { borderWidth: 2, borderColor: '#3C3985', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  outlineBtnText: { color: '#3C3985', fontSize: 12, fontWeight: '800' },

  logoutBtn: { backgroundColor: '#FFF5F5', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FEB2B2', marginTop: 8 },
  logoutText: { color: '#C53030', fontSize: 16, fontWeight: '800' }
});
