import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AnimatedHeroVisual from '../components/AnimatedHeroVisual';
import { Header } from '../components/Header';

export const WelcomeScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation('common');
  
  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.content}>
          
          <Text style={styles.title}>
            {t('welcome.title', { defaultValue: 'Invest in your future, simply and securely.' })}
          </Text>

          <Text style={styles.desc}>
            {t('welcome.desc', { defaultValue: 'Smart, tailored mutual fund portfolios designed just for you.' })}
          </Text>

          {/* Abstract Growth Visual placed creatively below intro */}
          <AnimatedHeroVisual />

          {/* Badges */}
          <View style={styles.badgesWrapper}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🔒 AMFI Registered</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🏦 SEBI Compliant</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🇮🇳 Made for India</Text>
            </View>
          </View>

          {/* Hero Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#EBEBFA', borderColor: '#D4E2F9' }]}>
              <Text style={[styles.statValue, { color: '#3C3985' }]}>50K+</Text>
              <Text style={styles.statLabel}>{t('welcome.stat1', { defaultValue: 'Happy Investors' })}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FFF4E8', borderColor: '#FBD38D' }]}>
              <Text style={[styles.statValue, { color: '#DD6B20' }]}>Rs.1200Cr+</Text>
              <Text style={styles.statLabel}>{t('welcome.stat2', { defaultValue: 'Assets Managed' })}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.primaryText}>{t('welcome.start', { defaultValue: 'Start Investing' })}</Text>
            <Text style={styles.primaryArrow}>-&gt;</Text>
          </Pressable>

          <Pressable style={styles.outlineButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.outlineText}>{t('welcome.login', { defaultValue: 'I already have an account' })}</Text>
          </Pressable>

          <Text style={styles.disclaimer}>
            {t('disclaimer', { defaultValue: 'Mutual Fund investments are subject to market risks, read all scheme related documents carefully.' })}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 16, paddingTop: 16, justifyContent: 'space-between' },
  content: { marginTop: 0 },
  logoWrapper: { marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoImage: { height: 36, width: 160 },
  title: { fontSize: 26, fontWeight: '800', color: '#102A54', lineHeight: 32, marginTop: 16, marginBottom: 12 },
  desc: { fontSize: 13, color: '#718096', lineHeight: 20, marginBottom: 4 },
  badgesWrapper: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 24, paddingHorizontal: 0 },
  badge: { backgroundColor: '#fff', paddingHorizontal: 4, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, flex: 1, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '800', color: '#102A54', textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1 },
  statValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#4A5568' },
  actions: { marginTop: 8, marginBottom: 12 },
  primaryButton: { backgroundColor: '#3C3985', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  primaryText: { color: 'white', fontSize: 14, fontWeight: '800', marginRight: 8 },
  primaryArrow: { color: 'white', fontSize: 16, fontWeight: '800' },
  outlineButton: { backgroundColor: 'transparent', paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: '#CBD5E0', alignItems: 'center', marginBottom: 16 },
  outlineText: { color: '#4A5568', fontSize: 14, fontWeight: '700' },
  disclaimer: { fontSize: 10, color: '#718096', textAlign: 'center', lineHeight: 14, fontWeight: '600' }
});
