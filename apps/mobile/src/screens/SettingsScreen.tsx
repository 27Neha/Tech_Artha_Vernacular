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
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const SettingsScreen = () => {
  const { t, i18n } = useTranslation('common');
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  const { colors, isDark, preference } = useTheme();

  // Real Settings Status Indicators
  const [pinActive, setPinActive] = useState<boolean>(false);
  const [preferred2faChannel, setPreferred2faChannel] = useState<string>('WHATSAPP');
  const [allowedPermsCount, setAllowedPermsCount] = useState<number>(0);

  const loadScreenData = useCallback(async () => {
    try {
      // 1. PIN Lock status
      const hasPin = await AsyncStorage.getItem('techartha_pin_enabled');
      setPinActive(hasPin === 'true');

      // 2. Preferred 2FA Delivery Channel
      const savedChannel = await AsyncStorage.getItem('techartha_2fa_preferred_channel');
      if (savedChannel === 'SMS' || savedChannel === 'EMAIL' || savedChannel === 'WHATSAPP') {
        setPreferred2faChannel(savedChannel);
      }

      // 3. Real OS Permissions count (Android check)
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
      loadScreenData();
    }, [loadScreenData]),
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
      ],
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

  const get2faChannelLabel = () => {
    if (preferred2faChannel === 'SMS') return 'SMS OTP';
    if (preferred2faChannel === 'EMAIL') return 'Email OTP';
    return 'WhatsApp OTP';
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title="Settings" onBack={() => navigation.goBack()} showSettings={false} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top Intro Banner */}
        <View style={styles.introBlock}>
          <Text style={[styles.introTitle, { color: colors.textPrimary }]}>Application & Security Settings</Text>
          <Text style={[styles.introSub, { color: colors.textSecondary }]}>
            Manage device security, transaction authentication, language, appearance, notifications, and regulatory disclosures.
          </Text>
        </View>

        {/* ============================================================== */}
        {/* 1. SECURITY & LOGIN                                            */}
        {/* ============================================================== */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Security & Login</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* App Lock, PIN & Password */}
          <Pressable
            style={[styles.row, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('SecuritySettings')}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: pinActive
                    ? isDark
                      ? '#052E16'
                      : '#DCFCE7'
                    : isDark
                      ? '#451A03'
                      : '#FEF3C7',
                },
              ]}
            >
              <Ionicons
                name={pinActive ? 'shield-checkmark-outline' : 'lock-closed-outline'}
                size={20}
                color={pinActive ? (isDark ? '#4ADE80' : '#15803D') : isDark ? '#FBBF24' : '#B45309'}
              />
            </View>
            <View style={styles.textCol}>
              <View style={styles.rowTitleWrap}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>App Lock, PIN & Password</Text>
                <View style={[styles.tagPill, pinActive ? styles.tagGreen : styles.tagAmber]}>
                  <Text style={[styles.tagPillText, pinActive ? styles.tagGreenText : styles.tagAmberText]}>
                    {pinActive ? 'PIN Active' : 'PIN Off'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                {pinActive
                  ? '4-digit PIN required on app launch & account password settings'
                  : 'Configure 4-digit app PIN lock and account password'}
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
                  <Text style={[styles.tagPillText, styles.tagGreenText]}>{get2faChannelLabel()}</Text>
                </View>
              </View>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                SEBI mandatory OTP verification channel for orders & redemptions
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* 2. LANGUAGE & APPEARANCE                                       */}
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
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>App Language</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                {getLanguageDisplayName(i18n.language || 'en')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Theme & Display */}
          <Pressable
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('ThemeSettings')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#500724' : '#FCE7F3' }]}>
              <Ionicons name="contrast-outline" size={20} color={isDark ? '#F472B6' : '#BE185D'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Display Theme</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{getThemeDisplayName()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* 3. APP PREFERENCES & NOTIFICATIONS                             */}
        {/* ============================================================== */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>App Preferences & Notifications</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Notification Preferences */}
          <Pressable
            style={[styles.row, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => navigation.navigate('NotificationPreferences')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#082F49' : '#E0F2FE' }]}>
              <Ionicons name="notifications-outline" size={20} color={isDark ? '#38BDF8' : '#0369A1'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Notification Preferences</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                SIP debit reminders, order execution & WhatsApp/email alerts
              </Text>
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
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Storage & Local Cache</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                Manage cached scheme factsheets & temporary app storage
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* 4. PRIVACY & PERMISSIONS                                       */}
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
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Device Permissions</Text>
                <View style={[styles.tagPill, styles.tagBlue]}>
                  <Text style={[styles.tagPillText, styles.tagBlueText]}>{allowedPermsCount} Allowed</Text>
                </View>
              </View>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                Camera, microphone, notifications & KYC location access
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Privacy Policy */}
          <Pressable
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#082F49' : '#E0F2FE' }]}>
              <Ionicons name="lock-open-outline" size={20} color={isDark ? '#38BDF8' : '#0369A1'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Data & Privacy Policy</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                AES-256 encryption, KYC data retention & DPDP compliance
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* 5. HELP & SUPPORT                                              */}
        {/* ============================================================== */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Help & Investor Support</Text>
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
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Investor FAQs & Guides</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                SIP cutoffs, NAV allotment timelines, taxation & mandate rules
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          {/* Grievance & Helpdesk */}
          <Pressable
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('HelpSupport')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#052E16' : '#DCFCE7' }]}>
              <Ionicons name="call-outline" size={20} color={isDark ? '#4ADE80' : '#15803D'} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Grievance Redressal & Helpdesk</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                Escalation matrix, compliance officer & support contact channels
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* 6. LEGAL & REGULATORY INFORMATION                              */}
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
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                Order execution agreement, e-mandates & investor covenants
              </Text>
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
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                SEBI Risk-o-Meter levels, market risks & scheme cut-off rules
              </Text>
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
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Regulatory & Compliance Center</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                AMFI distributor disclosures, SEBI SCORES & SMART ODR portal
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* LOGOUT & REGULATORY FOOTER                                    */}
        {/* ============================================================== */}
        <View style={styles.footerSection}>
          <Pressable
            style={[
              styles.logoutBtn,
              {
                backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
                borderColor: isDark ? '#991B1B' : '#FECACA',
              },
            ]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={19} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>{t('header.logOut', { defaultValue: 'Sign Out of TechArtha' })}</Text>
          </Pressable>

          <Text style={[styles.sebiDisclosureText, { color: colors.textMuted }]}>
            Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },

  introBlock: {
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  introSub: {
    fontSize: 13,
    lineHeight: 18,
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
