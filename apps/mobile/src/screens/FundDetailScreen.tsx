import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../services/api/client';
import { addToDraft } from '../store/customBucket';

/**
 * GET /funds/:schemeCode - ported from apps/web/app/funds/[id]/page.tsx.
 *
 * Shows the scheme's metadata, its latest NAV and a short NAV history, plus the same
 * risk warning the web shows when the scheme's category sits above the investor's
 * assessed profile.
 */
type FundDetails = {
  meta?: {
    scheme_name?: string;
    fund_house?: string;
    scheme_category?: string;
    scheme_type?: string;
  };
  data?: { date: string; nav: string }[];
};

const HISTORY_POINTS = 30;

export const FundDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const schemeCode: string = String(route.params?.schemeCode ?? '');

  const [details, setDetails] = useState<FundDetails | null>(null);
  const [riskCategory, setRiskCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      // The fund endpoint is public; the profile is not, so a signed-out view still works.
      const [fund, profile] = await Promise.allSettled([
        api.get<FundDetails>(`/funds/${encodeURIComponent(schemeCode)}`, { anonymous: true }),
        api.get<{ riskProfile?: { category?: string | null } | null }>('/auth/profile'),
      ]);

      if (fund.status === 'fulfilled') setDetails(fund.value);
      else setError('Fund data is temporarily unavailable.');

      if (profile.status === 'fulfilled') {
        const category = profile.value?.riskProfile?.category ?? '';
        setRiskCategory(category ? category.charAt(0).toUpperCase() + category.slice(1).toLowerCase() : '');
      }
    } finally {
      setLoading(false);
    }
  }, [schemeCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const addToBucket = async () => {
    const name = details?.meta?.scheme_name;
    if (!name) return;
    setAdding(true);
    try {
      await addToDraft({
        schemeCode: Number(schemeCode),
        name,
        category: details?.meta?.scheme_category,
      });
      navigation.navigate('CustomBucket');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centre}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  const meta = details?.meta;
  const history = details?.data ?? [];
  const latest = history[0];

  if (error || !meta) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centre}>
          <Text style={styles.error}>{error ?? 'Fund not found.'}</Text>
          <Pressable style={styles.outlineButton} onPress={() => navigation.goBack()}>
            <Text style={styles.outlineText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Same rule as the web page: warn when an equity or small-cap scheme is shown to an
  // investor whose assessment came back Moderate.
  const category = (meta.scheme_category ?? '').toLowerCase();
  const showRiskWarning =
    riskCategory.toUpperCase() === 'MODERATE' && (category.includes('equity') || category.includes('small cap'));

  // Bars are scaled within the window shown, so the shape is readable regardless of the
  // scheme's absolute NAV. This is an illustration of movement, not a priced chart.
  const window = history.slice(0, HISTORY_POINTS).reverse();
  const values = window.map((p) => parseFloat(p.nav)).filter((n) => Number.isFinite(n));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const span = max - min || 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView>
        {showRiskWarning ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Higher risk than your profile</Text>
            <Text style={styles.warningText}>
              This fund&apos;s category carries more risk than your assessed {riskCategory} profile suggests.
            </Text>
          </View>
        ) : null}

        <View style={styles.header}>
          <Text style={styles.title}>{meta.scheme_name}</Text>
          <Text style={styles.subtitle}>
            {[meta.fund_house, meta.scheme_category].filter(Boolean).join(' · ')}
          </Text>
          {meta.scheme_type ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{meta.scheme_type}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.navCard}>
          <Text style={styles.navLabel}>LATEST NAV</Text>
          <Text style={styles.navValue}>{latest ? `₹${latest.nav}` : '—'}</Text>
          <Text style={styles.navDate}>{latest ? `As of ${latest.date}` : 'No NAV published'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent NAV</Text>
          {window.length < 5 ? (
            <Text style={styles.muted}>Not enough history to show a trend.</Text>
          ) : (
            <>
              <View style={styles.chart}>
                {window.map((point, index) => {
                  const value = parseFloat(point.nav);
                  const height = Number.isFinite(value) ? ((value - min) / span) * 100 : 0;
                  return <View key={index} style={[styles.bar, { height: `${Math.max(4, height)}%` }]} />;
                })}
              </View>
              <Text style={styles.muted}>
                {window.length} published NAVs, {window[0]?.date} to {window[window.length - 1]?.date}
              </Text>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.disclaimer}>
            Mutual fund investments are subject to market risks. Read all scheme related documents carefully.
            Past performance is not indicative of future returns. NAV data is reference information only.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={[styles.outlineButton, adding && styles.disabled]} onPress={addToBucket} disabled={adding}>
            <Text style={styles.outlineText}>{adding ? 'Adding…' : 'Add to my bucket'}</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => navigation.navigate('InvestmentBuckets')}>
            <Text style={styles.buttonText}>Browse buckets →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  header: { padding: 24, paddingTop: 48, backgroundColor: '#fff' },
  title: { color: '#102A54', fontSize: 22, fontWeight: '800', lineHeight: 29 },
  subtitle: { color: '#4A5568', fontSize: 13, marginTop: 8 },
  badge: { backgroundColor: '#EBEAF8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start', marginTop: 12 },
  badgeText: { color: '#3C3985', fontWeight: '700', fontSize: 11 },
  navCard: { backgroundColor: '#EBEAF8', margin: 20, padding: 20, borderRadius: 16 },
  navLabel: { color: '#3C3985', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  navValue: { color: '#102A54', fontSize: 34, fontWeight: '800', marginTop: 6 },
  navDate: { color: '#4A5568', fontSize: 12, marginTop: 6, fontWeight: '600' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { color: '#102A54', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  chart: { height: 120, flexDirection: 'row', alignItems: 'flex-end', gap: 2, backgroundColor: '#fff', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  bar: { flex: 1, backgroundColor: '#3C3985', borderRadius: 2, opacity: 0.75 },
  muted: { color: '#718096', fontSize: 12, marginTop: 8 },
  disclaimer: { color: '#A0AEC0', fontSize: 11, lineHeight: 16 },
  warningBox: { backgroundColor: '#FFFAF0', borderLeftWidth: 4, borderLeftColor: '#F7941E', padding: 16, margin: 16, borderRadius: 8 },
  warningTitle: { color: '#C05621', fontWeight: '800', fontSize: 13 },
  warningText: { color: '#C05621', fontSize: 12, marginTop: 4, lineHeight: 18 },
  error: { color: '#C53030', fontSize: 14, textAlign: 'center' },
  actions: { padding: 20, gap: 12, paddingBottom: 40 },
  button: { backgroundColor: '#3C3985', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  outlineButton: { padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#3C3985' },
  outlineText: { color: '#3C3985', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
