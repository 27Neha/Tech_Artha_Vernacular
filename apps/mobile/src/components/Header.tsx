import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TechArthaLogo } from './TechArthaLogo';
import { colors, radii } from '../theme/tokens';

export interface HeaderProps {
  title?: string;
  back?: string;
  onBack?: () => void;
  showLogo?: boolean;
  logoSize?: 'small' | 'medium' | 'large';
  showSettings?: boolean;
  onSettingsPress?: () => void;
  showLanguage?: boolean;
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

export const Header: React.FC<HeaderProps> = ({
  title,
  onBack,
  showLogo,
  logoSize = 'medium',
  showSettings = true,
  onSettingsPress,
  showLanguage = true,
}) => {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [modalVisible, setModalVisible] = useState(false);

  const shouldShowLogo = showLogo !== undefined ? showLogo : !title;

  const currentLangCode = i18n.language || 'en';
  const currentLangObj = LANGUAGES.find((l) => l.code === currentLangCode) || LANGUAGES[0];

  const handleLanguageSelect = async (code: string) => {
    setModalVisible(false);
    try {
      await i18n.changeLanguage(code);
      await AsyncStorage.setItem('language', code);
    } catch (e) {
      console.log('AsyncStorage error', e);
    }
  };

  const handleSettings = () => {
    if (onSettingsPress) {
      onSettingsPress();
    } else {
      try {
        navigation.navigate('Settings');
      } catch (e) {
        console.log('Navigation to settings not available', e);
      }
    }
  };

  return (
    <View
      style={[
        localStyles.headerContainer,
        {
          paddingTop: Math.max(insets.top, 12),
          height: 60 + Math.max(insets.top, 12),
        },
      ]}
    >
      {/* Left Section: Back button and/or Logo or Title */}
      <View style={localStyles.leftSection}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={localStyles.backButton}>
            <Text style={localStyles.backArrow}>‹</Text>
          </Pressable>
        ) : null}

        {shouldShowLogo ? (
          <TechArthaLogo size={logoSize} />
        ) : title ? (
          <Text style={localStyles.titleText} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>

      {/* Right Controls: Non-overlapping Language Pill & Settings Button */}
      <View style={localStyles.rightControls}>
        {showLanguage && (
          <Pressable
            onPress={() => setModalVisible(true)}
            hitSlop={8}
            style={localStyles.languagePill}
          >
            <Text style={localStyles.languagePillText}>🌐 {currentLangObj.label}</Text>
            <Text style={localStyles.languagePillChevron}>▾</Text>
          </Pressable>
        )}

        {showSettings && (
          <Pressable
            onPress={handleSettings}
            hitSlop={8}
            style={({ pressed }) => [
              localStyles.settingsButton,
              pressed && { opacity: 0.7, backgroundColor: '#EDF2F7' },
            ]}
            accessibilityLabel="Settings"
          >
            <Text style={localStyles.settingsIcon}>⚙️</Text>
          </Pressable>
        )}
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={localStyles.overlay} onPress={() => setModalVisible(false)}>
          <View style={localStyles.modalContent}>
            <Text style={localStyles.modalTitle}>Select Language</Text>
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
    </View>
  );
};

const localStyles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: '#102A54',
    fontWeight: '300',
    marginTop: -4,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#102A54',
    letterSpacing: -0.3,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    gap: 4,
  },
  languagePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C05621',
  },
  languagePillChevron: {
    fontSize: 10,
    color: '#C05621',
    fontWeight: '700',
  },
  settingsButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8F9FD',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 84, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxHeight: '75%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#102A54',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 16,
    textAlign: 'center',
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
    backgroundColor: '#F8F9FD',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  langRowSelected: {
    backgroundColor: '#EEF0FB',
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
    borderColor: '#CBD5E1',
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
    justifyContent: 'space-between',
  },
  nativeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#102A54',
  },
  labelText: {
    fontSize: 13,
    color: '#64748B',
  },
  textSelected: {
    color: '#36358D',
  },
});

export default Header;
