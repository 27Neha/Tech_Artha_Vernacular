import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface FaqItem {
  q: string;
  a: string;
  category: 'Safety' | 'SIP' | 'Taxes' | 'Compliance';
}

const FAQS: FaqItem[] = [
  {
    category: 'Safety',
    q: 'How are my mutual fund investments secured?',
    a: 'TechArtha is an AMFI-registered mutual fund distributor (ARN-284912). Your investments are routed directly through regulated exchange partners (BSE StAR MF / NSE NMF II) to respective Asset Management Companies (AMCs). Units are allotted directly in your folio under SEBI investor protection regulations.'
  },
  {
    category: 'SIP',
    q: 'When are monthly SIP debits processed?',
    a: 'SIPs are debited on your chosen schedule date via NPCI e-Mandate auto-pay. We send reminder alerts 48 hours prior to debit so you can ensure sufficient bank balance and avoid bank NACH bounce charges.'
  },
  {
    category: 'SIP',
    q: 'What is the NAV allocation timeline?',
    a: 'As per SEBI guidelines, the NAV applicable to your purchase depends on the realization of funds at the AMC account before the official cut-off time (typically 2:00 PM for liquid/overnight funds and 3:00 PM for equity/hybrid schemes).'
  },
  {
    category: 'SIP',
    q: 'How do redemptions work?',
    a: 'When you redeem mutual fund units, proceeds are credited directly to your primary verified bank account within T+1 to T+3 working days, depending on the asset class (equity, hybrid, or debt).'
  },
  {
    category: 'Compliance',
    q: 'Is nominee registration mandatory for mutual funds?',
    a: 'Yes, SEBI regulations mandate all individual investors to either declare up to 3 nominees or submit an explicit opt-out declaration to safeguard fund succession.'
  },
  {
    category: 'Taxes',
    q: 'How does mutual fund capital gains tax work?',
    a: 'For equity mutual funds held over 12 months, Long-Term Capital Gains (LTCG) above ₹1.25 Lakh per financial year are taxed at 12.5%. Short-term gains (<12 months) are taxed at 20%. Debt funds are taxed according to your individual income tax slab.'
  },
  {
    category: 'Compliance',
    q: 'What is In-Person Verification (IPV) during KYC?',
    a: 'SEBI circulars require live video/photo In-Person Verification during digital onboarding to verify that the person opening the mutual fund account matches Income Tax and Aadhaar records.'
  }
];

export const FaqScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredFaqs = FAQS.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title="FAQs" onBack={() => navigation.goBack()} showSettings={false} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Knowledge Base</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Authoritative answers on mutual fund regulations, NAV settlement timelines, and taxation rules.
          </Text>
        </View>

        {/* SEARCH BAR */}
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search questions (e.g. SIP, NAV, Tax)..."
            placeholderTextColor={colors.textPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.textPlaceholder} />
            </Pressable>
          ) : null}
        </View>

        {/* CATEGORY CHIPS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {['All', 'Safety', 'SIP', 'Taxes', 'Compliance'].map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                style={[
                  styles.chip,
                  { backgroundColor: isDark ? colors.surfaceMuted : '#EDF2F7' },
                  isSelected && { backgroundColor: colors.primary }
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[
                  styles.chipText,
                  { color: isDark ? colors.textSecondary : '#4A5568' },
                  isSelected && { color: '#fff' }
                ]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Questions ({filteredFaqs.length})</Text>
        <View style={styles.faqList}>
          {filteredFaqs.map((faq, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <View key={idx} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Pressable
                  style={styles.questionRow}
                  onPress={() => setExpandedIndex(isExpanded ? null : idx)}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={styles.tagRow}>
                      <View style={[styles.categoryBadge, { backgroundColor: isDark ? '#2E1065' : '#EEF2FF' }]}>
                        <Text style={[styles.categoryBadgeText, { color: isDark ? '#C4B5FD' : '#3C3985' }]}>{faq.category}</Text>
                      </View>
                    </View>
                    <Text style={[styles.questionText, { color: colors.textPrimary }]}>{faq.q}</Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.primary}
                  />
                </Pressable>

                {isExpanded && (
                  <View style={[styles.answerBox, { borderTopColor: colors.borderSubtle }]}>
                    <Text style={[styles.answerText, { color: colors.textSecondary }]}>{faq.a}</Text>
                  </View>
                )}
              </View>
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

  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },

  chipRow: { gap: 8, marginBottom: 20 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  chipText: { fontSize: 12, fontWeight: '700' },

  sectionHeading: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  faqList: { gap: 10 },

  card: { borderRadius: 16, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1 },
  questionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tagRow: { marginBottom: 6 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  categoryBadgeText: { fontSize: 10, fontWeight: '800' },
  questionText: { fontSize: 14, fontWeight: '800', lineHeight: 20 },

  answerBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  answerText: { fontSize: 13, lineHeight: 20 }
});
