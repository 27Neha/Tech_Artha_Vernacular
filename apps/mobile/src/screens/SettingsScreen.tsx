import React, { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api/client';
import { useAuth } from '../store/AuthContext';
import { useTranslation } from '../i18n/TranslationContext';
import { Language } from '../i18n/translations';

/**
 * Ported from apps/web/app/dashboard/settings.
 *
 * The web page also carries a push-notification toggle, an app-theme picker and three
 * buttons that alert "configuration coming soon". None are backed by anything, so they
 * are left out rather than shipped as controls that do nothing - there is no push
 * infrastructure and no dark theme to switch to.
 *
 * What remains is what actually works: language, the regulatory disclosure, and sign out.
 */
const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
];

type Disclosure = { content?: string; version?: string; note?: string };

export const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  const { lang, setLang, t } = useTranslation();
  const [disclosure, setDisclosure] = useState<Disclosure | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Disclosure>(`/disclosures/market-risk?locale=${lang}`, { anonymous: true })
      .then((data) => !cancelled && setDisclosure(data))
      .catch(() => undefined); // The static fallback below still shows the warning.
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'You will need your mobile number and an OTP to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Language</Text>
        <View style={styles.card}>
          {LANGUAGES.map((option, index) => (
            <Pressable
              key={option.code}
              onPress={() => setLang(option.code)}
              style={[styles.row, index < LANGUAGES.length - 1 && styles.rowDivider]}
            >
              <Text style={styles.rowLabel}>{option.label}</Text>
              {lang === option.code ? <Text style={styles.tick}>✓</Text> : null}
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Pressable style={[styles.row, styles.rowDivider]} onPress={() => navigation.navigate('EditProfile')}>
            <Text style={styles.rowLabel}>Edit profile</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={confirmSignOut}>
            <Text style={[styles.rowLabel, styles.destructive]}>Sign out</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.disclosureCard}>
          <Text style={styles.disclosureText}>{disclosure?.content ?? t('disclaimer')}</Text>
          {disclosure?.note ? <Text style={styles.disclosureNote}>{disclosure.note}</Text> : null}
        </View>

        <Text style={styles.version}>
          TechArtha {Constants.expoConfig?.version ?? '1.0.0'}
          {disclosure?.version ? ` · disclosure ${disclosure.version}` : ''}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 12 },
  headerTitle: { color: '#102A54', fontSize: 24, fontWeight: '800' },
  content: { paddingHorizontal: 20 },
  sectionTitle: { color: '#718096', fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginTop: 24, marginBottom: 8, textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  rowLabel: { color: '#2D3748', fontSize: 15, fontWeight: '600' },
  destructive: { color: '#C53030' },
  tick: { color: '#3C3985', fontWeight: '800', fontSize: 16 },
  chevron: { color: '#A0AEC0', fontSize: 22, fontWeight: '700' },
  disclosureCard: { backgroundColor: '#EBEAF8', borderRadius: 16, padding: 16 },
  disclosureText: { color: '#3C3985', fontSize: 12, lineHeight: 18 },
  disclosureNote: { color: '#4A5568', fontSize: 11, lineHeight: 16, marginTop: 10 },
  version: { color: '#A0AEC0', fontSize: 11, textAlign: 'center', marginTop: 24, marginBottom: 40 },
});
