import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
            <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
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
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 40, paddingBottom: 100 },
  logoWrapper: { alignItems: 'center', marginBottom: 24, marginTop: 12 },
  logoImage: { height: 40, width: 180 },
  pillContainer: { alignItems: 'center', marginBottom: 16 },
  pill: { backgroundColor: '#EBEBFA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E0E7FF' },
  pillText: { color: '#3C3985', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '800', color: '#102A54', textAlign: 'center', marginBottom: 12, lineHeight: 36 },
  titleHighlight: { color: '#3C3985' },
  subtitle: { fontSize: 14, color: '#718096', textAlign: 'center', marginBottom: 32, paddingHorizontal: 16, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  card: { backgroundColor: '#fff', width: '48%', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cardSelected: { borderColor: '#3C3985', backgroundColor: '#EBEBFA' },
  radio: { position: 'absolute', top: 12, right: 12, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#CBD5E0', backgroundColor: '#fff' },
  radioSelected: { borderColor: '#3C3985', backgroundColor: '#3C3985' },
  native: { fontSize: 18, fontWeight: '700', color: '#102A54', marginTop: 16, marginBottom: 4 },
  nativeSelected: { color: '#3C3985' },
  label: { fontSize: 12, color: '#A0AEC0' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.95)', padding: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  continueButton: { backgroundColor: '#3C3985', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  continueButtonDisabled: { opacity: 0.5 },
  continueText: { color: 'white', fontSize: 16, fontWeight: '700', marginRight: 8 },
  continueArrow: { color: 'white', fontSize: 18, fontWeight: '700' }
});

export default LanguageScreen;
