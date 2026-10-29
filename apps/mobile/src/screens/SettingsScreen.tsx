import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  PermissionsAndroid
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { api, API_URL } from '../services/api/client';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { TermsModal } from '../components/TermsModal';
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal';
import { RiskDisclosuresModal } from '../components/RiskDisclosuresModal';

export const SettingsScreen = () => {
  const { t, i18n } = useTranslation('common');
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  const { colors, isDark, preference } = useTheme();

  // Connection & Profile Status
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [profileName, setProfileName] = useState<string>('Investor Account');
  const [profileContact, setProfileContact] = useState<string>('');
  const [isPanLinked, setIsPanLinked] = useState<boolean>(false);

  // Settings Quick Indicators
  const [pinActive, setPinActive] = useState<boolean>(false);
  const [allowedPermsCount, setAllowedPermsCount] = useState<number>(0);

  // Legal Modals
  const [termsVisible, setTermsVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [disclosuresVisible, setDisclosuresVisible] = useState(false);

  // Check backend connectivity
  const checkApiHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/`, { method: 'GET' });
      setApiStatus(res.ok ? 'online' : 'offline');
    } catch {
      setApiStatus('offline');
    }
  };

  // Load user profile & quick statuses
  const loadScreenData = useCallback(async () => {
    try {
      // 1. PIN Lock status
      const hasPin = await AsyncStorage.getItem('techartha_pin_enabled');
      setPinActive(hasPin === 'true');

      // 2. Profile details
      const profile = await api.get<any>('/auth/profile').catch(() => null);
      if (profile) {
        if (profile?.profile?.fullName) {
          setProfileName(profile.profile.fullName);
        } else if (profile?.email) {
          setProfileName(profile.email.split('@')[0]);
        }
        setProfileContact(profile?.mobile ? `+91 ${profile.mobile}` : (profile?.email || ''));
        setIsPanLinked(Boolean(profile?.profile?.pan));
      }

      // 3. Quick Permissions count (Android check)
      if (Platform.OS === 'android') {
        let granted = 0;
        const permsToCheck = [
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CAMERA,
          (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        ];
        for (const p of permsToCheck) {
          if (p) {
            const has = await PermissionsAndroid.check(p).catch(() => false);
            if (has) granted++;
          }
        }
        setAllowedPermsCount(granted);
      } else {
        setAllowedPermsCount(0);
      }
    } catch (e) {
      console.warn('Status load error:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkApiHealth();
      loadScreenData();
    }, [loadScreenData])
  );

  const handleLogout = () => {
    Alert.alert(
      t('header.logOut', { defaultValue: 'Sign Out' }),
      t('settings.logoutConfirm', { defaultValue: 'Are you sure you want to sign out of TechArtha?' }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('header.logOut', { defaultValue: 'Sign Out' }),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (e) {
              console.warn('Sign out error handled:', e);
            }
            navigation.reset({
              index: 0,
              routes: [{ name: 'Welcome' }]
            });
          }
        }
      ]
    );
  };

  const getLanguageDisplayName = (code: string) => {
    switch (code) {
      case 'hi': return 'हिन्दी (Hindi)';
      case 'mr': return 'मराठी (Marathi)';
      case 'gu': return 'ગુજરાતી (Gujarati)';
      case 'bn': return 'বাংলা (Bengali)';
      case 'ta': return 'தமிழ் (Tamil)';
      case 'te': return 'తెలుగు (Telugu)';
      case 'kn': return 'ಕನ್ನಡ (Kannada)';
      case 'ml': return 'മലയാളം (Malayalam)';
      case 'pa': return 'ਪੰਜਾਬੀ (Punjabi)';
      case 'as': return 'অসমীয়া (Assamese)';
      case 'or': return 'ଓଡ଼ିଆ (Odia)';
      default: return 'English';
    }
  };

  const getThemeDisplayName = () => {
    if (preference === 'dark') return 'Dark Theme';
    if (preference === 'light') return 'Light Theme';
    return 'System Default';
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title={t('settings.title', { defaultValue: 'Settings' })} onBack={() => navigation.goBack()} showSettings={false} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top Header & Connection Health */}
        <View style={styles.topHeader}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>{t('settings.title', { defaultValue: 'Settings' })}</Text>
          <View style={[styles.liveApiBadge, { backgroundColor: isDark ? colors.surfaceMuted : '#EDF2F7' }]}>
            <View style={[styles.statusDot, apiStatus === 'online' ? styles.dotGreen : styles.dotAmber]} />
            <Text style={[styles.liveApiText, { color: colors.textSecondary }]}>{apiStatus === 'online' ? 'Connected' : 'Offline'}</Text>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 1. ACCOUNT & SECURITY                                         */}
        {/* ============================================================== */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>{t('settings.accountSecurity', { defaultValue: 'Account & Security' })}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Personal & Account Details */}
          <Pressable
            style={[styles.cardRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#1E1B4B' : '#E0E7FF' }]}>
              <Ionicons name="person-outline" size={20} color={isDark ? '#818CF8' : '#3730A3'} />
            </View>
            <View style={styles.textCol}>
              <View style={styles.rowTitleWrap}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('profile.title', { defaultValue: 'Personal & Account Details' })}</Text>
                {isPanLinked && (
                  <View style={[styles.badgePillGreen, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                    <Text style={[styles.badgePillGreenText, { color: isDark ? '#34D399' : '#059669' }]}>KYC Linked</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {profileName} {profileContact ? `• ${profileContact}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Change Password / PIN */}
          <Pressable
            style={[styles.cardRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('SecuritySettings')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
              <Ionicons name="key-outline" size={20} color={isDark ? '#A78BFA' : '#5B21B6'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('settings.changePasswordPin', { defaultValue: 'Change Password & PIN' })}</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Update login password or device authentication PIN</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* App Lock */}
          <Pressable
            style={[styles.cardRow, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('SecuritySettings')}
          >
            <View style={[styles.iconBox, { backgroundColor: pinActive ? (isDark ? '#052E16' : '#DCFCE7') : (isDark ? '#451A03' : '#FEF3C7') }]}>
              <Ionicons
                name={pinActive ? 'shield-checkmark' : 'lock-open-outline'}
                size={20}
                color={pinActive ? (isDark ? '#4ADE80' : '#15803D') : (isDark ? '#FBBF24' : '#B45309')}
              />
            </View>
            <View style={styles.textCol}>
              <View style={styles.rowTitleWrap}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('settings.appLock', { defaultValue: 'App Lock' })}</Text>
                <View style={pinActive ? (isDark ? styles.badgePillGreenDark : styles.badgePillGreen) : (isDark ? styles.badgePillAmberDark : styles.badgePillAmber)}>
                  <Text style={pinActive ? (isDark ? styles.badgePillGreenDarkText : styles.badgePillGreenText) : (isDark ? styles.badgePillAmberDarkText : styles.badgePillAmberText)}>
                    {pinActive ? 'Active' : 'Disabled'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                {pinActive
                  ? '4-digit PIN required on app launch & resume'
                  : 'Enable 4-digit PIN protection for opening app'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* 2. PREFERENCES                                                 */}
        {/* ============================================================== */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>{t('settings.preferences', { defaultValue: 'Preferences' })}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Language Selection */}
          <Pressable
            style={[styles.cardRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('LanguageSettings')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#451A03' : '#FEF3C7' }]}>
              <Ionicons name="language-outline" size={20} color={isDark ? '#FBBF24' : '#B45309'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('settings.language', { defaultValue: 'Language Selection' })}</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{getLanguageDisplayName(i18n.language || 'en')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* App Theme (Light / Dark / System) */}
          <Pressable
            style={[styles.cardRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('ThemeSettings')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#500724' : '#FCE7F3' }]}>
              <Ionicons name="color-palette-outline" size={20} color={isDark ? '#F472B6' : '#BE185D'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('settings.theme', { defaultValue: 'Appearance & Theme' })}</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{getThemeDisplayName()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Notification Preferences */}
          <Pressable
            style={[styles.cardRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('NotificationPreferences')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#082F49' : '#E0F2FE' }]}>
              <Ionicons name="notifications-outline" size={20} color={isDark ? '#38BDF8' : '#0369A1'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('settings.notifications', { defaultValue: 'Notification Preferences' })}</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>SIP debits, order execution, WhatsApp & email</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Storage & Device Cache */}
          <Pressable
            style={[styles.cardRow, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('StorageCache')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
              <Ionicons name="server-outline" size={20} color={isDark ? '#A78BFA' : '#5B21B6'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('settings.storageCache', { defaultValue: 'Storage & Cache' })}</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Temporary files, factsheet cache & disk footprint</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* 3. PERMISSIONS                                                */}
        {/* ============================================================== */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>{t('settings.permissions', { defaultValue: 'Permissions' })}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={[styles.cardRow, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('Permissions')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#052E16' : '#F0FDF4' }]}>
              <Ionicons name="shield-outline" size={20} color={isDark ? '#4ADE80' : '#16A34A'} />
            </View>
            <View style={styles.textCol}>
              <View style={styles.rowTitleWrap}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('settings.permissionsCenter', { defaultValue: 'App Permissions Center' })}</Text>
                <View style={[styles.badgePillBlue, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' }]}>
                  <Text style={[styles.badgePillBlueText, { color: isDark ? '#A5B4FC' : '#4338CA' }]}>{allowedPermsCount} Active</Text>
                </View>
              </View>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                Microphone, Camera, Photos/Files, Push Alerts, KYC Location
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* 4. HELP & SUPPORT                                             */}
        {/* ============================================================== */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>{t('settings.helpSupport', { defaultValue: 'Help & Support' })}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Client Assistant */}
          <Pressable
            style={[styles.cardRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Assistant' })}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
              <Ionicons name="sparkles-outline" size={20} color={isDark ? '#A78BFA' : '#5B21B6'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('profile.support', { defaultValue: 'Client Assistant' })}</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>24/7 AI-driven voice & chat advisory in 12 languages</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* FAQs */}
          <Pressable
            style={[styles.cardRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('Faqs')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#082F49' : '#E0F2FE' }]}>
              <Ionicons name="help-circle-outline" size={20} color={isDark ? '#38BDF8' : '#0369A1'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('settings.faqs', { defaultValue: 'Frequently Asked Questions (FAQs)' })}</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>SEBI regulations, NAV cutoff times, SIP rules & taxes</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Contact Support */}
          <Pressable
            style={[styles.cardRow, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('HelpSupport')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#052E16' : '#DCFCE7' }]}>
              <Ionicons name="headset-outline" size={20} color={isDark ? '#4ADE80' : '#15803D'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('settings.contactSupport', { defaultValue: 'Contact Support & Helpdesk' })}</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Direct WhatsApp, Grievance email desk & Ticket logging</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* 5. LEGAL & ABOUT                                              */}
        {/* ============================================================== */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>{t('settings.legalAbout', { defaultValue: 'Legal & About' })}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Privacy Policy */}
          <Pressable
            style={[styles.cardRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => setPrivacyVisible(true)}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#082F49' : '#E0F2FE' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={isDark ? '#38BDF8' : '#0369A1'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('signup.privacyPolicy', { defaultValue: 'Privacy Policy' })}</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>AES-256 data protection & KYC privacy covenants</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Terms and Conditions */}
          <Pressable
            style={[styles.cardRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => setTermsVisible(true)}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
              <Ionicons name="document-text-outline" size={20} color={isDark ? '#A78BFA' : '#5B21B6'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('signup.termsOfService', { defaultValue: 'Terms and Conditions' })}</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Execution agreement, e-mandates & user covenants</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Risk Disclosures */}
          <Pressable
            style={[styles.cardRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => setDisclosuresVisible(true)}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#451A03' : '#FEF3C7' }]}>
              <Ionicons name="alert-circle-outline" size={20} color={isDark ? '#FBBF24' : '#B45309'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('settings.riskDisclosures', { defaultValue: 'Statutory Risk Disclosures' })}</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>SEBI market risks, Risk-o-Meter & NAV timelines</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Legal Compliance Center */}
          <Pressable
            style={[styles.cardRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('LegalSettings')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <Ionicons name="ribbon-outline" size={20} color={isDark ? '#34D399' : '#059669'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Platform Compliance Center</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>AMFI registration, investor grievance redressal & SCORES</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* App Version Info Tile */}
          <View style={[styles.cardRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? colors.surfaceMuted : '#F1F5F9' }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>TechArtha Version</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>2.0.0 (Build 57.0.26) • Production SDK 57</Text>
            </View>
            <View style={[styles.badgePillGray, { backgroundColor: isDark ? colors.surfaceMuted : '#F1F5F9' }]}>
              <Text style={[styles.badgePillGrayText, { color: colors.textMuted }]}>Latest</Text>
            </View>
          </View>
        </View>

        {/* ============================================================== */}
        {/* LOGOUT & REGULATORY FOOTER                                    */}
        {/* ============================================================== */}
        <View style={styles.footerSection}>
          <Text style={[styles.sebiDisclosureText, { color: colors.textMuted }]}>
            AMFI Registered Mutual Fund Distributor • ARN-284912{'\n'}
            Mutual fund investments are subject to market risks.
          </Text>

          <Pressable style={[styles.logoutBtn, { backgroundColor: isDark ? '#450A0A' : '#FEF2F2', borderColor: isDark ? '#991B1B' : '#FECACA' }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={19} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>{t('header.logOut', { defaultValue: 'Sign Out of TechArtha' })}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* MODALS */}
      <TermsModal visible={termsVisible} onClose={() => setTermsVisible(false)} />
      <PrivacyPolicyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />
      <RiskDisclosuresModal visible={disclosuresVisible} onClose={() => setDisclosuresVisible(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle: { fontSize: 28, fontWeight: '800' },
  liveApiBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: '#10B981' },
  dotAmber: { backgroundColor: '#F59E0B' },
  liveApiText: { fontSize: 11, fontWeight: '700' },

  sectionHeading: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 16, paddingHorizontal: 16, marginBottom: 18, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1 },

  cardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  textCol: { flex: 1, paddingRight: 8 },
  rowTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  cardSub: { fontSize: 12 },

  badgePillGreen: { backgroundColor: '#ECFDF5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgePillGreenText: { color: '#059669', fontSize: 10, fontWeight: '800' },
  badgePillGreenDark: { backgroundColor: '#064E3B', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgePillGreenDarkText: { color: '#34D399', fontSize: 10, fontWeight: '800' },

  badgePillAmber: { backgroundColor: '#FFFBEB', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgePillAmberText: { color: '#D97706', fontSize: 10, fontWeight: '800' },
  badgePillAmberDark: { backgroundColor: '#451A03', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgePillAmberDarkText: { color: '#FBBF24', fontSize: 10, fontWeight: '800' },

  badgePillBlue: { backgroundColor: '#EEF2FF', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgePillBlueText: { color: '#4338CA', fontSize: 10, fontWeight: '800' },
  badgePillGray: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgePillGrayText: { fontSize: 10, fontWeight: '700' },

  footerSection: { alignItems: 'center', marginTop: 10, paddingBottom: 20 },
  sebiDisclosureText: { fontSize: 11, textAlign: 'center', lineHeight: 16, marginBottom: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16, borderWidth: 1, width: '100%' },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '800' }
});
