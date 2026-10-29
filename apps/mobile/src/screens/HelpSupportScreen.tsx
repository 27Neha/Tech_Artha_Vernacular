import React from 'react';
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
import { openWhatsAppSupport, openEmailSupport, TECH_ARTHA_SUPPORT } from '../utils/contact';
import { SupportQuerySection } from '../components/SupportQuerySection';
import { useTheme } from '../context/ThemeContext';

export const HelpSupportScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title="Help & Support" onBack={() => navigation.goBack()} showSettings={false} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Investor Support</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Get instant guidance via AI Wealth Assistant, access knowledge FAQs, or connect with dedicated SEBI compliance officers.
          </Text>
        </View>

        {/* 24/7 AI WEALTH ASSISTANT */}
        <View style={[styles.aiBox, { backgroundColor: isDark ? colors.surfaceMuted : '#EBEBFA', borderColor: colors.border }]}>
          <Text style={[styles.aiBoxLabel, { color: colors.primary }]}>24/7 AI WEALTH ASSISTANT</Text>
          <Text style={[styles.aiBoxTitle, { color: colors.textPrimary }]}>Instant Portfolio & SIP Advisory</Text>
          <Text style={[styles.aiBoxSub, { color: colors.textSecondary }]}>
            Ask queries in 12 Indian languages about fund suitability, SIP returns, or market terminology.
          </Text>
          <Pressable
            style={[styles.aiBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Assistant' })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="chatbubbles" size={18} color="#fff" />
              <Text style={styles.aiBtnText}>Start Live AI Chat</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#fff" style={{ marginLeft: 'auto' }} />
          </Pressable>
        </View>

        {/* FAQS NAVIGATION CARD */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Self-Service Knowledge Base</Text>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate('Faqs')}
        >
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
              <Ionicons name="help-buoy-outline" size={22} color={isDark ? '#A78BFA' : '#5B21B6'} />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Frequently Asked Questions (FAQs)</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>SEBI regulations, NAV cutoff times, nominee rules & auto-pay</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </View>
        </Pressable>

        {/* CONTACT DIRECT CHANNELS */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Official Contact Channels</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={[styles.contactRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => openWhatsAppSupport()}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#052E16' : '#DCFCE7' }]}>
              <Ionicons name="logo-whatsapp" size={22} color={isDark ? '#4ADE80' : '#16A34A'} />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>WhatsApp Support</Text>
              <Text style={[styles.contactSub, { color: colors.textSecondary }]}>{TECH_ARTHA_SUPPORT.displayPhone} • Mon–Sat, 9 AM – 7 PM</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textPlaceholder} />
          </Pressable>

          <Pressable
            style={[styles.contactRow, { borderBottomWidth: 0 }]}
            onPress={() => openEmailSupport()}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#082F49' : '#E0F2FE' }]}>
              <Ionicons name="mail-outline" size={22} color={isDark ? '#38BDF8' : '#0369A1'} />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>Email Grievance Desk</Text>
              <Text style={[styles.contactSub, { color: colors.textSecondary }]}>{TECH_ARTHA_SUPPORT.email} • 24–48 hr resolution</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* LIVE SUPPORT TICKET QUERY SECTION */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Submit Support Query</Text>
        <SupportQuerySection />

        {/* SEBI SCORES NOTICE */}
        <View style={[styles.regulatoryCard, { backgroundColor: isDark ? '#064E3B' : '#F0FDF4', borderColor: isDark ? '#047857' : '#DCFCE7' }]}>
          <View style={styles.regulatoryHeader}>
            <Ionicons name="shield-checkmark" size={18} color={isDark ? '#34D399' : '#065F46'} />
            <Text style={[styles.regulatoryHeading, { color: isDark ? '#A7F3D0' : '#065F46' }]}>SEBI Grievance Redressal</Text>
          </View>
          <Text style={[styles.regulatoryText, { color: isDark ? '#D1FAE5' : '#047857' }]}>
            Investors may lodge unresolved grievances directly on the SEBI SCORES portal (scores.gov.in) or via SMART ODR (smartodr.in) in accordance with regulatory circulars.
          </Text>
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

  aiBox: { borderRadius: 20, padding: 18, borderWidth: 1, marginBottom: 20 },
  aiBoxLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  aiBoxTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  aiBoxSub: { fontSize: 12, lineHeight: 17, marginBottom: 14 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14 },
  aiBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  sectionHeading: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  cardSub: { fontSize: 12, lineHeight: 16 },

  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  contactTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  contactSub: { fontSize: 12 },

  regulatoryCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginTop: 10 },
  regulatoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  regulatoryHeading: { fontSize: 13, fontWeight: '800' },
  regulatoryText: { fontSize: 12, lineHeight: 17 }
});
