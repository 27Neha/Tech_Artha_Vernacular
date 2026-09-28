import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../services/api/client';

/**
 * GET /buckets - the buckets eligible for this user's risk profile, with the funds the
 * recommendation engine picked for each.
 *
 * This screen previously rendered a hardcoded BUCKETS array that included invented
 * return bands ("6-8%", "14-18%"). The API deliberately returns no return projections -
 * a SEBI-regulated distributor cannot advertise expected returns - so the stat row now
 * shows allocation and horizon, which are facts about the bucket, instead.
 */
type Bucket = {
  id: string;
  name: string;
  allocation: { equity: number; debt: number; liquid: number };
  horizon: string;
  explanation: string;
  recommended?: boolean;
  bucketRiskLevel?: string;
  riskMeter?: string;
  recommendedFunds?: { schemeCode: number; name?: string; category?: string; nav?: string; navDate?: string }[];
};

const RISK_COLOURS: Record<string, string> = {
  Conservative: '#3182CE',
  Moderate: '#38A169',
  Aggressive: '#E53E3E',
};

export const InvestmentBucketsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await api.get<{ buckets?: Bucket[] } | Bucket[]>('/buckets');
      const list = Array.isArray(response) ? response : (response.buckets ?? []);
      setBuckets(list);
      // Preselect whichever bucket the engine flagged for this user's profile.
      setSelectedBucket(list.find((b) => b.recommended)?.id ?? list[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load buckets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose your Bucket</Text>
        <Text style={styles.subtitle}>
          Buckets are curated investment mixes suited to your risk profile and goal.
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !error && buckets.length === 0 ? (
          <Text style={styles.desc}>
            No buckets are available for your profile yet. Complete your risk assessment to see them.
          </Text>
        ) : null}

        {buckets.map((bucket) => {
          const risk = bucket.bucketRiskLevel ?? 'Moderate';
          const selected = selectedBucket === bucket.id;
          return (
            <Pressable
              key={bucket.id}
              style={[styles.card, selected && styles.cardSelected]}
              onPress={() => setSelectedBucket(bucket.id)}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{bucket.name}</Text>
                  <Text style={[styles.riskLabel, { color: RISK_COLOURS[risk] ?? '#38A169' }]}>
                    {risk.toUpperCase()}
                  </Text>
                </View>
                {bucket.recommended ? (
                  <View style={styles.recBadge}>
                    <Text style={styles.recText}>✓ Recommended</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.desc}>{bucket.explanation}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Equity</Text>
                  <Text style={styles.statValue}>{bucket.allocation?.equity ?? 0}%</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Debt</Text>
                  <Text style={styles.statValue}>{bucket.allocation?.debt ?? 0}%</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Horizon</Text>
                  <Text style={[styles.statValue, { color: '#102A54' }]}>{bucket.horizon}</Text>
                </View>
              </View>

              {bucket.recommendedFunds?.length ? (
                <View style={styles.funds}>
                  <Text style={styles.fundsLabel}>FUNDS IN THIS BUCKET</Text>
                  {bucket.recommendedFunds.map((fund) => (
                    <View key={fund.schemeCode} style={styles.fundRow}>
                      <Text style={styles.fundName} numberOfLines={1}>
                        {fund.name ?? `Scheme ${fund.schemeCode}`}
                      </Text>
                      <Text style={styles.fundNav}>{fund.nav ? `₹${Number(fund.nav).toFixed(2)}` : '—'}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {selected ? (
                <Pressable
                  style={styles.chooseButton}
                  onPress={() =>
                    navigation.navigate('PlanSummary', { goal: route.params?.goal, bucket: bucket.id })
                  }
                >
                  <Text style={styles.chooseText}>Choose This Bucket →</Text>
                </Pressable>
              ) : null}
            </Pressable>
          );
        })}

        <Text style={styles.disclaimer}>
          Mutual fund investments are subject to market risks. Read all scheme related documents carefully.
          Past performance is not indicative of future returns.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { color: '#102A54', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#4A5568', fontSize: 14, lineHeight: 20 },
  content: { padding: 20 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardSelected: { borderColor: '#3C3985', backgroundColor: '#EBEAF8' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  name: { fontSize: 18, fontWeight: '700', color: '#102A54', marginBottom: 4 },
  riskLabel: { fontSize: 12, fontWeight: '800' },
  recBadge: { backgroundColor: '#EBF4FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  recText: { color: '#3182CE', fontSize: 10, fontWeight: '700' },
  desc: { color: '#4A5568', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8 },
  statLabel: { fontSize: 10, color: '#718096', marginBottom: 4, textTransform: 'uppercase', fontWeight: '600' },
  statValue: { fontSize: 14, fontWeight: '700', color: '#3C3985' },
  funds: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12 },
  fundsLabel: { fontSize: 10, color: '#718096', fontWeight: '700', marginBottom: 8 },
  fundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, gap: 12 },
  fundName: { flex: 1, color: '#2D3748', fontSize: 13 },
  fundNav: { color: '#3C3985', fontWeight: '700', fontSize: 13 },
  chooseButton: { backgroundColor: '#3C3985', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  chooseText: { color: 'white', fontSize: 16, fontWeight: '700' },
  error: { color: '#C53030', fontSize: 13, marginBottom: 12 },
  disclaimer: { fontSize: 10, color: '#A0AEC0', textAlign: 'center', marginTop: 8, marginBottom: 40, lineHeight: 15 },
});
