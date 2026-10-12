import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';

type RiskPayload = {
  data?: { score?: number; category?: string };
  category?: string;
  score?: number;
  explanation?: string[];
  disclaimer?: string;
};

export const RiskResultScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const payload: RiskPayload = route.params?.profile ?? {};
  const rawCat = route.params?.category ?? payload.data?.category ?? payload.category ?? 'MODERATE';
  const category = String(rawCat).toUpperCase();
  const score = route.params?.score ?? payload.data?.score ?? payload.score ?? 35;
  const reasons = payload.explanation ?? [];

  let label = 'Moderate';
  let desc = 'You prefer a balanced approach, seeking growth while taking measured risks to protect your capital.';
  let color = '#38A169';

  if (category === 'CONSERVATIVE') {
    label = 'Conservative';
    desc = 'You prioritize capital preservation over high returns. You prefer stable, low-risk investments.';
    color = '#3182CE';
  } else if (category === 'AGGRESSIVE') {
    label = 'Aggressive';
    desc = 'You are willing to accept higher market volatility for the potential of significant long-term growth.';
    color = '#E53E3E';
  }

  const normalizedScore = Math.max(12, Math.min(60, Number(score) || 35));
  const percentage = ((normalizedScore - 12) / (60 - 12)) * 100;
  const rotation = -90 + percentage * 1.8;

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="Your Risk Profile" />
      
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>Your Risk Profile is</Text>
          <Text style={[styles.category, { color }]}>{label}</Text>

          {/* Riskometer Visualization */}
          <View style={styles.meterContainer}>
            <View style={styles.archBackground}>
              <View style={[styles.archSegment, { backgroundColor: '#3182CE', transform: [{ rotate: '-60deg' }] }]} />
              <View style={[styles.archSegment, { backgroundColor: '#38A169', transform: [{ rotate: '0deg' }] }]} />
              <View style={[styles.archSegment, { backgroundColor: '#E53E3E', transform: [{ rotate: '60deg' }] }]} />
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
              <Text style={styles.statValue}>{label} Bucket</Text>
            </View>
          </View>

          {reasons.length > 0 && (
            <View style={styles.reasonsBox}>
              <Text style={styles.reasonsTitle}>Why this profile</Text>
              {reasons.map((reason, i) => (
                <Text key={i} style={styles.reasonText}>• {reason}</Text>
              ))}
            </View>
          )}

          <Text style={styles.disclaimer}>
            {payload.disclaimer ??
              'This investor profile is a suitability assessment and does not guarantee investment returns. Mutual fund investments are subject to market risks.'}
          </Text>
        </View>

        <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('GoalSelection')}>
          <Text style={styles.primaryBtnText}>Continue to Goal Planner</Text>
          <Text style={styles.primaryBtnText}>→</Text>
        </Pressable>

        <Pressable style={styles.outlineBtn} onPress={() => navigation.navigate('RiskAssessment')}>
          <Text style={styles.outlineBtnText}>Retake Assessment</Text>
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
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, marginBottom: 20 },
  title: { fontSize: 14, fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  category: { fontSize: 32, fontWeight: '900', marginBottom: 24 },
  meterContainer: { width: 240, height: 120, position: 'relative', alignItems: 'center', overflow: 'hidden', marginBottom: 12 },
  archBackground: { width: 240, height: 240, borderRadius: 120, position: 'absolute', top: 0, overflow: 'hidden' },
  archSegment: { width: 120, height: 240, position: 'absolute', left: 120, top: 0, transformOrigin: 'left center' },
  archCover: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#fff', position: 'absolute', top: 40 },
  needle: { position: 'absolute', bottom: 0, height: 100, width: 4, alignItems: 'center', justifyContent: 'flex-end', transformOrigin: 'bottom center' },
  needleLine: { width: 4, height: 90, backgroundColor: '#102A54', borderRadius: 2 },
  needleCenter: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#102A54', position: 'absolute', bottom: -8 },
  meterLabels: { flexDirection: 'row', justifyContent: 'space-between', width: 240, marginBottom: 24 },
  meterLabelText: { fontSize: 12, fontWeight: '700', color: '#A0AEC0' },
  description: { fontSize: 14, color: '#4A5568', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 16, width: '100%', marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#F8F9FB', padding: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#EDF2F7' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#A0AEC0', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: '800', color: '#102A54' },
  reasonsBox: { alignSelf: 'stretch', backgroundColor: '#F8F9FB', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  reasonsTitle: { fontSize: 13, fontWeight: '700', color: '#102A54', marginBottom: 8 },
  reasonText: { fontSize: 12, color: '#4A5568', lineHeight: 18, marginBottom: 4 },
  disclaimer: { fontSize: 11, color: '#A0AEC0', textAlign: 'center', lineHeight: 16, marginTop: 8 },
  primaryBtn: { width: '100%', backgroundColor: '#3C3985', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  outlineBtn: { width: '100%', paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#3C3985', alignItems: 'center', marginBottom: 10 },
  outlineBtnText: { color: '#3C3985', fontSize: 14, fontWeight: '700' },
  skipBtn: { width: '100%', paddingVertical: 12, alignItems: 'center' },
  skipBtnText: { color: '#718096', fontSize: 14, fontWeight: '600' }
});

export default RiskResultScreen;
