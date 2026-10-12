import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { authStore } from '../store/auth';
import { api } from '../services/api/client';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type Profile = {
  id: string;
  mobile: string;
  clientType?: string | null;
  profile?: { fullName?: string | null; pan?: string | null; dateOfBirth?: string | null } | null;
  riskProfile?: { category?: string | null; score?: number | null } | null;
  onboardingProgress?: { lastCompletedStep?: string | null } | null;
};

const maskPan = (pan?: string | null) => (pan ? `${pan.slice(0, 3)}${'X'.repeat(5)}${pan.slice(-2)}` : '—');

export const ProfileScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [nominees, setNominees] = useState<any[]>([]);
  const [mandates, setMandates] = useState<any[]>([]);

  const fetchProfileData = useCallback(async () => {
    try {
      const data = await api.get<Profile>('/auth/profile').catch(async () => {
        const token = authStore.accessToken;
        if (!token) return null;
        const res = await fetch(`${API_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return res.ok ? await res.json() : null;
      });
      if (data) setProfile(data);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [fetchProfileData])
  );

  const toggleExpand = (section: string) => {
    setExpanded((prev) => (prev === section ? null : section));
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          authStore.accessToken = null;
          authStore.userId = null;
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        },
      },
    ]);
  };

  const fullName = profile?.profile?.fullName || t('header.user', { defaultValue: 'User' });
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title={t('header.viewProfile', { defaultValue: 'Profile' })} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>{t('header.viewProfile', { defaultValue: 'Profile' })}</Text>
        
        {/* Avatar Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.mobile}>{profile?.mobile ? `+91 ${profile.mobile}` : '+91 XXXXX XXXXX'}</Text>
          <View style={styles.kycBadge}>
            <Text style={styles.kycText}>{profile?.profile?.pan ? 'KYC VERIFIED' : 'KYC PENDING'}</Text>
          </View>

          {profile?.profile?.pan ? (
            <View style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#718096' }}>PAN: {maskPan(profile.profile.pan)}</Text>
              {profile?.profile?.dateOfBirth && (
                <Text style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
                  DOB: {profile.profile.dateOfBirth.slice(0, 10)}
                </Text>
              )}
            </View>
          ) : null}
        </View>

        {/* MENU */}
        <View style={{ gap: 12, marginBottom: 24 }}>
          {/* Family Portfolio */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('FamilyPortfolio')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#FFF5F5' }]}>
                <Text style={styles.iconText}>👨‍👩‍👧</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('profile.familyPortfolio', { defaultValue: 'Family Portfolio' })}</Text>
                <Text style={styles.cardSub}>{t('profile.familyDesc', { defaultValue: 'Manage wealth together' })}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>

          {/* Account Settings */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('Settings')}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}>
                <Text style={styles.iconText}>⚙️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('profile.accountSettings', { defaultValue: 'Account Settings' })}</Text>
                <Text style={styles.cardSub}>{t('profile.settingsDesc', { defaultValue: 'Language, themes, notifications' })}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>

          {/* AI / Client Assistance */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('Assistant')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#E6FFFA' }]}>
                <Text style={styles.iconText}>🤖</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('profile.support', { defaultValue: 'AI / Client Assistance' })}</Text>
                <Text style={styles.cardSub}>{t('profile.supportDesc', { defaultValue: 'Get help with your portfolio' })}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>

          {/* Contact */}
          <Pressable
            style={styles.card}
            onPress={() => Alert.alert('Contact Support', 'Email: support@techartha.com\nPhone: 1800-123-4567')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#F0FFF4' }]}>
                <Text style={styles.iconText}>📞</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('profile.contact', { defaultValue: 'Contact Us' })}</Text>
                <Text style={styles.cardSub}>{t('profile.contactDesc', { defaultValue: 'Get in touch with support' })}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>

          {/* Terms */}
          <Pressable
            style={styles.card}
            onPress={() => Alert.alert('Terms & Conditions', 'Mutual fund investments are subject to market risks. Read all scheme related documents carefully.')}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}>
                <Text style={styles.iconText}>📄</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('profile.terms', { defaultValue: 'Terms & Conditions' })}</Text>
                <Text style={styles.cardSub}>{t('profile.termsDesc', { defaultValue: 'Legal agreements and policies' })}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>
        </View>

        {/* EXPANDABLE SECTIONS */}
        <View style={{ gap: 12, marginBottom: 24 }}>
          {/* Bank Accounts */}
          <View style={[styles.card, expanded === 'Bank Accounts' && styles.cardActive]}>
            <Pressable style={styles.cardHeader} onPress={() => toggleExpand('Bank Accounts')}>
              <View style={[styles.iconBox, { backgroundColor: '#E0E7FF' }]}>
                <Text style={styles.iconText}>🏦</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('prof.bank', { defaultValue: 'Bank Accounts' })}</Text>
                <Text style={styles.cardSub}>{t('profile.primaryBank', { defaultValue: 'Manage linked bank accounts' })}</Text>
              </View>
              <Text style={[styles.chevron, expanded === 'Bank Accounts' && { transform: [{ rotate: '90deg' }] }]}>›</Text>
            </Pressable>
            {expanded === 'Bank Accounts' && (
              <View style={styles.expandedContent}>
                {bankAccounts.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                    <Text style={{ color: '#A0AEC0', fontSize: 12, fontWeight: '700', marginBottom: 12 }}>
                      {t('prof.noBank', { defaultValue: 'No bank accounts linked.' })}
                    </Text>
                    <Pressable style={styles.smBtnOutlined} onPress={() => Alert.alert('Bank Account', 'Primary bank account details can be updated via KYC verification.')}>
                      <Text style={styles.smBtnOutlinedText}>{t('prof.addBank', { defaultValue: '+ Add Bank Account' })}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* Nominees */}
          <View style={[styles.card, expanded === 'Nominees' && styles.cardActive]}>
            <Pressable style={styles.cardHeader} onPress={() => toggleExpand('Nominees')}>
              <View style={[styles.iconBox, { backgroundColor: '#FAF5FF' }]}>
                <Text style={styles.iconText}>👥</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('prof.nominee', { defaultValue: 'Nominees' })}</Text>
                <Text style={styles.cardSub}>{t('profile.nomineeDesc', { defaultValue: 'Manage your portfolio nominees' })}</Text>
              </View>
              <Text style={[styles.chevron, expanded === 'Nominees' && { transform: [{ rotate: '90deg' }] }]}>›</Text>
            </Pressable>
            {expanded === 'Nominees' && (
              <View style={styles.expandedContent}>
                {nominees.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                    <Text style={{ color: '#A0AEC0', fontSize: 12, fontWeight: '700', marginBottom: 12 }}>
                      {t('prof.noNominee', { defaultValue: 'No nominees added yet.' })}
                    </Text>
                    <Pressable style={styles.smBtnOutlined} onPress={() => Alert.alert('Nominee', 'Nominee registration form coming soon.')}>
                      <Text style={styles.smBtnOutlinedText}>{t('prof.addNominee', { defaultValue: '+ Add Nominee' })}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* Mandates */}
          <View style={[styles.card, expanded === 'Mandates' && styles.cardActive]}>
            <Pressable style={styles.cardHeader} onPress={() => toggleExpand('Mandates')}>
              <View style={[styles.iconBox, { backgroundColor: '#F0FFF4' }]}>
                <Text style={styles.iconText}>💳</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('prof.mandate', { defaultValue: 'Active Mandates' })}</Text>
                <Text style={styles.cardSub}>{t('profile.mandateDesc', { defaultValue: 'Manage your auto-pay mandates' })}</Text>
              </View>
              <Text style={[styles.chevron, expanded === 'Mandates' && { transform: [{ rotate: '90deg' }] }]}>›</Text>
            </Pressable>
            {expanded === 'Mandates' && (
              <View style={styles.expandedContent}>
                {mandates.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                    <Text style={{ color: '#A0AEC0', fontSize: 12, fontWeight: '700', marginBottom: 12 }}>
                      {t('prof.noMandates', { defaultValue: 'No active mandates.' })}
                    </Text>
                    <Pressable style={styles.smBtnOutlined} onPress={() => Alert.alert('Mandate', 'Mandates are created automatically with SIP orders.')}>
                      <Text style={styles.smBtnOutlinedText}>{t('prof.createMandate', { defaultValue: '+ Create Mandate' })}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )}
          </View>
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
  profileCard: { backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
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
  chevron: { fontSize: 20, color: '#CBD5E0', fontWeight: 'bold' },
  expandedContent: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F7FAFC' },
  smBtnOutlined: { backgroundColor: '#EBEBFA', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#3C3985', borderStyle: 'dashed' },
  smBtnOutlinedText: { color: '#3C3985', fontSize: 12, fontWeight: '800' },
  logoutBtn: { backgroundColor: '#FFF5F5', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FEB2B2', marginTop: 8 },
  logoutText: { color: '#C53030', fontSize: 16, fontWeight: '800' }
});

export default ProfileScreen;
