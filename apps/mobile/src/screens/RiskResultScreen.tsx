import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';

/**
 * Ported from apps/web/app/risk/result.
 *
 * Mobile previously routed "RiskProfileResult" straight to the goal picker, so a user
 * finished the assessment and never saw the profile it produced - the one output the
 * whole questionnaire exists to deliver, and the thing that decides which buckets they
 * are eligible for.
 *
 * Reads the POST /risk/calculate response that RiskAssessmentScreen passes through:
 * { data: { score, category }, explanation: string[], disclaimer }.
 */
type RiskPayload = {
  data?: { score?: number; category?: string };
  explanation?: string[];
  disclaimer?: string;
};

const DESCRIPTIONS: Record<string, string> = {
  CONSERVATIVE: 'Low risk. Capital preservation is your priority.',
  MODERATE: 'A balanced approach between risk and return.',
  AGGRESSIVE: 'High risk tolerance, seeking maximum long-term growth.',
};

const COLOURS: Record<string, string> = {
  CONSERVATIVE: '#3182CE',
  MODERATE: '#38A169',
  AGGRESSIVE: '#E53E3E',
};

export const RiskResultScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const payload: RiskPayload = route.params?.profile ?? {};

  const category = (payload.data?.category ?? 'MODERATE').toUpperCase();
  const score = payload.data?.score;
  const label = category.charAt(0) + category.slice(1).toLowerCase();
  const colour = COLOURS[category] ?? '#38A169';
  const reasons = payload.explanation ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>YOUR INVESTOR PROFILE</Text>

        <View style={[styles.badge, { backgroundColor: colour }]}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>

        <Text style={styles.description}>{DESCRIPTIONS[category] ?? DESCRIPTIONS.MODERATE}</Text>
        {score != null ? <Text style={styles.score}>Score: {score}</Text> : null}

        {reasons.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Why this profile</Text>
            {reasons.map((reason, index) => (
              <Text key={index} style={styles.reason}>
                • {reason}
              </Text>
            ))}
          </View>
        ) : null}

        {/* The server returns this wording deliberately: an investor profile is a
            suitability assessment, not a scheme Risk-o-Meter or a return forecast. */}
        <Text style={styles.disclaimer}>
          {payload.disclaimer ??
            'This investor profile is not a scheme Risk-o-Meter and does not guarantee performance.'}
        </Text>

        <Pressable style={styles.button} onPress={() => navigation.navigate('GoalSelection')}>
          <Text style={styles.buttonText}>Continue to goals →</Text>
        </Pressable>
        <Pressable style={styles.outlineButton} onPress={() => navigation.navigate('RiskAssessment')}>
          <Text style={styles.outlineText}>Retake assessment</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  content: { padding: 24, paddingTop: 72, alignItems: 'center' },
  eyebrow: { color: '#718096', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  badge: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 16 },
  badgeText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  description: { color: '#2D3748', fontSize: 15, textAlign: 'center', marginTop: 18, lineHeight: 22 },
  score: { color: '#718096', fontSize: 13, marginTop: 8, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginTop: 28, alignSelf: 'stretch', borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { color: '#102A54', fontSize: 15, fontWeight: '800', marginBottom: 10 },
  reason: { color: '#4A5568', fontSize: 13, lineHeight: 20, marginBottom: 6 },
  disclaimer: { color: '#A0AEC0', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 24 },
  button: { backgroundColor: '#3C3985', padding: 16, borderRadius: 12, alignItems: 'center', alignSelf: 'stretch', marginTop: 28 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  outlineButton: { padding: 16, borderRadius: 12, alignItems: 'center', alignSelf: 'stretch', borderWidth: 2, borderColor: '#3C3985', marginTop: 12, marginBottom: 40 },
  outlineText: { color: '#3C3985', fontSize: 15, fontWeight: '700' },
});
