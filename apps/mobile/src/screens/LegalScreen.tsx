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
import { TermsModal } from '../components/TermsModal';
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal';
import { RiskDisclosuresModal } from '../components/RiskDisclosuresModal';
import { useTheme } from '../context/ThemeContext';

export const LegalScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const [termsVisible, setTermsVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [disclosuresVisible, setDisclosuresVisible] = useState(false);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title="Legal & Compliance" onBack={() => navigation.goBack()} showSettings={false} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Legal & Regulatory</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Statutory disclosures, AMFI registration credentials, and terms governing transactions on TechArtha.
          </Text>
        </View>

        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF', borderColor: colors.border }]}>
          <Ionicons name="ribbon-outline" size={22} color={colors.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBannerTitle, { color: colors.primary }]}>AMFI Registered Intermediary</Text>
            <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
              TechArtha operates under AMFI Registration Number ARN-284912 in compliance with SEBI (Mutual Funds) Regulations, 1996.
            </Text>
          </View>
        </View>

        {/* POLICIES NAVIGATION ROWS */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Platform Agreements & Policies</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={[styles.row, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => setTermsVisible(true)}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
              <Ionicons name="document-text-outline" size={20} color={isDark ? '#A78BFA' : '#5B21B6'} />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Terms of Service</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>Mutual fund execution agreement, electronic mandate rules & user covenants</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          <Pressable
            style={[styles.row, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => setPrivacyVisible(true)}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#082F49' : '#E0F2FE' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={isDark ? '#38BDF8' : '#0369A1'} />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Privacy Policy & Data Security</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>AES-256 data protection, KYC encryption, and zero third-party data selling</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>

          <Pressable
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => setDisclosuresVisible(true)}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#451A03' : '#FEF3C7' }]}>
              <Ionicons name="alert-circle-outline" size={20} color={isDark ? '#FBBF24' : '#B45309'} />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Risk Disclosures Modal</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>SEBI statutory disclaimers, Risk-o-Meter categorization & Cutoff NAVs</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* REGULATORY STATUTORY NOTICES */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Mandatory Statutory Disclosures</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.disclosureItem, { borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.disclosureTitle, { color: colors.textPrimary }]}>Statutory Market Risk Warning</Text>
            <Text style={[styles.disclosureBody, { color: colors.textSecondary }]}>
              Mutual fund investments are subject to market risks. Please read all scheme-related documents (Scheme Information Document - SID, Key Information Memorandum - KIM) carefully before investing. Past performance is not indicative of future returns.
            </Text>
          </View>

          <View style={[styles.disclosureItem, { borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.disclosureTitle, { color: colors.textPrimary }]}>Distributor Intermediary Role</Text>
            <Text style={[styles.disclosureBody, { color: colors.textSecondary }]}>
              TechArtha acts as an AMFI-registered Mutual Fund Distributor facilitating transaction execution. We do not charge direct advisory fees to retail investors. Scheme expense ratios include distributor commissions in regular plans.
            </Text>
          </View>

          <View style={[styles.disclosureItem, { borderBottomWidth: 0 }]}>
            <Text style={[styles.disclosureTitle, { color: colors.textPrimary }]}>Investor Grievance Redressal (SEBI SCORES)</Text>
            <Text style={[styles.disclosureBody, { color: colors.textSecondary }]}>
              In case of unresolved grievances, investors may lodge complaints on SEBI SCORES (scores.gov.in) or via the SMART ODR portal (smartodr.in).
            </Text>
          </View>
        </View>

        {/* DATA LOCALIZATION CARD */}
        <View style={[styles.privacyCard, { backgroundColor: isDark ? '#064E3B' : '#F0FDF4', borderColor: isDark ? '#047857' : '#DCFCE7' }]}>
          <View style={styles.privacyTopRow}>
            <Ionicons name="server" size={18} color={isDark ? '#34D399' : '#059669'} />
            <Text style={[styles.privacyHeading, { color: isDark ? '#A7F3D0' : '#065F46' }]}>100% Indian Data Localization</Text>
          </View>
          <Text style={[styles.privacyBody, { color: isDark ? '#D1FAE5' : '#047857' }]}>
            In compliance with RBI and SEBI cybersecurity frameworks, all investor biometric, banking, and order data is stored on MeitY-empaneled servers physically located within the Republic of India.
          </Text>
        </View>
      </ScrollView>

      <TermsModal visible={termsVisible} onClose={() => setTermsVisible(false)} />
      <PrivacyPolicyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />
      <RiskDisclosuresModal visible={disclosuresVisible} onClose={() => setDisclosuresVisible(false)} />
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
  card: { borderRadius: 16, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1, marginBottom: 20 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  rowSub: { fontSize: 12, lineHeight: 16 },

  disclosureItem: { paddingVertical: 12, borderBottomWidth: 1 },
  disclosureTitle: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  disclosureBody: { fontSize: 12, lineHeight: 18 },

  privacyCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  privacyTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  privacyHeading: { fontSize: 13, fontWeight: '800' },
  privacyBody: { fontSize: 12, lineHeight: 17 }
});
