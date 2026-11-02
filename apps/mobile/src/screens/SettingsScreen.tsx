import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  PermissionsAndroid,
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
  const [isKycDone, setIsKycDone] = useState<boolean>(false);

  // Settings Quick Indicators
  const [pinActive, setPinActive] = useState<boolean>(false);
  const [allowedPermsCount, setAllowedPermsCount] = useState<number>(0);

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
        setIsKycDone(Boolean(profile?.profile?.kycStatus === 'VERIFIED' || profile?.profile?.pan));
      }

      // 3. Quick Permissions count (Android check)
      if (Platform.OS === 'android') {
        let granted = 0;
        const permsToCheck = [
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CAMERA,
          (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];
        for (const p of permsToCheck) {
          if (p) {
            const has = await PermissionsAndroid.check(p).catch(() => false);
            if (has) granted++;
          }
        }
        setAllowedPermsCount(granted);
      } else {
        setAllowedPermsCount(3);
      }
    } catch (e) {
      console.warn('Settings status load error:', e);
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
              routes: [{ name: 'Welcome' }],
            });
          },
        },
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
    if (preference === 'dark') return 'Dark Mode';
    if (preference === 'light') return 'Light Mode';
    return 'System Default';
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title="Settings" onBack={() => navigation.goBack()} showSettings={false} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Card Header */}
        <View style={[styles.profileHeaderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.profileAvatarBox}>
            <Text style={styles.avatarInitials}>
              {profileName.trim().slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfoBox}>
            <View style={styles.profileNameRow}>
              <Text style={[styles.profileNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                {profileName}
              </Text>
              {isKycDone && (
                <View style={styles.verifiedKycBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#059669" />
                  <Text style={styles.verifiedKycText}>KYC</Text>
                </View>
              )}
            </View>
            <Text style={[styles.profileContactText, { color: colors.textSecondary }]} numberOfLines={1}>
              {profileContact || 'Investor Account'}
            </Text>
          </View>
          <Pressable
            style={[styles.editProfileBtn, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' }]}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editProfileBtnText}>Edit</Text>
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* 1. ACCOUNT & INVESTMENT SETTINGS                               */}
        {/* ============================================================== */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Account & Investment Profile</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Personal Profile */}
          <Pressable
            style={[styles.row, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#1E1B4B' : '#E0E7FF' }]}>
              <Ionicons name="person-outline" size={20} color={isDark ? '#818CF8' : '#3730A3'} />
            </View>
            <View style={styles.textCol}>
              <View style={styles.rowTitleWrap}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Personal & KYC Profile</Text>
                {isPanLinked && (
                  <View style={[styles.tagGreen, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                    <Text style={[styles.tagGreenText, { color: isDark ? '#34D399' : '#059669' }]}>PAN Linked</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>PAN, verified email, address & tax status</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Linked Bank Accounts */}
          <Pressable
            style={[styles.row, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('BankAccounts')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <Ionicons name="card-outline" size={20} color={isDark ? '#34D399' : '#059669'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Linked Bank Accounts</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>Primary verified bank for payouts & redemption credits</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Nominee Declarations */}
          <Pressable
            style={[styles.row, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('NomineeDetails')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#451A03' : '#FEF3C7' }]}>
              <Ionicons name="people-outline" size={20} color={isDark ? '#FBBF24' : '#B45309'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Nominee Details</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>SEBI mandatory portfolio nomination declaration</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Auto-Debit Mandates */}
          <Pressable
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('ActiveMandates')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
              <Ionicons name="repeat-outline" size={20} color={isDark ? '#A78BFA' : '#5B21B6'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Auto-Debit Mandates</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>Manage UPI Autopay & e-NACH mandates for SIPs</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* 2. SECURITY & LOGIN                                            */}
        {/* ============================================================== */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Security & Login</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* App Lock & PIN */}
          <Pressable
            style={[styles.row, { borderBottomColor: colors.borderSubtle }]}
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
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Device PIN & App Lock</Text>
                <View style={[styles.tagPill, pinActive ? styles.tagGreen : styles.tagAmber]}>
                  <Text style={[styles.tagPillText, pinActive ? styles.tagGreenText : styles.tagAmberText]}>
                    {pinActive ? 'Active' : 'Disabled'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                {pinActive ? '4-digit PIN required on app open & resume' : 'Enable 4-digit PIN protection'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Two-Factor Authentication */}
          <Pressable
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('TwoFactorSettings')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#082F49' : '#E0F2FE' }]}>
              <Ionicons name="key-outline" size={20} color={isDark ? '#38BDF8' : '#0369A1'} />
            </View>
            <View style={styles.textCol}>
              <View style={styles.rowTitleWrap}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Two-Factor Authentication (2FA)</Text>
                <View style={[styles.tagPill, styles.tagGreen]}>
                  <Text style={[styles.tagPillText, styles.tagGreenText]}>Enforced</Text>
                </View>
              </View>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                Mandatory WhatsApp, SMS & Email OTP verification
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* 3. APP PREFERENCES & APPEARANCE                                */}
        {/* ============================================================== */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Language & Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Language Selection */}
          <Pressable
            style={[styles.row, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('LanguageSettings')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#451A03' : '#FEF3C7' }]}>
              <Ionicons name="language-outline" size={20} color={isDark ? '#FBBF24' : '#B45309'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Language Selection</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                {getLanguageDisplayName(i18n.language || 'en')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Theme & Display */}
          <Pressable
            style={[styles.row, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('ThemeSettings')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#500724' : '#FCE7F3' }]}>
              <Ionicons name="color-palette-outline" size={20} color={isDark ? '#F472B6' : '#BE185D'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Display Theme</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{getThemeDisplayName()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Storage & Cache */}
          <Pressable
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('StorageCache')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
              <Ionicons name="server-outline" size={20} color={isDark ? '#A78BFA' : '#5B21B6'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Storage & Cache</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>Clear temporary factsheets & document cache</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* 4. NOTIFICATIONS                                              */}
        {/* ============================================================== */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('NotificationPreferences')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#082F49' : '#E0F2FE' }]}>
              <Ionicons name="notifications-outline" size={20} color={isDark ? '#38BDF8' : '#0369A1'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Notification Preferences</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>SIP debit alerts, order confirmations & WhatsApp updates</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* 5. PRIVACY & PERMISSIONS                                      */}
        {/* ============================================================== */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Privacy & Permissions</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* App Permissions */}
          <Pressable
            style={[styles.row, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('Permissions')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#052E16' : '#F0FDF4' }]}>
              <Ionicons name="shield-outline" size={20} color={isDark ? '#4ADE80' : '#16A34A'} />
            </View>
            <View style={styles.textCol}>
              <View style={styles.rowTitleWrap}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>App Permissions Center</Text>
                <View style={[styles.tagPill, styles.tagBlue]}>
                  <Text style={[styles.tagPillText, styles.tagBlueText]}>{allowedPermsCount} Active</Text>
                </View>
              </View>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>Microphone, Camera, Files, KYC Location</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Privacy Policy */}
          <Pressable
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#082F49' : '#E0F2FE' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={isDark ? '#38BDF8' : '#0369A1'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Privacy Policy</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>AES-256 data protection & KYC privacy covenants</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* 6. HELP & SUPPORT                                             */}
        {/* ============================================================== */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Help & Support</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* FAQs */}
          <Pressable
            style={[styles.row, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('Faqs')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#082F49' : '#E0F2FE' }]}>
              <Ionicons name="help-circle-outline" size={20} color={isDark ? '#38BDF8' : '#0369A1'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Frequently Asked Questions (FAQs)</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>SIP cutoffs, NAV timing, taxes & mandate rules</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Contact Support */}
          <Pressable
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('HelpSupport')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#052E16' : '#DCFCE7' }]}>
              <Ionicons name="headset-outline" size={20} color={isDark ? '#4ADE80' : '#15803D'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Contact Support & Helpdesk</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>Direct WhatsApp, Grievance email & Ticket support</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* 7. LEGAL & REGULATORY INFORMATION                             */}
        {/* ============================================================== */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Legal & Regulatory Information</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Terms & Conditions */}
          <Pressable
            style={[styles.row, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('Terms')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
              <Ionicons name="document-text-outline" size={20} color={isDark ? '#A78BFA' : '#5B21B6'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Terms & Conditions</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>Execution agreement, e-mandates & user covenants</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Risk Disclosures */}
          <Pressable
            style={[styles.row, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('RiskDisclosures')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#451A03' : '#FEF3C7' }]}>
              <Ionicons name="alert-circle-outline" size={20} color={isDark ? '#FBBF24' : '#B45309'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Statutory Risk Disclosures</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>SEBI market risks, Risk-o-Meter & NAV timelines</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Regulatory Compliance Center */}
          <Pressable
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('LegalSettings')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <Ionicons name="ribbon-outline" size={20} color={isDark ? '#34D399' : '#059669'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Platform Compliance Center</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>AMFI registration (ARN-284912), SCORES & SMART ODR</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* LOGOUT & REGULATORY FOOTER                                    */}
        {/* ============================================================== */}
        <View style={styles.footerSection}>
          <Pressable
            style={[styles.logoutBtn, { backgroundColor: isDark ? '#450A0A' : '#FEF2F2', borderColor: isDark ? '#991B1B' : '#FECACA' }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={19} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>{t('header.logOut', { defaultValue: 'Sign Out of TechArtha' })}</Text>
          </Pressable>

          <Text style={[styles.sebiDisclosureText, { color: colors.textMuted }]}>
            AMFI Registered Mutual Fund Distributor • ARN-284912{'\n'}
            Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },

  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  profileAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3C3985',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  profileInfoBox: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileNameText: {
    fontSize: 16,
    fontWeight: '700',
  },
  verifiedKycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  verifiedKycText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  profileContactText: {
    fontSize: 12,
    marginTop: 2,
  },
  editProfileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editProfileBtnText: {
    color: '#3C3985',
    fontSize: 12,
    fontWeight: '700',
  },

  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textCol: {
    flex: 1,
    paddingRight: 8,
  },
  rowTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 12,
    lineHeight: 16,
  },

  tagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tagGreen: {
    backgroundColor: '#ECFDF5',
  },
  tagGreenText: {
    color: '#059669',
  },
  tagAmber: {
    backgroundColor: '#FFFBEB',
  },
  tagAmberText: {
    color: '#D97706',
  },
  tagBlue: {
    backgroundColor: '#EEF2FF',
  },
  tagBlueText: {
    color: '#4338CA',
  },

  footerSection: {
    alignItems: 'center',
    marginTop: 8,
    paddingBottom: 24,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
    marginBottom: 16,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '800',
  },
  sebiDisclosureText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
  },
});
