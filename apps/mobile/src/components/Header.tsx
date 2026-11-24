import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Screen } from '../types';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TechArthaLogo } from './TechArthaLogo';
import {
  navigationRef,
  canGlobalGoBack,
  handleGlobalBack,
  registerActiveModal,
  subscribeNavigationHistory,
} from '../navigation/navigationService';

export interface HeaderProps {
  title?: string;
  back?: Screen;
  onBack?: (screen?: any) => void;
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
  onBack,
  showBack,
  hideBack = false,
  showSettings = true,
  showNotifications = true,
  showLanguage = true,
  onSettingsPress,
  route: routeProp,
}) => {
  const { i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

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

  // Determine back button visibility: hidden on initial root Welcome screen via hideBack
  const shouldShowBack = showBack !== undefined ? showBack : !hideBack;

  // On Home screen, if there is no previous history to return to, back button is visually disabled
  const isHomeRoot = routeName === 'Home';
  const isBackDisabled = isHomeRoot && !canBack;

  // Keep standardized 144x37 logo completely uncrushed on narrower viewports or long language names when Back + Settings coexist
  const useCompactLanguageLabel =
    shouldShowBack &&
    showSettings &&
    (screenWidth < 415 || currentLangObj.label.length > 7);
  const isNarrowHeader = shouldShowBack && showSettings && screenWidth < 380;
  const languageDisplayText = useCompactLanguageLabel
    ? currentLangObj.code.toUpperCase()
    : currentLangObj.label;

  // Intelligent back navigation respecting actual history, modals, unsaved changes, and nested stacks
  const handleBack = () => {
    handleGlobalBack(onBack);
  };

  return (
    <View
      style={[
        localStyles.headerContainer,
        {
          paddingTop: insets.top,
          height: 60 + insets.top,
        },
      ]}
    >
      <View
        style={[
          localStyles.headerContent,
          isNarrowHeader && localStyles.headerContentNarrow,
        ]}
      >
        {/* Left Section: Optional Back Button + Complete Standardized TechArtha Logo Lockup */}
        <View
          style={[
            localStyles.leftGroup,
            isNarrowHeader && localStyles.leftGroupNarrow,
          ]}
        >
          {shouldShowBack ? (
            <Pressable
              testID="header-back-button"
              onPress={handleBack}
              disabled={isBackDisabled}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[
                localStyles.backBtn,
                isNarrowHeader && localStyles.backBtnNarrow,
                isBackDisabled && localStyles.backBtnDisabled,
              ]}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              accessibilityState={{ disabled: isBackDisabled }}
            >
              <Ionicons
                name="arrow-back"
                size={isNarrowHeader ? 18 : 20}
                color={isBackDisabled ? '#94A3B8' : '#102A54'}
              />
            </Pressable>
          ) : null}

          <TechArthaLogo size="header" />
        </View>

        {/* Right Section: Language, Notifications, Settings */}
        <View
          style={[
            localStyles.rightSection,
            isNarrowHeader && localStyles.rightSectionNarrow,
          ]}
        >
          {showLanguage && (
            <Pressable
              testID="header-language-button"
              onPress={() => setLangModalVisible(true)}
              hitSlop={8}
              style={[
                localStyles.langButton,
                isNarrowHeader && localStyles.langButtonNarrow,
              ]}
              accessibilityLabel="Change language"
              accessibilityRole="button"
            >
              <Ionicons
                name="globe-outline"
                size={isNarrowHeader ? 13 : 14}
                color="#36358D"
              />
              <Text
                style={[
                  localStyles.langText,
                  isNarrowHeader && localStyles.langTextNarrow,
                ]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
              >
                {languageDisplayText}
              </Text>
              <Ionicons
                name="chevron-down"
                size={isNarrowHeader ? 10 : 12}
                color="#36358D"
              />
            </Pressable>
          )}

          {showNotifications && (
            <Pressable
              testID="header-notifications-button"
              onPress={() => setNotifModalVisible(true)}
              hitSlop={8}
              style={[
                localStyles.iconButton,
                isNarrowHeader && localStyles.iconButtonNarrow,
              ]}
              accessibilityLabel="Notifications"
              accessibilityRole="button"
            >
              <Ionicons
                name="notifications-outline"
                size={isNarrowHeader ? 17 : 19}
                color="#36358D"
              />
              <View style={localStyles.unreadDot} />
            </Pressable>
          )}

          {showSettings && (
            <Pressable
              testID="header-settings-button"
              onPress={onSettingsPress || (() => navigation.navigate('Settings'))}
              hitSlop={8}
              style={[
                localStyles.iconButton,
                isNarrowHeader && localStyles.iconButtonNarrow,
              ]}
              accessibilityLabel="Settings"
              accessibilityRole="button"
            >
              <Ionicons
                name="settings-outline"
                size={isNarrowHeader ? 17 : 19}
                color="#36358D"
              />
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
          <View style={localStyles.modalContent}>
            <View style={localStyles.modalHeader}>
              <Text style={localStyles.modalTitle}>Select Language</Text>
              <Pressable onPress={() => setLangModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView style={localStyles.scrollView} showsVerticalScrollIndicator={false}>
              {LANGUAGES.map((lang) => {
                const isSelected = currentLangCode === lang.code;
                return (
                  <Pressable
                    key={lang.code}
                    style={[localStyles.langRow, isSelected && localStyles.langRowSelected]}
                    onPress={() => handleLanguageSelect(lang.code)}
                  >
                    <View style={localStyles.radioContainer}>
                      <View style={[localStyles.radio, isSelected && localStyles.radioSelected]} />
                    </View>
                    <View style={localStyles.langTextContainer}>
                      <Text style={[localStyles.nativeText, isSelected && localStyles.textSelected]}>
                        {lang.native}
                      </Text>
                      <Text style={[localStyles.labelText, isSelected && localStyles.textSelected]}>
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
          <View style={localStyles.modalContent}>
            <View style={localStyles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="notifications" size={18} color="#3C3985" />
                <Text style={localStyles.modalTitle}>Notifications & Alerts</Text>
              </View>
              <Pressable onPress={() => setNotifModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <View style={localStyles.notifList}>
              {NOTIFICATIONS.map((item) => (
                <View key={item.id} style={localStyles.notifItem}>
                  <View style={localStyles.notifIconCircle}>
                    <Ionicons name={item.icon} size={18} color="#3C3985" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={localStyles.notifTopRow}>
                      <Text style={localStyles.notifTitle}>{item.title}</Text>
                      <Text style={localStyles.notifTime}>{item.time}</Text>
                    </View>
                    <Text style={localStyles.notifBody}>{item.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Pressable
              style={localStyles.closeBtn}
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
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  headerContentNarrow: {
    paddingHorizontal: 10,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  leftGroupNarrow: {
    gap: 5,
  },
  backBtn: {
    width: 38,
    height: 38,
    minWidth: 38,
    minHeight: 38,
    borderRadius: 11,
    backgroundColor: '#F0EFFB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnNarrow: {
    width: 32,
    height: 32,
    minWidth: 32,
    minHeight: 32,
    borderRadius: 9,
  },
  backBtnDisabled: {
    opacity: 0.35,
    backgroundColor: '#F8F9FA',
    borderColor: '#E2E8F0',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    flexShrink: 0,
  },
  rightSectionNarrow: {
    gap: 4,
  },
  langButton: {
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F0EFFB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langButtonNarrow: {
    height: 30,
    paddingHorizontal: 5,
    borderRadius: 7,
    gap: 2,
  },
  langText: {
    color: '#36358D',
    fontWeight: '800',
    fontSize: 12,
    includeFontPadding: false,
  },
  langTextNarrow: {
    fontSize: 11,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F0EFFB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconButtonNarrow: {
    width: 30,
    height: 30,
    borderRadius: 7,
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
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#F6F7FC',
    borderWidth: 1,
    borderColor: '#E6E8F6',
  },
  langRowSelected: {
    backgroundColor: '#EEEDFA',
    borderWidth: 1.5,
    borderColor: '#36358D',
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
    backgroundColor: '#FFFFFF',
  },
  radioSelected: {
    borderColor: '#36358D',
    backgroundColor: '#36358D',
  },
  langTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nativeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#102A54',
    width: 110,
  },
  labelText: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '600',
  },
  textSelected: {
    color: '#36358D',
    fontWeight: '800',
  },
  notifList: {
    gap: 10,
    marginBottom: 16,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E8F6',
    elevation: 1,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  notifIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EEEDFA',
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
    backgroundColor: '#36358D',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#36358D',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
