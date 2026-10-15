import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../store/auth';
import { useAuth } from '../store/AuthContext';
import {
  openWhatsAppSupport,
  openEmailSupport,
  TECH_ARTHA_SUPPORT,
} from '../utils/contact';
import { SupportQuerySection } from '../components/SupportQuerySection';
import { TermsModal } from '../components/TermsModal';
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal';


const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
];

export const SettingsScreen = () => {
  const { t, i18n } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { signOut, user } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(route.params?.expand ?? 'Contact Us');
  const [theme, setTheme] = useState('system');
  const [notifStatus, setNotifStatus] = useState<string>('granted');
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    if (route.params?.expand) {
      setExpanded(route.params.expand);
    }
  }, [route.params?.expand]);

  const loadTheme = async () => {
    const savedTheme = await AsyncStorage.getItem('appTheme');
    if (savedTheme) setTheme(savedTheme);
  };

  const handleWhatsApp = async () => {
    await openWhatsAppSupport({
      onError: () => {
        Alert.alert(
          t('settings.whatsappErrorTitle', { defaultValue: 'Unable to open WhatsApp' }),
          t('settings.whatsappErrorDesc', {
            defaultValue: `Please message us directly at ${TECH_ARTHA_SUPPORT.displayPhone} or check your browser.`,
          })
        );
      },
    });
  };

  const handleEmail = async () => {
    await openEmailSupport({
      onError: () => {
        Alert.alert(
          t('settings.emailErrorTitle', { defaultValue: 'No Email App Found' }),
          t('settings.emailErrorDesc', {
            defaultValue: `Please send an email to ${TECH_ARTHA_SUPPORT.email} from your preferred mail client.`,
          })
        );
      },
    });
  };

  const toggleExpand = (section: string) => {
    setExpanded((prev) => (prev === section ? null : section));
  };

  const handleLangSelect = async (code: string) => {
    await i18n.changeLanguage(code);
    await AsyncStorage.setItem('userLanguage', code);
  };

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    await AsyncStorage.setItem('appTheme', newTheme);
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'You will need your mobile number and an OTP to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          authStore.accessToken = null;
          authStore.userId = null;
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title={t('settings.title', { defaultValue: 'Settings' })} onBack={() => navigation.goBack()} showSettings={false} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>{t('settings.title', { defaultValue: 'Settings' })}</Text>
        
        {/* LANGUAGE */}
        <View style={[styles.card, expanded === 'Language' && styles.cardActive]}>
          <Pressable style={styles.cardHeader} onPress={() => toggleExpand('Language')}>
            <View style={styles.iconBox}><Ionicons name="language-outline" size={20} color="#3C3985" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('settings.language', { defaultValue: 'Language' })}</Text>
              <Text style={styles.cardSub}>{t('settings.changeLang', { defaultValue: 'Change your preferred language' })}</Text>
            </View>
            <Text style={[styles.chevron, expanded === 'Language' && { transform: [{ rotate: '90deg' }] }]}>›</Text>
          </Pressable>
          {expanded === 'Language' && (
            <View style={styles.expandedContent}>
              {SUPPORTED_LANGUAGES.map((l) => (
                <Pressable 
                  key={l.code} 
                  style={[styles.langItem, i18n.language === l.code && styles.langItemActive]}
                  onPress={() => handleLangSelect(l.code)}
                >
                  <View>
                    <Text style={[styles.langNative, i18n.language === l.code && { color: '#3C3985' }]}>{l.nativeName}</Text>
                    <Text style={styles.langName}>{l.name}</Text>
                  </View>
                  {i18n.language === l.code && <Text style={{ color: '#3C3985', fontWeight: 'bold' }}>✓</Text>}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* PERMISSIONS */}
        <View style={styles.permissionsContainer}>
          <Text style={styles.sectionLabel}>{t('settings.permissions', { defaultValue: 'Permissions' })}</Text>
          <View style={[styles.card, { marginBottom: 0 }]}>
            <View style={[styles.cardHeader, { paddingBottom: 0 }]}>
              <View style={styles.iconBox}><Ionicons name="notifications-outline" size={20} color="#3C3985" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('settings.deviceNotif', { defaultValue: 'Notifications' })}</Text>
                <Text style={[styles.cardSub, { color: notifStatus === 'granted' ? '#10B981' : '#EF4444' }]}>
                  {notifStatus === 'granted' ? t('settings.statusAllowed', { defaultValue: 'Allowed' }) : t('settings.statusDenied', { defaultValue: 'Denied' })}
                </Text>
              </View>
              <Pressable
                style={[styles.toggleBtn, notifStatus === 'granted' && styles.toggleBtnActive]}
                onPress={() => setNotifStatus(notifStatus === 'granted' ? 'denied' : 'granted')}
              >
                <View style={[styles.toggleKnob, notifStatus === 'granted' && styles.toggleKnobActive]} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* APP THEME */}
        <View style={[styles.card, expanded === 'App Theme' && styles.cardActive]}>
          <Pressable style={styles.cardHeader} onPress={() => toggleExpand('App Theme')}>
            <View style={styles.iconBox}><Ionicons name="color-palette-outline" size={20} color="#3C3985" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('settings.appTheme', { defaultValue: 'App Theme' })}</Text>
              <Text style={styles.cardSub}>{theme.charAt(0).toUpperCase() + theme.slice(1)} Mode</Text>
            </View>
            <Text style={[styles.chevron, expanded === 'App Theme' && { transform: [{ rotate: '90deg' }] }]}>›</Text>
          </Pressable>
          {expanded === 'App Theme' && (
            <View style={styles.expandedContent}>
              {['light', 'dark', 'system'].map((tType) => (
                <Pressable 
                  key={tType} 
                  style={[styles.langItem, theme === tType && styles.langItemActive]}
                  onPress={() => handleThemeChange(tType)}
                >
                  <Text style={[styles.langNative, theme === tType && { color: '#3C3985' }, { textTransform: 'capitalize' }]}>{tType}</Text>
                  {theme === tType && <Text style={{ color: '#3C3985', fontWeight: 'bold' }}>✓</Text>}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* CONTACT US */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>
            {t('settings.contactUs', { defaultValue: 'Contact Us' })}
          </Text>
          <View style={[styles.card, expanded === 'Contact Us' && styles.cardActive]}>
            <Pressable
              style={styles.cardHeader}
              onPress={() => toggleExpand('Contact Us')}
              accessibilityRole="button"
              accessibilityLabel="Contact Us"
              accessibilityState={{ expanded: expanded === 'Contact Us' }}
            >
              <View style={[styles.iconBox, { backgroundColor: '#EEF0FB' }]}>
                <Ionicons name="chatbubbles-outline" size={20} color="#36358D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {t('settings.contactUs', { defaultValue: 'Contact Us' })}
                </Text>
                <Text style={styles.cardSub}>
                  {t('settings.contactDesc', { defaultValue: 'Chat on WhatsApp, send email, or submit a support query' })}
                </Text>
              </View>
              <Text style={[styles.chevron, expanded === 'Contact Us' && { transform: [{ rotate: '90deg' }] }]}>›</Text>
            </Pressable>

            {expanded === 'Contact Us' && (
              <View style={styles.expandedContent}>
                {/* Option 1: WhatsApp Support */}
                <Pressable
                  style={({ pressed }) => [
                    styles.contactOption,
                    pressed && styles.contactOptionPressed,
                  ]}
                  onPress={handleWhatsApp}
                  accessibilityRole="button"
                  accessibilityLabel="WhatsApp Support"
                  accessibilityHint="Opens WhatsApp to chat with TechArtha support at +91 83088 16023"
                >
                  <View style={[styles.contactIconWrap, { backgroundColor: '#E8FDF0', borderColor: '#BBF7D0' }]}>
                    <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                  </View>
                  <View style={styles.contactDetails}>
                    <View style={styles.contactTitleRow}>
                      <Text style={styles.contactOptionTitle}>
                        {t('settings.whatsapp', { defaultValue: 'WhatsApp Support' })}
                      </Text>
                      <View style={styles.fastPill}>
                        <Text style={styles.fastPillText}>Fastest</Text>
                      </View>
                    </View>
                    <Text style={styles.contactOptionSub}>
                      {t('settings.whatsappSub', { defaultValue: 'Chat with our support team' })}
                    </Text>
                    <Text style={styles.contactOptionMeta}>{TECH_ARTHA_SUPPORT.displayPhone}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </Pressable>

                {/* Option 2: Email Support */}
                <Pressable
                  style={({ pressed }) => [
                    styles.contactOption,
                    pressed && styles.contactOptionPressed,
                  ]}
                  onPress={handleEmail}
                  accessibilityRole="button"
                  accessibilityLabel="Email Support"
                  accessibilityHint="Opens default email client to send questions to support@techartha.com"
                >
                  <View style={[styles.contactIconWrap, { backgroundColor: '#EEF0FB', borderColor: '#D6D6F5' }]}>
                    <Ionicons name="mail-outline" size={22} color="#36358D" />
                  </View>
                  <View style={styles.contactDetails}>
                    <Text style={styles.contactOptionTitle}>
                      {t('settings.email', { defaultValue: 'Email Support' })}
                    </Text>
                    <Text style={styles.contactOptionSub}>
                      {t('settings.emailSub', { defaultValue: 'Send us your questions or feedback' })}
                    </Text>
                    <Text style={styles.contactOptionMeta}>{TECH_ARTHA_SUPPORT.email}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </Pressable>

                {/* Option 3: Support Query Submission & Tracking Desk */}
                <SupportQuerySection userEmail={(user as any)?.email} />
              </View>
            )}
          </View>
        </View>

        {/* LEGAL & COMPLIANCE (TERMS & PRIVACY POLICY MODALS) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>
            {t('settings.legal', { defaultValue: 'Legal & Policies' })}
          </Text>
          <View style={[styles.card, expanded === 'Legal' && styles.cardActive]}>
            <Pressable
              style={styles.cardHeader}
              onPress={() => toggleExpand('Legal')}
              accessibilityRole="button"
              accessibilityLabel="Legal and Policies"
              accessibilityState={{ expanded: expanded === 'Legal' }}
            >
              <View style={[styles.iconBox, { backgroundColor: '#EEF0FB' }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#36358D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {t('settings.legalTitle', { defaultValue: 'Terms & Privacy Policy' })}
                </Text>
                <Text style={styles.cardSub}>
                  {t('settings.legalDesc', { defaultValue: 'Platform terms of service and data protection policy' })}
                </Text>
              </View>
              <Text style={[styles.chevron, expanded === 'Legal' && { transform: [{ rotate: '90deg' }] }]}>›</Text>
            </Pressable>


            {expanded === 'Legal' && (
              <View style={styles.expandedContent}>
                <Pressable 
                  style={[styles.langItem, { paddingVertical: 14 }]} 
                  onPress={() => setTermsModalVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="View Terms of Service"
                >
                  <View>
                    <Text style={[styles.langNative, { fontSize: 14.5, fontWeight: '700' }]}>
                      {t('signup.termsOfService', { defaultValue: 'Terms of Service' })}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
                      {t('termsModal.subtitle', { defaultValue: 'Rules and conditions governing platform usage' })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#36358D" />
                </Pressable>

                <Pressable 
                  style={[styles.langItem, { paddingVertical: 14 }]} 
                  onPress={() => setPrivacyModalVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="View Privacy Policy"
                >
                  <View>
                    <Text style={[styles.langNative, { fontSize: 14.5, fontWeight: '700' }]}>
                      {t('signup.privacyPolicy', { defaultValue: 'Privacy Policy' })}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
                      {t('privacyModal.subtitle', { defaultValue: 'Data security, privacy practices, and compliance' })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#36358D" />
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* OTHER SETTINGS */}
        <Pressable style={styles.card} onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available shortly.')}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}><Ionicons name="lock-closed-outline" size={20} color="#3C3985" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('settings.privacyTitle', { defaultValue: 'Privacy & Security' })}</Text>
              <Text style={styles.cardSub}>{t('settings.privacyDesc', { defaultValue: 'App Lock, Biometrics, and Data Privacy' })}</Text>
            </View>
          </View>
        </Pressable>

        <Pressable style={styles.card} onPress={() => Alert.alert('Coming Soon', 'Device management will be available shortly.')}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}><Ionicons name="hardware-chip-outline" size={20} color="#3C3985" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('settings.devicesTitle', { defaultValue: 'Linked Devices' })}</Text>
              <Text style={styles.cardSub}>{t('settings.devicesDesc', { defaultValue: 'Manage devices logged into your account' })}</Text>
            </View>
          </View>
        </Pressable>

        {/* LEGAL & DISCLOSURE */}
        <View style={styles.disclosureCard}>
          <Text style={styles.disclosureText}>
            {t('disclaimer', {
              defaultValue: 'Mutual fund investments are subject to market risks. Read all scheme related documents carefully before investing.',
            })}
          </Text>
        </View>

        {/* ACCOUNT SIGN OUT */}
        <Pressable style={styles.signOutBtn} onPress={confirmSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.version}>
          TechArtha {Constants.expoConfig?.version ?? '1.0.0'} · AMFI Registered Distributor
        </Text>
      </ScrollView>

      {/* Rashi's Terms & Privacy Modals */}
      <TermsModal 
        visible={termsModalVisible} 
        onClose={() => setTermsModalVisible(false)} 
      />
      <PrivacyPolicyModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  pageTitle: { fontSize: 28, textTransform: 'capitalize', fontWeight: '800', color: '#102A54', marginBottom: 20 },
  container: { padding: 24, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardActive: { borderColor: '#3C3985' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F7FAFC', alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#102A54', marginBottom: 2 },
  cardSub: { fontSize: 12, color: '#A0AEC0' },
  chevron: { fontSize: 20, color: '#CBD5E0', fontWeight: 'bold' },
  expandedContent: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F7FAFC', gap: 8 },
  langItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EDF2F7' },
  langItemActive: { backgroundColor: '#EBEBFA', borderColor: '#3C3985' },
  langNative: { fontSize: 14, fontWeight: '800', color: '#102A54' },
  langName: { fontSize: 12, color: '#A0AEC0', marginTop: 2 },
  permissionsContainer: { marginBottom: 12, marginTop: 4 },
  sectionContainer: { marginBottom: 12, marginTop: 4 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#A0AEC0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  toggleBtn: { width: 48, height: 24, borderRadius: 12, backgroundColor: '#E2E8F0', padding: 2 },
  toggleBtnActive: { backgroundColor: '#3C3985' },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleKnobActive: { transform: [{ translateX: 24 }] },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  contactOptionPressed: {
    backgroundColor: '#F8F9FE',
    borderColor: '#D6D6F5',
  },
  contactIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactDetails: {
    flex: 1,
  },
  contactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  contactOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
  },
  fastPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fastPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  contactOptionSub: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 2,
  },
  contactOptionMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#36358D',
  },
  disclosureCard: { backgroundColor: '#EBEAF8', borderRadius: 16, padding: 16, marginTop: 12, marginBottom: 16 },
  disclosureText: { color: '#3C3985', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  signOutBtn: { backgroundColor: '#FFF5F5', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FEB2B2', marginBottom: 16 },
  signOutText: { color: '#C53030', fontSize: 15, fontWeight: '700' },
  version: { color: '#A0AEC0', fontSize: 11, textAlign: 'center', marginBottom: 30 },
});

export default SettingsScreen;
