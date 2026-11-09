import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView, Image } from 'react-native';
import { Screen } from '../types';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  navigationRef,
  canGlobalGoBack,
  handleGlobalBack,
  registerActiveModal,
  subscribeNavigationHistory,
} from '../navigation/navigationService';

export interface HeaderProps {
  title?: string;
  back?: Screen | boolean;
  onBack?: ((screen?: any) => void) | boolean;
  showBack?: boolean;
  hideBack?: boolean;
  showSettings?: boolean;
  showNotifications?: boolean;
  showLanguage?: boolean;
  showLogo?: boolean;
  logoSize?: string;
  onSettingsPress?: () => void;
  route?: any;
}

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'as', label: 'Assamese', native: 'অসমীয়া' },
];

const NOTIFICATIONS = [
  {
    id: '1',
    icon: 'calendar-outline' as const,
    title: 'Monthly SIP Scheduled',
    body: 'Your goal SIP mandate is active and verified with your bank.',
    time: 'Today',
  },
  {
    id: '2',
    icon: 'newspaper-outline' as const,
    title: 'New Market Brief Available',
    body: 'Read today’s personalized market insight in ArthaVerse.',
    time: '2h ago',
  },
  {
    id: '3',
    icon: 'shield-checkmark-outline' as const,
    title: 'Direct Investor Protection',
    body: 'Orders routed via Cybrilla directly to AMCs under AMFI regulations.',
    time: '1d ago',
  },
];

export const Header: React.FC<HeaderProps> = ({
  title,
  back,
  onBack,
  showBack,
  hideBack = false,
  showSettings = true,
  showNotifications = true,
  showLanguage = true,
  showLogo = true,
  onSettingsPress,
  route: routeProp,
}) => {
  const { i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  // Safe route resolution
  let routeName = '';
  if (routeProp?.name) {
    routeName = routeProp.name;
  } else {
    try {
      const route = useRoute();
      routeName = route?.name || '';
    } catch (e) {
      routeName = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name || '' : '';
    }
  }

  // Subscribe to navigation history and back ability
  const [canBack, setCanBack] = useState(() => canGlobalGoBack());

  useEffect(() => {
    setCanBack(canGlobalGoBack());
    const unsubscribe = subscribeNavigationHistory(() => {
      setCanBack(canGlobalGoBack());
    });
    return unsubscribe;
  }, [routeName]);

  // Register active modals so hardware or header back dismisses them first
  useEffect(() => {
    if (langModalVisible) {
      return registerActiveModal('header_lang_modal', () => setLangModalVisible(false));
    }
  }, [langModalVisible]);

  useEffect(() => {
    if (notifModalVisible) {
      return registerActiveModal('header_notif_modal', () => setNotifModalVisible(false));
    }
  }, [notifModalVisible]);

  const currentLangCode = i18n.language || 'en';
  const currentLangObj = LANGUAGES.find((l) => l.code === currentLangCode) || LANGUAGES[0];

  const handleLanguageSelect = async (code: string) => {
    setLangModalVisible(false);
    try {
      await i18n.changeLanguage(code);
      await AsyncStorage.setItem('language', code);
    } catch (e) {
      console.log('AsyncStorage error', e);
    }
  };

  // Determine back button visibility
  const shouldShowBack = showBack !== undefined ? showBack : (!hideBack && (back !== false && (back !== undefined || onBack !== undefined || canBack)));

  // On Home screen, if there is no previous history to return to, back button is visually disabled
  const isHomeRoot = routeName === 'Home';
  const isBackDisabled = isHomeRoot && !canBack;

  // Intelligent back navigation respecting actual history, modals, unsaved changes, and nested stacks
  const handleBack = () => {
    if (typeof onBack === 'function') {
      handleGlobalBack(onBack as () => void);
    } else {
      handleGlobalBack();
    }
  };

  const handleLogoPress = () => {
    try {
      if (navigationRef.isReady()) {
        (navigationRef as any).navigate('MainTabs', { screen: 'Home' });
      }
    } catch (e) {
      navigation.navigate('Home');
    }
  };

  const topInset = Math.max(insets.top, 16);

  return (
    <View
      style={[
        localStyles.headerContainer,
        {
          paddingTop: topInset,
          height: 58 + topInset,
          backgroundColor: isDark ? colors.surface : '#FFFFFF',
          borderBottomColor: isDark ? colors.border : '#EDF2F7',
        },
      ]}
    >
      <View style={localStyles.headerContent}>
        {/* Left Section: Back Button (40x40 dp) or Placeholder */}
        <View style={localStyles.leftSection}>
          {shouldShowBack ? (
            <Pressable
              onPress={handleBack}
              disabled={isBackDisabled}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                localStyles.backBtn,
                {
                  backgroundColor: isDark ? colors.surfaceMuted : '#F0EFFB',
                  borderColor: isDark ? colors.border : '#E2E8F0',
                },
                isBackDisabled && localStyles.backBtnDisabled,
              ]}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              accessibilityState={{ disabled: isBackDisabled }}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={isBackDisabled ? (isDark ? colors.textPlaceholder : '#94A3B8') : (isDark ? colors.textPrimary : '#102A54')}
              />
            </Pressable>
          ) : (
            <View style={localStyles.backBtnPlaceholder} />
          )}
        </View>

        {/* Centre Section: Always Present TechArtha Company Logo or Title */}
        <View style={localStyles.centerSection}>
          {title ? (
            <Text
              numberOfLines={1}
              style={[
                localStyles.headerTitle,
                { color: isDark ? colors.textPrimary : '#102A54' }
              ]}
            >
              {title}
            </Text>
          ) : (
            <Pressable
              onPress={handleLogoPress}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="TechArtha Home"
            >
              <Image
                source={require('../../assets/logo.png')}
                style={localStyles.logoImage}
                resizeMode="contain"
                accessible={true}
                accessibilityLabel="TechArtha Home"
              />
            </Pressable>
          )}
        </View>

        {/* Right Section: Language Picker + Notifications + Settings */}
        <View style={localStyles.rightSection}>
          {showLanguage && (
            <Pressable
              onPress={() => setLangModalVisible(true)}
              hitSlop={8}
              style={[
                localStyles.langButton,
                {
                  backgroundColor: isDark ? colors.surfaceMuted : '#F0EFFB',
                  borderColor: isDark ? colors.border : '#E2E8F0',
                }
              ]}
              accessibilityLabel={`Select language, current is ${currentLangObj.label}`}
              accessibilityRole="button"
            >
              <Ionicons name="globe-outline" size={14} color={isDark ? colors.textPrimary : '#3C3985'} />
              <Text numberOfLines={1} style={[localStyles.langText, { color: isDark ? colors.textPrimary : '#3C3985', maxWidth: 64 }]}>
                {currentLangObj.code.toUpperCase()}
              </Text>
              <Ionicons name="chevron-down" size={12} color={isDark ? colors.textPrimary : '#3C3985'} />
            </Pressable>
          )}

          {showNotifications && (
            <Pressable
              onPress={() => setNotifModalVisible(true)}
              hitSlop={8}
              style={[
                localStyles.iconButton,
                {
                  backgroundColor: isDark ? colors.surfaceMuted : '#F0EFFB',
                  borderColor: isDark ? colors.border : '#E2E8F0',
                }
              ]}
              accessibilityLabel="Notifications"
              accessibilityRole="button"
            >
              <Ionicons name="notifications-outline" size={19} color={isDark ? colors.textPrimary : '#3C3985'} />
              <View style={localStyles.unreadDot} />
            </Pressable>
          )}

          {showSettings && (
            <Pressable
              onPress={onSettingsPress || (() => navigation.navigate('Settings'))}
              hitSlop={8}
              style={[
                localStyles.iconButton,
                {
                  backgroundColor: isDark ? colors.surfaceMuted : '#F0EFFB',
                  borderColor: isDark ? colors.border : '#E2E8F0',
                }
              ]}
              accessibilityLabel="Settings"
              accessibilityRole="button"
            >
              <Ionicons name="settings-outline" size={19} color={isDark ? colors.textPrimary : '#3C3985'} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={langModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <Pressable style={localStyles.overlay} onPress={() => setLangModalVisible(false)}>
          <View style={[localStyles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={localStyles.modalHeader}>
              <Text style={[localStyles.modalTitle, { color: colors.textPrimary }]}>Select Language</Text>
              <Pressable onPress={() => setLangModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={isDark ? colors.textMuted : '#64748B'} />
              </Pressable>
            </View>
            <ScrollView style={localStyles.scrollView} showsVerticalScrollIndicator={false}>
              {LANGUAGES.map((lang) => {
                const isSelected = currentLangCode === lang.code;
                return (
                  <Pressable
                    key={lang.code}
                    style={[
                      localStyles.langRow,
                      { backgroundColor: isDark ? colors.surfaceMuted : '#F8F9FB' },
                      isSelected && [localStyles.langRowSelected, { backgroundColor: isDark ? colors.primaryLight : '#EBEBFA', borderColor: colors.primary }],
                    ]}
                    onPress={() => handleLanguageSelect(lang.code)}
                  >
                    <View style={localStyles.radioContainer}>
                      <View style={[localStyles.radio, { borderColor: colors.border }, isSelected && [localStyles.radioSelected, { borderColor: colors.primary, backgroundColor: colors.primary }]]} />
                    </View>
                    <View style={localStyles.langTextContainer}>
                      <Text style={[localStyles.nativeText, { color: colors.textPrimary }, isSelected && { color: colors.primary }]}>
                        {lang.native}
                      </Text>
                      <Text style={[localStyles.labelText, { color: colors.textMuted }, isSelected && { color: colors.primary }]}>
                        {lang.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Global Notifications Modal */}
      <Modal
        visible={notifModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <Pressable style={localStyles.overlay} onPress={() => setNotifModalVisible(false)}>
          <View style={[localStyles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={localStyles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="notifications" size={18} color={colors.primary} />
                <Text style={[localStyles.modalTitle, { color: colors.textPrimary }]}>Notifications & Alerts</Text>
              </View>
              <Pressable onPress={() => setNotifModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={isDark ? colors.textMuted : '#64748B'} />
              </Pressable>
            </View>

            <View style={localStyles.notifList}>
              {NOTIFICATIONS.map((item) => (
                <View key={item.id} style={[localStyles.notifItem, { backgroundColor: isDark ? colors.surfaceMuted : '#F8F9FB', borderColor: colors.border }]}>
                  <View style={[localStyles.notifIconCircle, { backgroundColor: isDark ? colors.surface : '#EBEBFA' }]}>
                    <Ionicons name={item.icon} size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={localStyles.notifTopRow}>
                      <Text style={[localStyles.notifTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                      <Text style={[localStyles.notifTime, { color: colors.textPlaceholder }]}>{item.time}</Text>
                    </View>
                    <Text style={[localStyles.notifBody, { color: colors.textMuted }]}>{item.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Pressable
              style={[localStyles.closeBtn, { backgroundColor: colors.primary }]}
              onPress={() => setNotifModalVisible(false)}
            >
              <Text style={localStyles.closeBtnText}>Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const localStyles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    elevation: 2,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    zIndex: 1000,
  },
  headerContent: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  leftSection: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: '#F0EFFB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnDisabled: {
    opacity: 0.35,
    backgroundColor: '#F8F9FA',
    borderColor: '#E2E8F0',
  },
  backBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102A54',
    textAlign: 'center',
  },
  logoImage: {
    height: 28,
    width: 110,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  langButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0EFFB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  langText: {
    color: '#3C3985',
    fontWeight: '700',
    fontSize: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F0EFFB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 84, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#102A54',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#102A54',
  },
  scrollView: {
    width: '100%',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8F9FB',
  },
  langRowSelected: {
    backgroundColor: '#EBEBFA',
    borderWidth: 1,
    borderColor: '#3C3985',
  },
  radioContainer: {
    marginRight: 14,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E0',
  },
  radioSelected: {
    borderColor: '#3C3985',
    backgroundColor: '#3C3985',
  },
  langTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nativeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#102A54',
    width: 110,
  },
  labelText: {
    fontSize: 13,
    color: '#718096',
  },
  notifList: {
    gap: 10,
    marginBottom: 16,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8F9FB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EBEBFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#102A54',
  },
  notifTime: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  notifBody: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  closeBtn: {
    backgroundColor: '#3C3985',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
