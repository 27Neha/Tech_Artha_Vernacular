import React from 'react';
import { SafeAreaView, View, Text, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { styles } from '../theme/styles';
import { Screen } from '../types';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

export const WelcomeScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safe}>
    <StatusBar style="dark" />
    <View style={styles.welcome}>
      <View style={styles.logoWrapper}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>T</Text>
          <View style={styles.logoAccent} />
        </View>
        <View style={styles.brandContainer}>
          <View style={styles.brandRow}>
            <Text style={styles.brandBlue}>Tech</Text>
            <Text style={styles.brandOrange}>Artha</Text>
          </View>
          <Text style={styles.brandTagline}>{t('welcome.financeSimplified', 'FINANCE SIMPLIFIED')}</Text>
        </View>
      </View>
      <Text style={styles.hero}>{t('welcome.hero', 'Your money,\nmade simple.')}</Text>
      <Text style={styles.subhero}>{t('welcome.startYourWealth', 'Learn, plan and invest with confidence — in a language that feels like home.')}</Text>
      <View style={styles.trustRow}>
        <Text>🛡️ {t('welcome.badge1', 'Safe & secure')}</Text>
        <Text>•</Text>
        <Text>🇮🇳 {t('welcome.badge3', 'Made for India')}</Text>
      </View>
      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.primaryText}>{t('minor.startMyJourney', 'Start your journey').replace(' 🚀', '')}</Text>
        <Text style={styles.primaryText}>→</Text>
      </Pressable>
      <Text style={styles.legal}>{t('disclaimer', 'Mutual fund investments are subject to market risks.')}</Text>
    </View>
  </SafeAreaView>
  );
};
