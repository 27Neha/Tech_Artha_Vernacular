import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';

export const RiskResultScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const category = (route.params?.category || 'MODERATE').toUpperCase();
  const score = route.params?.score || 35;

  let label = 'Moderate';
  let desc = 'You prefer a balanced approach, seeking growth while taking measured risks to protect your capital.';
  let color = '#48BB78'; // Green for all types

  if (category === 'CONSERVATIVE') {
    label = 'Conservative';
    desc = 'You prioritize capital preservation over high returns. You prefer stable, low-risk investments.';
    color = '#48BB78'; // Green
  } else if (category === 'AGGRESSIVE') {
    label = 'Aggressive';
    desc = 'You are willing to accept higher market volatility for the potential of significant long-term growth.';
    color = '#48BB78'; // Green
  }

  // Calculate needle rotation based on score (approx 12-60 range)
  // Normalization: Conservative ~12-25, Moderate ~26-45, Aggressive ~46-60
  const normalizedScore = Math.max(12, Math.min(60, score));
  const percentage = ((normalizedScore - 12) / (60 - 12)) * 100;
  // 0% = -90deg, 100% = 90deg
  const rotation = -90 + (percentage * 1.8);

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="Your Risk Profile" />
      
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Your Risk Profile is</Text>
          <Text style={[styles.category, { color }]}>{label}</Text>

          {/* Riskometer Visualization */}
          <View style={styles.meterContainer}>
            <View style={styles.archBackground}>
              <View style={[styles.archSegment, { backgroundColor: '#48BB78', transform: [{ rotate: '-60deg' }] }]} />
              <View style={[styles.archSegment, { backgroundColor: '#48BB78', transform: [{ rotate: '0deg' }] }]} />
              <View style={[styles.archSegment, { backgroundColor: '#48BB78', transform: [{ rotate: '60deg' }] }]} />
            </View>
            <View style={styles.archCover} />
            <View style={[styles.needle, { transform: [{ rotate: `${rotation}deg` }] }]}>
              <View style={styles.needleLine} />
              <View style={styles.needleCenter} />
            </View>
          </View>
          <View style={styles.meterLabels}>
            <Text style={styles.meterLabelText}>Conservative</Text>
            <Text style={styles.meterLabelText}>Aggressive</Text>
          </View>

          <Text style={styles.description}>{desc}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Calculated Score</Text>
              <Text style={styles.statValue}>{score} / 60</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Recommended</Text>
              <Text style={styles.statValue}>Equity / Debt</Text>
            </View>
          </View>
        </View>

        <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('GoalSelection')}>
          <Text style={styles.primaryBtnText}>Continue to Goal Planner</Text>
          <Text style={styles.primaryBtnText}>→</Text>
        </Pressable>

        <Pressable style={styles.skipBtn} onPress={() => navigation.navigate('MainTabs')}>
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  container: { padding: 24, paddingBottom: 40, alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, marginBottom: 24 },
  title: { fontSize: 16, fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  category: { fontSize: 36, fontWeight: '900', marginBottom: 32 },
  
  // Riskometer Styles
  meterContainer: { width: 240, height: 120, position: 'relative', alignItems: 'center', overflow: 'hidden', marginBottom: 12 },
  archBackground: { width: 240, height: 240, borderRadius: 120, position: 'absolute', top: 0, overflow: 'hidden' },
  archSegment: { width: 120, height: 240, position: 'absolute', left: 120, top: 0, transformOrigin: 'left center' },
  archCover: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#fff', position: 'absolute', top: 40 },
  needle: { position: 'absolute', bottom: 0, height: 100, width: 4, alignItems: 'center', justifyContent: 'flex-end', transformOrigin: 'bottom center' },
  needleLine: { width: 4, height: 90, backgroundColor: '#102A54', borderRadius: 2 },
  needleCenter: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#102A54', position: 'absolute', bottom: -8 },
  
  meterLabels: { flexDirection: 'row', justifyContent: 'space-between', width: 240, marginBottom: 32 },
  meterLabelText: { fontSize: 12, fontWeight: '700', color: '#A0AEC0' },

  description: { fontSize: 15, color: '#4A5568', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 16, width: '100%' },
  statBox: { flex: 1, backgroundColor: '#F8F9FB', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#EDF2F7' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#A0AEC0', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#102A54' },

  primaryBtn: { width: '100%', backgroundColor: '#3C3985', paddingVertical: 18, paddingHorizontal: 24, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  
  skipBtn: { width: '100%', paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  skipBtnText: { color: '#3C3985', fontSize: 16, fontWeight: '700' }
});
