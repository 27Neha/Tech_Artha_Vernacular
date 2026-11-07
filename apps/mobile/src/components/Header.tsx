import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView, Image } from 'react-native';
import { styles } from '../theme/styles';
import { Screen } from '../types';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  title?: string;
  back?: Screen | boolean;
  onBack?: ((screen?: Screen) => void) | boolean;
  showSettings?: boolean;
  showBack?: boolean;
}

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'mr', label: 'Marathi ', native: 'मराठी' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'as', label: 'Assamese', native: 'অসমীয়া' },
];

export const Header = ({ title, back, onBack, showSettings = true, showBack }: HeaderProps) => {
  const { i18n } = useTranslation();
  const navigation = useNavigation<any>();
  let currentRouteName = '';
  try {
    const route = useRoute<any>();
    currentRouteName = route?.name || '';
  } catch {
    // Navigation container not ready or unmounted
  }
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  
  const currentLangCode = i18n.language || 'en';
  const currentLangObj = LANGUAGES.find(l => l.code === currentLangCode) || LANGUAGES[0];

  const isRootScreen =
    currentRouteName === 'Home' ||
    currentRouteName === 'MainTabs' ||
    currentRouteName === 'Welcome' ||
    currentRouteName === 'Language';

  const shouldShowBack =
    showBack !== undefined
      ? showBack
      : typeof onBack === 'function' ||
        Boolean(back) ||
        (!isRootScreen && navigation.canGoBack());

  const handleBackPress = () => {
    if (typeof onBack === 'function') {
      onBack();
    } else if (typeof back === 'string') {
      navigation.navigate(back);
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs', { screen: 'Home' });
    }
  };

  const handleLogoPress = () => {
    try {
      navigation.navigate('MainTabs', { screen: 'Home' });
    } catch {
      navigation.navigate('Home');
    }
  };

  const handleLanguageSelect = async (code: string) => {
    setModalVisible(false);
    try {
      await i18n.changeLanguage(code);
      await AsyncStorage.setItem('language', code);
    } catch (e) {
      console.log('AsyncStorage error', e);
    }
  };

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: Math.max(insets.top, 16),
          height: 64 + Math.max(insets.top, 16),
          backgroundColor: isDark ? colors.surface : '#FFFFFF',
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: isDark ? colors.border : '#E8E7F5',
          paddingHorizontal: 14,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {shouldShowBack && (
          <Pressable
            onPress={handleBackPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={({ pressed }) => [
              localStyles.backButton,
              {
                backgroundColor: isDark ? colors.surfaceMuted : '#F0EFFB',
                borderColor: isDark ? colors.border : '#DEDBF7',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={isDark ? colors.textPrimary : '#36358D'} />
          </Pressable>
        )}

        <Pressable
          onPress={handleLogoPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ flexDirection: 'row', alignItems: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
        >
          <Image
            source={require('../../assets/logo.png')}
            style={{ height: 32, width: 124 }}
            resizeMode="contain"
          />
        </Pressable>
      </View>
      
      <View style={{ flex: 1, justifyContent: 'center' }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {/* Language Selection Button with Dropdown Indicator */}
        <Pressable 
          onPress={() => setModalVisible(true)} 
          hitSlop={10} 
          style={{ 
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8, 
            backgroundColor: isDark ? colors.surfaceMuted : '#F0EFFB', 
            borderWidth: 1, 
            borderColor: isDark ? colors.border : '#DEDBF7',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4
          }}
        >
          <Text numberOfLines={1} style={[styles.language, { color: isDark ? colors.textPrimary : '#36358D', fontWeight: '700', maxWidth: 70 }]}>{currentLangObj.label}</Text>
          <Ionicons name="chevron-down" size={14} color={isDark ? colors.textPrimary : '#36358D'} />
        </Pressable>

        {/* Settings button on the right of language selection */}
        {showSettings ? (
          <Pressable 
            onPress={() => navigation.navigate('Settings')} 
            hitSlop={10} 
            style={{ 
              padding: 6,
              borderRadius: 8, 
              backgroundColor: isDark ? colors.surfaceMuted : '#F0EFFB', 
              borderWidth: 1, 
              borderColor: isDark ? colors.border : '#DEDBF7',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Ionicons name="settings-outline" size={19} color={isDark ? colors.textPrimary : '#36358D'} />
          </Pressable>
        ) : null}
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={localStyles.overlay} onPress={() => setModalVisible(false)}>
          <View style={[localStyles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <Text style={[localStyles.modalTitle, { color: colors.textPrimary }]}>Select Language</Text>
            <ScrollView style={localStyles.scrollView}>
              {LANGUAGES.map((lang) => {
                const isSelected = currentLangCode === lang.code;
                return (
                  <Pressable 
                    key={lang.code}
                    style={[
                      localStyles.langRow,
                      { backgroundColor: isDark ? colors.surfaceMuted : '#F8F9FB' },
                      isSelected && [localStyles.langRowSelected, { backgroundColor: isDark ? colors.primarySurface : '#EBEBFA', borderColor: '#36358D' }]
                    ]}
                    onPress={() => handleLanguageSelect(lang.code)}
                  >
                    <View style={localStyles.radioContainer}>
                      <View style={[localStyles.radio, { borderColor: colors.border }, isSelected && [localStyles.radioSelected, { borderColor: '#36358D', backgroundColor: '#36358D' }]]} />
                    </View>
                    <View style={localStyles.langTextContainer}>
                      <Text style={[localStyles.nativeText, { color: colors.textPrimary }, isSelected && { color: colors.primary }]}>{lang.native}</Text>
                      <Text style={[localStyles.labelText, { color: colors.textMuted }, isSelected && { color: colors.primary }]}>{lang.label}</Text>
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
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#102A54', marginBottom: 16, textAlign: 'center' },
  scrollView: { width: '100%' },
  langRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, backgroundColor: '#F8F9FB' },
  langRowSelected: { backgroundColor: '#EBEBFA', borderWidth: 1, borderColor: '#36358D' },
  radioContainer: { marginRight: 16 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E0' },
  radioSelected: { borderColor: '#36358D', backgroundColor: '#36358D' },
  langTextContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  nativeText: { fontSize: 16, fontWeight: '700', color: '#102A54', width: 110 },
  labelText: { fontSize: 14, color: '#718096' },
  textSelected: { color: '#36358D' }
});
