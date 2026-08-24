import React, { useState } from 'react';
import { SafeAreaView, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';

const BUCKETS = [
  {
    id: 'stable',
    name: 'Stable Income Bucket',
    risk: 'LOW RISK',
    desc: 'Conservative mix of liquid and short-term debt funds. Best for capital safety.',
    returns: '6-8%',
    horizon: '1-3 yrs',
    riskLevel: 'Conservative'
  },
  {
    id: 'balanced',
    name: 'Balanced Growth Bucket',
    risk: 'MODERATE',
    desc: 'Balanced mix of equity and debt. Growth with moderate protection.',
    returns: '10-13%',
    horizon: '3-5 yrs',
    riskLevel: 'Moderate',
    recommended: true
  },
  {
    id: 'high',
    name: 'High Growth Bucket',
    risk: 'HIGH GROWTH',
    desc: 'Equity-focused for long-term wealth creation. Higher potential, higher risk.',
    returns: '14-18%',
    horizon: '5+ yrs',
    riskLevel: 'Aggressive'
  }
];

export const InvestmentBucketsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [selectedBucket, setSelectedBucket] = useState<string>('balanced'); // default to recommended

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose your Bucket</Text>
        <Text style={styles.subtitle}>Buckets are curated investment mixes suited to your risk profile and goal.</Text>
      </View>

      <ScrollView style={styles.content}>
        {BUCKETS.map(bucket => (
          <Pressable 
            key={bucket.id} 
            style={[styles.card, selectedBucket === bucket.id && styles.cardSelected]}
            onPress={() => setSelectedBucket(bucket.id)}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.name}>{bucket.name}</Text>
                <Text style={[styles.riskLabel, { color: bucket.id === 'high' ? '#E53E3E' : bucket.id === 'stable' ? '#3182CE' : '#38A169' }]}>{bucket.risk}</Text>
              </View>
              {bucket.recommended && <View style={styles.recBadge}><Text style={styles.recText}>✓ Recommended</Text></View>}
            </View>
            <Text style={styles.desc}>{bucket.desc}</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Est. Returns</Text>
                <Text style={styles.statValue}>{bucket.returns}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Horizon</Text>
                <Text style={styles.statValue}>{bucket.horizon}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Risk</Text>
                <Text style={[styles.statValue, { color: '#102A54' }]}>{bucket.riskLevel}</Text>
              </View>
            </View>
            {selectedBucket === bucket.id && (
               <Pressable 
                 style={styles.chooseButton} 
                 onPress={() => navigation.navigate('PlanSummary', { goal: route.params?.goal, bucket: bucket.id })}
               >
                 <Text style={styles.chooseText}>Choose This Bucket →</Text>
               </Pressable>
            )}
          </Pressable>
        ))}
        <Text style={styles.disclaimer}>* Illustrative expected returns. Not guaranteed. Mutual fund investments are subject to market risks.</Text>
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
  chooseButton: { backgroundColor: '#3C3985', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  chooseText: { color: 'white', fontSize: 16, fontWeight: '700' },
  disclaimer: { fontSize: 10, color: '#A0AEC0', textAlign: 'center', marginTop: 8, marginBottom: 40 }
});
