import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { authStore } from '../store/auth';
import { api } from '../services/api/client';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const ProfileScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [nominees, setNominees] = useState<any[]>([]);
  const [mandates, setMandates] = useState<any[]>([]);
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
      
      // We assume user profile id is fetched and then we fetch cybrilla details.
      // Mocking the arrays for now since profile id is needed for the Cybrilla Sandbox API calls as per Web
      // In the real implementation, this would depend on the user's fpProfileId
    } catch (e) {
      console.error(e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [fetchProfileData])
  );

  const toggleExpand = (section: string) => {
    setExpanded(prev => prev === section ? null : section);
  };

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
          {/* Restored after the b657c9f merge: this version of the screen had no route to
              EditProfile, which left the email verification unreachable, and no way back
              into the investment funnel for anyone who deferred it. */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('EditProfile')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#EBEAF8' }]}><Text style={styles.iconText}>ID</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('profile.editProfile', { defaultValue: 'Edit profile' })}</Text>
                <Text style={styles.cardSub}>
                  {profile?.email
                    ? profile.email
                    : t('profile.verifyEmail', { defaultValue: 'Verify your email address' })}
                </Text>
              </View>
              <Text style={styles.chevron}>&gt;</Text>
            </View>
          </Pressable>

          {/* Risk assessment first when it is missing - bucket eligibility derives from it. */}
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate(profile?.riskProfile ? 'GoalSelection' : 'RiskAssessment')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#EDF7EE' }]}><Text style={styles.iconText}>+</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {profile?.riskProfile
                    ? t('profile.choosePlan', { defaultValue: 'Choose an investment plan' })
                    : t('profile.completeRisk', { defaultValue: 'Complete your risk assessment' })}
                </Text>
                <Text style={styles.cardSub}>
                  {profile?.riskProfile?.category ??
                    t('profile.riskNeeded', { defaultValue: 'Needed before we can recommend investments' })}
                </Text>
              </View>
              <Text style={styles.chevron}>&gt;</Text>
            </View>
          </Pressable>
          {/* Family Portfolio */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('FamilyPortfolio')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#FFF5F5' }]}><Text style={styles.iconText}>dY`"??</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('profile.familyPortfolio', { defaultValue: 'Family Portfolio' })}</Text>
                <Text style={styles.cardSub}>{t('profile.familyDesc', { defaultValue: 'Manage wealth together' })}</Text>
              </View>
              <Text style={styles.chevron}>&gt;</Text>
            </View>
          </Pressable>

          {/* Account Settings */}
          <Pressable style={styles.card} onPress={() => navigation.navigate('Settings')}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}><Text style={styles.iconText}>sT,?</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('profile.accountSettings', { defaultValue: 'Account Settings' })}</Text>
                <Text style={styles.cardSub}>{t('profile.settingsDesc', { defaultValue: 'Language, themes, notifications' })}</Text>
              </View>
              <Text style={styles.chevron}>&gt;</Text>
            </View>
          </Pressable>

          {/* AI / Client Assistance */}
          <Pressable style={styles.card} onPress={() => Alert.alert('Chat Support', 'Chat Support interface coming soon!')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#E6FFFA' }]}><Text style={styles.iconText}>dY -</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('profile.support', { defaultValue: 'AI / Client Assistance' })}</Text>
                <Text style={styles.cardSub}>{t('profile.supportDesc', { defaultValue: 'Get help with your portfolio' })}</Text>
              </View>
              <Text style={styles.chevron}>&gt;</Text>
            </View>
          </Pressable>

          {/* Contact */}
          <Pressable style={styles.card} onPress={() => Alert.alert('Contact module structure exists. Awaiting verified contact details from project owners.')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#F0FFF4' }]}><Text style={styles.iconText}>dY"z</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('profile.contact', { defaultValue: 'Contact Us' })}</Text>
                <Text style={styles.cardSub}>{t('profile.contactDesc', { defaultValue: 'Get in touch with support' })}</Text>
              </View>
              <Text style={styles.chevron}>&gt;</Text>
            </View>
          </Pressable>

          {/* Terms */}
          <Pressable style={styles.card} onPress={() => Alert.alert('Terms & Conditions structure exists. Awaiting approved legal text.')}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}><Text style={styles.iconText}>dY",</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('profile.terms', { defaultValue: 'Terms & Conditions' })}</Text>
                <Text style={styles.cardSub}>{t('profile.termsDesc', { defaultValue: 'Legal agreements and policies' })}</Text>
              </View>
              <Text style={styles.chevron}>&gt;</Text>
            </View>
          </Pressable>
        </View>

        {/* EXPANDABLE SECTIONS */}
        <View style={{ gap: 12, marginBottom: 24 }}>
          {/* Bank Accounts */}
          <View style={[styles.card, expanded === 'Bank Accounts' && styles.cardActive]}>
            <Pressable style={styles.cardHeader} onPress={() => toggleExpand('Bank Accounts')}>
              <View style={[styles.iconBox, { backgroundColor: '#E0E7FF' }]}><Text style={styles.iconText}>dY?</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('prof.bank', { defaultValue: 'Bank Accounts' })}</Text>
                <Text style={styles.cardSub}>{t('profile.primaryBank', { defaultValue: 'Manage linked bank accounts' })}</Text>
              </View>
              <Text style={[styles.chevron, expanded === 'Bank Accounts' && { transform: [{ rotate: '90deg' }] }]}>&gt;</Text>
            </Pressable>
            {expanded === 'Bank Accounts' && (
              <View style={styles.expandedContent}>
                {bankAccounts.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                    <Text style={{ color: '#A0AEC0', fontSize: 12, fontWeight: '700', marginBottom: 12 }}>{t('prof.noBank', { defaultValue: 'No bank accounts linked.' })}</Text>
                    <Pressable style={styles.smBtnOutlined} onPress={() => Alert.alert('Coming Soon', 'Bank integration coming soon!')}>
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
              <View style={[styles.iconBox, { backgroundColor: '#FAF5FF' }]}><Text style={styles.iconText}>dY`"</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('prof.nominee', { defaultValue: 'Nominees' })}</Text>
                <Text style={styles.cardSub}>{t('profile.nomineeDesc', { defaultValue: 'Manage your portfolio nominees' })}</Text>
              </View>
              <Text style={[styles.chevron, expanded === 'Nominees' && { transform: [{ rotate: '90deg' }] }]}>&gt;</Text>
            </Pressable>
            {expanded === 'Nominees' && (
              <View style={styles.expandedContent}>
                {nominees.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                    <Text style={{ color: '#A0AEC0', fontSize: 12, fontWeight: '700', marginBottom: 12 }}>{t('prof.noNominee', { defaultValue: 'No nominees added yet.' })}</Text>
                    <Pressable style={styles.smBtnOutlined} onPress={() => Alert.alert('Coming Soon', 'Nominee integration coming soon!')}>
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
              <View style={[styles.iconBox, { backgroundColor: '#F0FFF4' }]}><Text style={styles.iconText}>dY"</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('prof.mandate', { defaultValue: 'Active Mandates' })}</Text>
                <Text style={styles.cardSub}>{t('profile.mandateDesc', { defaultValue: 'Manage your auto-pay mandates' })}</Text>
              </View>
              <Text style={[styles.chevron, expanded === 'Mandates' && { transform: [{ rotate: '90deg' }] }]}>&gt;</Text>
            </Pressable>
            {expanded === 'Mandates' && (
              <View style={styles.expandedContent}>
                {mandates.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                    <Text style={{ color: '#A0AEC0', fontSize: 12, fontWeight: '700', marginBottom: 12 }}>{t('prof.noMandates', { defaultValue: 'No active mandates.' })}</Text>
                    <Pressable style={styles.smBtnOutlined} onPress={() => Alert.alert('Coming Soon', 'Mandate creation coming soon!')}>
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
