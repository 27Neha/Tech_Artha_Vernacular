import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

export const TermsScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation('common');
  const { colors, isDark } = useTheme();

  const sections = [
    {
      title: '1. Acceptance of Terms',
      text: 'By creating an account, linking your KYC or bank details, or accessing TechArtha services, you agree to be bound by these Terms & Conditions, the Investment Advisory/Execution Agreement, and our Privacy Policy. If you do not agree, you must cease using the application.',
    },
    {
      title: '2. User Eligibility & Account Security',
      text: 'You must provide accurate and verifiable information during onboarding. Your account is for your personal use only. You are solely responsible for maintaining the confidentiality of your credentials, device PIN, and transaction OTPs. TechArtha is never liable for losses caused by unauthorized credential sharing.',
    },
    {
      title: '3. Minor & Guardian Responsibility',
      text: 'If an investment folio or account is initiated on behalf of a minor, the parent or appointed legal guardian must provide valid consent and submit their own verified KYC documentation. The guardian is legally responsible for ensuring that all data submitted is accurate, and all transactions remain strictly subject to SEBI minor investment regulations without independent bypass.',
    },
    {
      title: '4. KYC & Identity Verification',
      text: 'All mutual fund investment transactions require mandatory KYC verification under Prevention of Money Laundering Act (PMLA) and SEBI rules. You agree to provide valid and authentic PAN, Aadhaar (via DigiLocker or offline XML), address proof, and bank statements as required.',
    },
    {
      title: '5. Investment Transactions & Orders',
      text: 'All transactions—including lumpsum investments, systematic investment plans (SIPs), switches, and redemptions—are executed only upon your explicit authentication and consent. NAV allocation is governed by exchange cut-off times and funds realization rules established by SEBI and clearing corporations.',
    },
    {
      title: '6. Investment Risks & No Guarantees',
      text: 'Mutual fund investments are subject to market risks. Past performance of any fund, AMC, or model portfolio is not indicative of future returns. TechArtha does not promise, warrant, or guarantee any minimum or fixed returns.',
    },
    {
      title: '7. Educational Information & Nudges',
      text: 'Analytical tools, fund comparisons, and vernacular informational nudges provided within TechArtha are for educational and self-directed decision support only. They do not constitute an explicit solicitation to buy or sell any particular security.',
    },
    {
      title: '8. Auto-Debit Mandates & SIP Execution',
      text: 'By authorizing a UPI Autopay or e-NACH mandate, you authorize TechArtha and payment aggregators to instruct your bank to debit the designated SIP instalment amount on scheduled dates. You can pause or cancel mandates anytime through the Mandates section.',
    },
    {
      title: '9. Dispute Resolution & Jurisdiction',
      text: 'These terms are governed by the laws of India. Any legal dispute arising out of or in connection with TechArtha services shall be subject to the exclusive jurisdiction of the competent courts in India.',
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Terms & Conditions</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>User Agreement & Execution Covenants</Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name="document-text" size={14} color="#3C3985" />
          <Text style={styles.badgeText}>Legal</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.banner, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE', borderColor: '#DDD6FE' }]}>
          <Ionicons name="shield-outline" size={20} color="#5B21B6" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.bannerTitle}>SEBI & AMFI Registered Framework</Text>
            <Text style={styles.bannerText}>
              All transactions executed on TechArtha follow regulated execution agreements and clearing rules.
            </Text>
          </View>
        </View>

        {sections.map((sec, idx) => (
          <View key={idx} style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{sec.title}</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>{sec.text}</Text>
          </View>
        ))}

        <View style={styles.footerNote}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            TechArtha Fintech Solutions Pvt. Ltd. • AMFI ARN-284912{'\n'}
            Contact: legal@techartha.com • support@techartha.com
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
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3C3985',
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
    color: '#5B21B6',
  },
  bannerText: {
    fontSize: 12,
    color: '#6D28D9',
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
