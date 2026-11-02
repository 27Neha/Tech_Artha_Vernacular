import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

export const PrivacyPolicyScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation('common');
  const { colors, isDark } = useTheme();

  const sections = [
    {
      title: '1. Information We Collect',
      text: 'We collect personal identification details (name, email address, mobile number), government identity and KYC documents (such as PAN and proof of address where required), and investment transaction records. Technical and device information (IP address, operating system, device identifiers) may also be logged to protect account security and prevent unauthorized access.',
    },
    {
      title: '2. Purpose and Use of Information',
      text: 'Your information is used strictly to create and administer your account, complete mandatory KYC verification, process authorized mutual fund and investment transactions, generate portfolio analytics and informational Nudges, provide customer support, and fulfill statutory and regulatory obligations.',
    },
    {
      title: '3. Sharing with Authorized Service Providers',
      text: 'TechArtha does not sell or rent your personal information. Information is shared only with authorized third-party partners—including Asset Management Companies (AMCs), RTAs (CAMS, KFintech), SEBI-regulated intermediaries (BSE StAR MF, Cybrilla), payment gateway partners, and KYC verification agencies—solely to the extent required to execute your requests and meet regulatory requirements.',
    },
    {
      title: '4. Data Security & Storage',
      text: 'We maintain industry-standard administrative, technical, and physical safeguards designed to protect personal and financial data against unauthorized access, loss, or misuse. Transmission of sensitive data is protected using AES-256 and TLS 1.3 encryption protocols. Bank credentials and card numbers are never stored on our servers.',
    },
    {
      title: '5. Communication & Authentication Data',
      text: 'Authentication OTPs, service alerts, and transaction notifications transmitted via SMS, WhatsApp, or Email are logged to maintain secure audit trails and support verification services in compliance with RBI and SEBI security guidelines.',
    },
    {
      title: '6. Data Retention & Account Closure',
      text: 'Your personal and transaction records are retained for as long as your account remains active or as required by applicable regulatory and legal compliance mandates (e.g. SEBI 8-year record-keeping guidelines). Upon account closure, records are maintained or deleted in strict compliance with applicable statutory retention requirements.',
    },
    {
      title: '7. User Privacy Rights',
      text: 'You may review and update your profile details through the app settings. Where permitted by applicable law and regulatory norms, you may submit requests regarding your personal data to our privacy compliance officer.',
    },
    {
      title: '8. Policy Updates & Privacy Contact',
      text: 'TechArtha may update this Privacy Policy periodically to reflect technological, operational, or regulatory changes. For any privacy queries or data handling concerns, please contact our privacy desk at privacy@techartha.com or support@techartha.com.',
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top', 'right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Privacy Policy</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Data Protection & KYC Covenants</Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={14} color="#059669" />
          <Text style={styles.badgeText}>AES-256</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Info Banner */}
        <View style={[styles.banner, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', borderColor: '#C7D2FE' }]}>
          <Ionicons name="lock-closed" size={20} color="#4338CA" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.bannerTitle}>Your Data is Fully Protected</Text>
            <Text style={styles.bannerText}>
              TechArtha enforces bank-grade security protocols. We do not sell or monetize personal information.
            </Text>
          </View>
        </View>

        {/* Policy Sections */}
        {sections.map((sec, idx) => (
          <View key={idx} style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{sec.title}</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>{sec.text}</Text>
          </View>
        ))}

        <View style={styles.footerNote}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Last updated: October 2026 • TechArtha Fintech Solutions Pvt. Ltd.{'\n'}
            SEBI Reg. AMFI ARN-284912
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3730A3',
  },
  bannerText: {
    fontSize: 12,
    color: '#4338CA',
    marginTop: 2,
    lineHeight: 16,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 13,
    lineHeight: 20,
  },
  footerNote: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
