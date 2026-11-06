import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView, Image } from 'react-native';
import { Screen } from '../types';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
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
  title,
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

  // Determine back button visibility: visible across all screens unless explicitly hidden
  const shouldShowBack = showBack !== undefined ? showBack : !hideBack;

  // On Home screen, if there is no previous history to return to, back button is visually disabled
  const isHomeRoot = routeName === 'Home';
  const isBackDisabled = isHomeRoot && !canBack;

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
          height: 58 + insets.top,
        },
      ]}
    >
      <View style={localStyles.headerContent}>
        {/* Left Section: Back Button (44x44 dp) or Placeholder */}
        <View style={localStyles.leftSection}>
          {shouldShowBack ? (
            <Pressable
              onPress={handleBack}
              disabled={isBackDisabled}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                localStyles.backBtn,
                isBackDisabled && localStyles.backBtnDisabled,
              ]}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              accessibilityState={{ disabled: isBackDisabled }}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={isBackDisabled ? '#94A3B8' : '#102A54'}
              />
            </Pressable>
          ) : (
            <View style={localStyles.backBtnPlaceholder} />
          )}
        </View>

        {/* Centre Section: Always Present TechArtha Company Logo */}
        <View style={localStyles.centerSection}>
          <Image
            source={require('../../assets/logo.png')}
            style={localStyles.logoImage}
            resizeMode="contain"
          />
          {title ? (
            <Text style={localStyles.centerSubtitle} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>

        {/* Right Section: Language, Notifications, Settings */}
        <View style={localStyles.rightSection}>
          {showLanguage && (
            <Pressable
              onPress={() => setLangModalVisible(true)}
              hitSlop={8}
              style={localStyles.langButton}
              accessibilityLabel="Change language"
              accessibilityRole="button"
            >
              <Text style={localStyles.langText}>{currentLangObj.label}</Text>
              <Ionicons name="chevron-down" size={12} color="#3C3985" />
            </Pressable>
          )}

          {showNotifications && (
            <Pressable
              onPress={() => setNotifModalVisible(true)}
              hitSlop={8}
              style={localStyles.iconButton}
              accessibilityLabel="Notifications"
              accessibilityRole="button"
            >
              <Ionicons name="notifications-outline" size={19} color="#3C3985" />
              <View style={localStyles.unreadDot} />
            </Pressable>
          )}

          {showSettings && (
            <Pressable
              onPress={onSettingsPress || (() => navigation.navigate('Settings'))}
              hitSlop={8}
              style={localStyles.iconButton}
              accessibilityLabel="Settings"
              accessibilityRole="button"
            >
              <Ionicons name="settings-outline" size={19} color="#3C3985" />
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
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftSection: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
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
    width: 44,
    height: 44,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  logoImage: {
    height: 26,
    width: 102,
  },
  centerSubtitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 1,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
  textSelected: {
    color: '#3C3985',
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
