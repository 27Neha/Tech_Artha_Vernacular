import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

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

export const LanguageSettingsScreen = () => {
  const { i18n } = useTranslation('common');
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

  const handleLanguageSelect = async (code: string) => {
    setCurrentLang(code);
    await i18n.changeLanguage(code);
    await AsyncStorage.setItem('userLanguage', code);
    await AsyncStorage.setItem('language', code);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title="Language Selection" onBack={() => navigation.goBack()} showSettings={false} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>App Language</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Choose your preferred language for all mutual fund schemes, risk assessments, and investment guides.
          </Text>
        </View>

        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF', borderColor: colors.border }]}>
          <Ionicons name="language" size={22} color={colors.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBannerTitle, { color: colors.primary }]}>Vernacular Financial Empowerment</Text>
            <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
              TechArtha supports 12 Indian regional languages to democratize wealth creation across Bharat.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Available Languages (12)</Text>
        <View style={styles.langList}>
          {SUPPORTED_LANGUAGES.map(lang => {
            const isSelected = currentLang === lang.code;
            return (
              <Pressable
                key={lang.code}
                style={[
                  styles.langCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border
                  },
                  isSelected && {
                    backgroundColor: isDark ? colors.surfaceElevated : '#FBFBFE'
                  }
                ]}
                onPress={() => handleLanguageSelect(lang.code)}
              >
                <View style={styles.langLeft}>
                  <Text style={[
                    styles.langNative,
                    { color: colors.textPrimary },
                    isSelected && { color: colors.primary }
                  ]}>
                    {lang.nativeName}
                  </Text>
                  <Text style={[styles.langName, { color: colors.textMuted }]}>{lang.name}</Text>
                </View>

                {isSelected ? (
                  <View style={styles.activeCheck}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  </View>
                ) : (
                  <View style={[styles.inactiveCircle, { borderColor: colors.border }]} />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  headerBlock: { marginBottom: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', marginBottom: 6 },
  pageSubtitle: { fontSize: 13, lineHeight: 18 },

  infoBanner: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  infoBannerTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  infoBannerText: { fontSize: 12, lineHeight: 17 },

  sectionHeading: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  langList: { gap: 10 },

  langCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 16, padding: 16, borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1 },
  langLeft: { gap: 2 },
  langNative: { fontSize: 16, fontWeight: '800' },
  langName: { fontSize: 12, fontWeight: '500' },

  activeCheck: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  inactiveCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 }
});
