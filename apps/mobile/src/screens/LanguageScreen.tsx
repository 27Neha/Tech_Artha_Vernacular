import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TechArthaLogo } from '../components/TechArthaLogo';

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
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'as', label: 'Assamese', native: 'অসমীয়া' },
];

export const LanguageScreen = () => {
  const { t, i18n } = useTranslation('common');
  const navigation = useNavigation<any>();
  const [selected, setSelected] = useState<string>(i18n.language || 'en');

  const handleLanguageSelect = async (code: string) => {
    setSelected(code);
    try {
      await i18n.changeLanguage(code);
      await AsyncStorage.setItem('language', code);
    } catch (e) {
      console.log('AsyncStorage error handled gracefully:', e);
    }
  };

  const handleContinue = () => {
    if (selected) {
      navigation.navigate('Welcome');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.logoWrapper}>
            <TechArthaLogo size="medium" />
          </View>

          <View style={styles.pillContainer}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{t('welcome.welcomeToTechArtha', { defaultValue: 'WELCOME TO TECHARTHA' }).toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.title}>
            {t('welcome.financeSimplified', { defaultValue: 'Finance, simplified.' })}{'\n'}
            <Text style={styles.titleHighlight}>{t('welcome.nowInYourLanguage', { defaultValue: 'Now in your language' })}</Text>
          </Text>

          <Text style={styles.subtitle}>
            {t('welcome.startYourWealth', { defaultValue: 'Start your wealth creation journey with the easiest mutual fund app.' })}
          </Text>
          
          <View style={styles.grid}>
            {LANGUAGES.map((lang) => {
              const isSelected = selected === lang.code;
              return (
                <Pressable 
                  key={lang.code}
                  style={[styles.card, isSelected && styles.cardSelected]}
                  onPress={() => handleLanguageSelect(lang.code)}
                >
                  <View style={[styles.radio, isSelected && styles.radioSelected]} />
                  <Text style={[styles.native, isSelected && styles.nativeSelected]}>{lang.native}</Text>
                  <Text style={styles.label}>{lang.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable 
            style={[styles.continueButton, !selected && styles.continueButtonDisabled]} 
            onPress={handleContinue} 
            disabled={!selected}
          >
            <Text style={styles.continueText}>{t('signup.continue', { defaultValue: 'Continue' })}</Text>
            <Text style={styles.continueArrow}>→</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FD' },
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 32, paddingBottom: 110 },
  logoWrapper: { alignItems: 'center', marginBottom: 20, marginTop: 8 },
  pillContainer: { alignItems: 'center', marginBottom: 14 },
  pill: { backgroundColor: '#EEF0FB', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#E0E3FA' },
  pillText: { color: '#36358D', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  title: { fontSize: 27, fontWeight: '900', color: '#102A54', textAlign: 'center', marginBottom: 8, lineHeight: 34, letterSpacing: -0.3 },
  titleHighlight: { color: '#36358D' },
  subtitle: { fontSize: 13.5, color: '#64748B', textAlign: 'center', marginBottom: 26, paddingHorizontal: 16, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  card: { backgroundColor: '#FFFFFF', width: '48%', padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#EDF2F7', alignItems: 'center', justifyContent: 'center', position: 'relative', elevation: 2, shadowColor: '#102A54', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
  cardSelected: { borderColor: '#36358D', backgroundColor: '#F4F5FD' },
  radio: { position: 'absolute', top: 12, right: 12, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' },
  radioSelected: { borderColor: '#36358D', backgroundColor: '#36358D' },
  native: { fontSize: 18, fontWeight: '800', color: '#102A54', marginTop: 14, marginBottom: 4 },
  nativeSelected: { color: '#36358D' },
  label: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.96)', padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  continueButton: { backgroundColor: '#36358D', paddingVertical: 15, paddingHorizontal: 24, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#36358D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
  continueButtonDisabled: { opacity: 0.45 },
  continueText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginRight: 8 },
  continueArrow: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' }
});

export default LanguageScreen;
