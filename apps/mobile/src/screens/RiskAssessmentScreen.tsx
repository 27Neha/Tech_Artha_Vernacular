import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api/client';

/**
 * GET /risk/questionnaire, then POST /risk/calculate.
 *
 * The questions are FETCHED, not hardcoded. This screen previously carried its own set
 * of five, while the server serves twelve (risk-questionnaire.ts, version 2026.08.12Q)
 * and scores against the ids it serves. Three different questionnaires existed - the
 * server's twelve, the web app's own twelve, and mobile's five - so the same person
 * could get three different risk profiles depending on where they answered.
 *
 * Fetching means the profile is always scored against the questionnaire the server
 * actually published, and a change there does not need a mobile release.
 */
type Question = {
  id: string;
  dimension?: string;
  prompt: string;
  options: { label: string; score: number }[];
};

type Questionnaire = { version?: string; questions?: Question[]; note?: string };

export const RiskAssessmentScreen = () => {
  const navigation = useNavigation<any>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Questionnaire>('/risk/questionnaire')
      .then((data) => {
        if (cancelled) return;
        setQuestions(data?.questions ?? []);
        setNote(data?.note ?? null);
      })
      .catch((e) => !cancelled && setLoadError(e instanceof Error ? e.message : 'Could not load the questionnaire.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const question = questions[index];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const submit = useCallback(
    async (finalAnswers: Record<string, number>) => {
      setSubmitting(true);
      try {
        // consent:true is REQUIRED. calculateRisk throws "Explicit consent is required
        // before a risk assessment" without it, and this screen used to omit it - so
        // every assessment 400'd and nothing was ever saved.
        //
        // Answers are keyed by the server's own question ids so reasons() can name the
        // dimension that drove the result.
        const result = await api.post('/risk/calculate', { answers: finalAnswers, consent: true });
        navigation.navigate('RiskProfileResult', { profile: result });
      } catch (e) {
        Alert.alert(
          'Could not save your risk profile',
          e instanceof Error ? e.message : 'Please try again.',
        );
      } finally {
        setSubmitting(false);
      }
    },
    [navigation],
  );

  const choose = (score: number) => {
    if (!question) return;
    const next = { ...answers, [question.id]: score };
    setAnswers(next);

    if (index < questions.length - 1) {
      setIndex(index + 1);
      return;
    }
    void submit(next);
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

  if (loadError || !question) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centre}>
          <Text style={styles.error}>{loadError ?? 'No questions are available.'}</Text>
          <Pressable style={styles.outlineButton} onPress={() => navigation.goBack()}>
            <Text style={styles.outlineText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const selected = answers[question.id];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            Question {index + 1} of {questions.length}
          </Text>
          {question.dimension ? <Text style={styles.dimension}>{question.dimension}</Text> : null}
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((index + 1) / questions.length) * 100}%` }]} />
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.prompt}>{question.prompt}</Text>

        {question.options.map((option) => (
          <Pressable
            key={option.label}
            style={[styles.option, selected === option.score && styles.optionSelected]}
            onPress={() => choose(option.score)}
            disabled={submitting}
          >
            <Text style={[styles.optionText, selected === option.score && styles.optionTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        ))}

        {index > 0 ? (
          <Pressable style={styles.outlineButton} onPress={() => setIndex(index - 1)} disabled={submitting}>
            <Text style={styles.outlineText}>Back</Text>
          </Pressable>
        ) : null}

        {submitting ? (
          <View style={styles.submitting}>
            <ActivityIndicator />
            <Text style={styles.submittingText}>Saving your profile…</Text>
          </View>
        ) : null}

        <Text style={styles.answered}>
          {answeredCount} of {questions.length} answered
        </Text>

        {/* The server's own wording: an investor profile is a suitability assessment,
            not a scheme Risk-o-Meter or a return prediction. */}
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  header: { padding: 24, paddingTop: 60, paddingBottom: 16 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressText: { color: '#4A5568', fontSize: 13, fontWeight: '700' },
  dimension: { color: '#3C3985', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  progressTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#3C3985', borderRadius: 3 },
  content: { paddingHorizontal: 20 },
  prompt: { color: '#102A54', fontSize: 19, fontWeight: '800', lineHeight: 27, marginBottom: 20, marginTop: 8 },
  option: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 14, padding: 16, marginBottom: 10 },
  optionSelected: { borderColor: '#3C3985', backgroundColor: '#EBEAF8' },
  optionText: { color: '#2D3748', fontSize: 14, lineHeight: 20 },
  optionTextSelected: { color: '#3C3985', fontWeight: '700' },
  outlineButton: { padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#3C3985', marginTop: 12 },
  outlineText: { color: '#3C3985', fontSize: 15, fontWeight: '700' },
  submitting: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, justifyContent: 'center' },
  submittingText: { color: '#4A5568', fontSize: 13 },
  answered: { color: '#718096', fontSize: 12, textAlign: 'center', marginTop: 20 },
  note: { color: '#A0AEC0', fontSize: 11, lineHeight: 16, marginTop: 14, marginBottom: 40, textAlign: 'center' },
  error: { color: '#C53030', fontSize: 14, textAlign: 'center' },
});
