import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TermsModal } from '../components/TermsModal';
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal';
import { Ionicons } from '@expo/vector-icons';
import { openWhatsAppSupport, openEmailSupport, TECH_ARTHA_SUPPORT } from '../utils/contact';
import { SupportQuerySection } from '../components/SupportQuerySection';

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
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' }
];

export const SettingsScreen = () => {
  const { t, i18n } = useTranslation('common');
  const navigation = useNavigation<any>();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [theme, setTheme] = useState('system');
  const [notifStatus, setNotifStatus] = useState<string>('unknown');
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  useEffect(() => {
    checkNotifPermission();
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const t = await AsyncStorage.getItem('appTheme');
    if (t) setTheme(t);
  };

  const checkNotifPermission = async () => {
    // Native permission checking without external libraries
    setNotifStatus('unknown');
  };

  const toggleExpand = (section: string) => {
    setExpanded(prev => prev === section ? null : section);
  };

  const handleLangSelect = async (code: string) => {
    await i18n.changeLanguage(code);
    await AsyncStorage.setItem('userLanguage', code);
  };

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    await AsyncStorage.setItem('appTheme', newTheme);
  };

  const handleManageNotif = async () => {
    openSettings();
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title={t('settings.title', { defaultValue: 'Settings' })} onBack={() => navigation.goBack()} showSettings={false} />
      <ScrollView contentContainerStyle={styles.container}>
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
              {SUPPORTED_LANGUAGES.map(l => (
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
              <Pressable style={[styles.toggleBtn, notifStatus === 'granted' && styles.toggleBtnActive]} onPress={handleManageNotif}>
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
              {['light', 'dark', 'system'].map(tType => (
                <Pressable 
                  key={tType} 
                  style={[styles.langItem, theme === tType && styles.langItemActive]}
                  onPress={() => handleThemeChange(tType)}
                >
                  <Text style={[styles.langNative, theme === tType && { color: '#3C3985', textTransform: 'capitalize' }, theme !== tType && { textTransform: 'capitalize' }]}>{tType}</Text>
                  {theme === tType && <Text style={{ color: '#3C3985', fontWeight: 'bold' }}>✓</Text>}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* HELP & SUPPORT */}
        <View style={[styles.card, expanded === 'Help & Support' && styles.cardActive]}>
          <Pressable style={styles.cardHeader} onPress={() => toggleExpand('Help & Support')}>
            <View style={styles.iconBox}><Ionicons name="help-circle-outline" size={20} color="#3C3985" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('settings.helpSupport', { defaultValue: 'Help & Support' })}</Text>
              <Text style={styles.cardSub}>{t('settings.helpDesc', { defaultValue: 'Contact us or get instant AI help' })}</Text>
            </View>
            <Text style={[styles.chevron, expanded === 'Help & Support' && { transform: [{ rotate: '90deg' }] }]}>›</Text>
          </Pressable>
          {expanded === 'Help & Support' && (
            <View style={styles.expandedContent}>
              <View style={styles.aiBox}>
                <Text style={styles.aiBoxLabel}>24/7 AI ASSISTANT</Text>
                <Pressable style={styles.aiBtn}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="chatbubbles-outline" size={17} color="#fff" />
                    <Text style={styles.aiBtnText}>Start Live AI Chat</Text>
                  </View>
                </Pressable>
              </View>
              <Text style={styles.sectionLabelContact}>Contact TechArtha</Text>
              <View style={{ gap: 8 }}>
                <Pressable style={styles.contactBtn} onPress={() => openWhatsAppSupport()}>
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                  <View>
                    <Text style={styles.contactTitle}>{t('settings.whatsapp', { defaultValue: 'WhatsApp Support' })}</Text>
                    <Text style={styles.contactSub}>{TECH_ARTHA_SUPPORT.displayPhone}</Text>
                  </View>
                </Pressable>
                <Pressable style={styles.contactBtn} onPress={() => openEmailSupport()}>
                  <Ionicons name="mail-outline" size={20} color="#3C3985" />
                  <View>
                    <Text style={styles.contactTitle}>{t('settings.email', { defaultValue: 'Email Support' })}</Text>
                    <Text style={styles.contactSub}>{TECH_ARTHA_SUPPORT.email}</Text>
                  </View>
                </Pressable>
              </View>

              {/* Submit a Support Query Form & Tracking */}
              <SupportQuerySection />
            </View>
          )}
        </View>

        {/* LEGAL & POLICIES */}
        <View style={[styles.card, expanded === 'Legal' && styles.cardActive]}>
          <Pressable style={styles.cardHeader} onPress={() => toggleExpand('Legal')}>
            <View style={styles.iconBox}><Ionicons name="document-text-outline" size={20} color="#3C3985" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('settings.legal', { defaultValue: 'Legal & Policies' })}</Text>
              <Text style={styles.cardSub}>{t('settings.legalDesc', { defaultValue: 'Terms of Service and Privacy Policy' })}</Text>
            </View>
            <Text style={[styles.chevron, expanded === 'Legal' && { transform: [{ rotate: '90deg' }] }]}>›</Text>
          </Pressable>
          {expanded === 'Legal' && (
            <View style={styles.expandedContent}>
              <Pressable 
                style={[styles.langItem, { paddingVertical: 14 }]} 
                onPress={() => setTermsModalVisible(true)}
              >
                <View>
                  <Text style={[styles.langNative, { fontSize: 15, fontWeight: '700' }]}>
                    {t('signup.termsOfService', { defaultValue: 'Terms of Service' })}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
                    {t('termsModal.subtitle', { defaultValue: 'Rules and conditions governing platform usage' })}
                  </Text>
                </View>
                <Text style={{ color: '#3C3985', fontSize: 18, fontWeight: 'bold' }}>›</Text>
              </Pressable>

              <Pressable 
                style={[styles.langItem, { paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]} 
                onPress={() => setPrivacyModalVisible(true)}
              >
                <View>
                  <Text style={[styles.langNative, { fontSize: 15, fontWeight: '700' }]}>
                    {t('signup.privacyPolicy', { defaultValue: 'Privacy Policy' })}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
                    {t('privacyModal.subtitle', { defaultValue: 'Data security, privacy practices, and compliance' })}
                  </Text>
                </View>
                <Text style={{ color: '#3C3985', fontSize: 18, fontWeight: 'bold' }}>›</Text>
              </Pressable>
            </View>
          )}
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

      </ScrollView>

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
  pageTitle: { fontSize: 32, textTransform: 'capitalize', fontWeight: '800', color: '#102A54', marginBottom: 24 },
  container: { padding: 24, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardActive: { borderColor: '#3C3985' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F7FAFC', alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#102A54', marginBottom: 2 },
  cardSub: { fontSize: 12, color: '#A0AEC0' },
  chevron: { fontSize: 20, color: '#CBD5E0', fontWeight: '300' },
  expandedContent: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F7FAFC', gap: 8 },
  langItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EDF2F7' },
  langItemActive: { backgroundColor: '#EBEBFA', borderColor: '#3C3985' },
  langNative: { fontSize: 14, fontWeight: '800', color: '#102A54' },
  langName: { fontSize: 12, color: '#A0AEC0', marginTop: 2 },
  permissionsContainer: { marginBottom: 12, marginTop: 12 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#A0AEC0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  sectionLabelContact: { fontSize: 10, fontWeight: '800', color: '#A0AEC0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  toggleBtn: { width: 48, height: 24, borderRadius: 12, backgroundColor: '#E2E8F0', padding: 2 },
  toggleBtnActive: { backgroundColor: '#3C3985' },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleKnobActive: { transform: [{ translateX: 24 }] },
  aiBox: { backgroundColor: '#EBEBFA', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#D6D6F5' },
  aiBoxLabel: { fontSize: 10, fontWeight: '800', color: '#3C3985', marginBottom: 8 },
  aiBtn: { backgroundColor: '#3C3985', borderRadius: 12, padding: 12, alignItems: 'center' },
  aiBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EDF2F7' },
  contactTitle: { fontSize: 14, fontWeight: '800', color: '#102A54' },
  contactSub: { fontSize: 12, color: '#718096' }
});
