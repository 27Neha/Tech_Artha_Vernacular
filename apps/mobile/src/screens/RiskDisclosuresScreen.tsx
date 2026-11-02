import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../services/api/client';

export const RiskDisclosuresScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const [remoteNotice, setRemoteNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`${API_URL}/disclosures/market-risk`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data?.content) setRemoteNotice(data.content);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top', 'right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Statutory Disclosures</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>SEBI & AMFI Regulatory Compliance</Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name="warning" size={14} color="#D97706" />
          <Text style={styles.badgeText}>SEBI</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Mandatory Warning Banner */}
        <View style={[styles.mandatoryBanner, { backgroundColor: isDark ? '#451A03' : '#FEF3C7', borderColor: '#F59E0B' }]}>
          <View style={styles.warningTitleRow}>
            <Ionicons name="alert-circle" size={20} color="#D97706" />
            <Text style={styles.mandatoryHeading}>MANDATORY SEBI DISCLOSURE</Text>
          </View>
          <Text style={styles.mandatoryText}>
            Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing. Past performance is not indicative of future results.
          </Text>
        </View>

        {/* Live Remote Disclosure if available */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#3C3985" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Checking current regulatory notices...</Text>
          </View>
        ) : remoteNotice ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Active Regulatory Notice</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>{remoteNotice}</Text>
          </View>
        ) : null}

        {/* Key Risk Dimensions */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>1. Market & Volatility Risk</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            The Net Asset Value (NAV) of mutual fund units may fluctuate daily in response to factors affecting domestic and global equity markets, debt yields, interest rate changes, and economic developments. Capital invested is not capital protected.
          </Text>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>2. SEBI Risk-o-Meter Categories</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Every mutual fund scheme is assigned a risk level based on its underlying portfolio:
            {'\n'}• Low Risk: Suitable for capital preservation over short tenures.
            {'\n'}• Low to Moderate: Conservative allocations with low equity exposure.
            {'\n'}• Moderate Risk: Balanced debt & equity instruments.
            {'\n'}• Moderately High: Significant equity or corporate debt allocations.
            {'\n'}• High Risk: Predominantly diversified equity investments.
            {'\n'}• Very High: Small cap, thematic, or international exposures.
          </Text>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>3. NAV Cut-Off Timelines</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            As per SEBI guidelines, allotment of same-day NAV depends on both order submission time and receipt of funds in the AMC's bank account before cut-off:
            {'\n'}• Liquid / Overnight Funds: 1:00 PM cut-off.
            {'\n'}• Equity / Debt / Hybrid Funds: 3:00 PM cut-off.
            {'\n'}Orders placed or funds realized after cutoff receive the next business day's NAV.
          </Text>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>4. Execution-Only Intermediary Disclosure</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            TechArtha operates as an AMFI-registered mutual fund distributor (ARN-284912). We offer non-advisory, self-directed execution for Direct and Regular investment plans. Investors should carefully assess scheme risk before investing or consult a certified financial planner.
          </Text>
        </View>

        <View style={styles.footerNote}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            SEBI Regulated Framework • Investor Grievance: complaints@techartha.com{'\n'}
            SEBI SCORES Portal: scores.gov.in
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
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  mandatoryBanner: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  warningTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  mandatoryHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  mandatoryText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    fontWeight: '600',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
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
