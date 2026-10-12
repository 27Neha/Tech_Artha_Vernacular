import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authStore } from '../store/auth';

const QUESTIONS = [
  { id: 1, question: "Current market value of net worth (Assets - Liabilities)", options: [{ label: "Negative/0", score: 1 }, { label: "< 10L", score: 2 }, { label: "10L-50L", score: 3 }, { label: "> 50L", score: 4 }, { label: "> 1Cr", score: 5 }] },
  { id: 2, question: "How familiar are you with financial markets?", options: [{ label: "Not at all", score: 1 }, { label: "Somewhat", score: 2 }, { label: "Good", score: 3 }, { label: "Very familiar", score: 4 }, { label: "Expert", score: 5 }] },
  { id: 3, question: "Describe your risk range (losses vs profits)", options: [{ label: "Hate losses", score: 1 }, { label: "Accept small losses for small gains", score: 2 }, { label: "Accept moderate", score: 3 }, { label: "Accept high for high gains", score: 4 }, { label: "Maximum risk", score: 5 }] },
  { id: 4, question: "Reaction if portfolio drops 20%", options: [{ label: "Sell all", score: 1 }, { label: "Sell some", score: 2 }, { label: "Do nothing", score: 3 }, { label: "Buy more", score: 4 }, { label: "Buy aggressively", score: 5 }] },
  { id: 5, question: "Desired balance (Volatility vs Returns)", options: [{ label: "100% stable", score: 1 }, { label: "Mostly stable", score: 2 }, { label: "Balanced", score: 3 }, { label: "Mostly volatile", score: 4 }, { label: "100% volatile", score: 5 }] },
  { id: 6, question: "Current and future income stability", options: [{ label: "Very unstable", score: 1 }, { label: "Unstable", score: 2 }, { label: "Stable", score: 3 }, { label: "Very stable", score: 4 }, { label: "Guaranteed", score: 5 }] },
  { id: 7, question: "Preferred investment objective", options: [{ label: "Preserve capital", score: 1 }, { label: "Regular income", score: 2 }, { label: "Balanced growth", score: 3 }, { label: "High growth", score: 4 }, { label: "Maximum speculation", score: 5 }] },
  { id: 8, question: "Years away is your nearest goal?", options: [{ label: "< 1 yr", score: 1 }, { label: "1-3 yrs", score: 2 }, { label: "3-5 yrs", score: 3 }, { label: "5-10 yrs", score: 4 }, { label: "> 10 yrs", score: 5 }] },
  { id: 9, question: "How long will you hold a poorly performing portfolio?", options: [{ label: "< 3 months", score: 1 }, { label: "3-6 months", score: 2 }, { label: "6-12 months", score: 3 }, { label: "1-3 years", score: 4 }, { label: "> 3 years", score: 5 }] },
  { id: 10, question: "Percentage of net worth you plan to invest", options: [{ label: "< 10%", score: 1 }, { label: "10-25%", score: 2 }, { label: "25-50%", score: 3 }, { label: "50-75%", score: 4 }, { label: "> 75%", score: 5 }] },
  { id: 11, question: "Ability to save money consistently", options: [{ label: "Very poor", score: 1 }, { label: "Poor", score: 2 }, { label: "Average", score: 3 }, { label: "Good", score: 4 }, { label: "Excellent", score: 5 }] },
  { id: 12, question: "What is your overall attitude towards the stock market?", options: [{ label: "It is a casino, highly dangerous", score: 1 }, { label: "A place for experts only", score: 2 }, { label: "A good place to invest, with some caution", score: 3 }, { label: "An excellent wealth-building opportunity", score: 4 }, { label: "The only place to beat inflation and maximize returns", score: 5 }] }
];

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const RiskAssessmentScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const q = QUESTIONS[current];

  useEffect(() => {
    if (answers[current] !== undefined) {
      setSelectedScore(answers[current]);
    } else {
      setSelectedScore(null);
    }
  }, [current, answers]);

  const handleNext = async () => {
    if (selectedScore === null) return;
    
    const newAnswers = [...answers.slice(0, current), selectedScore];
    setAnswers(newAnswers);

    if (current < QUESTIONS.length - 1) {
      setCurrent(current + 1);
    } else {
      setLoading(true);
      try {
        const token = authStore.accessToken;
        const res = await fetch(`${API_URL}/risk/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ answers: newAnswers, consent: true })
        });
        
        if (!res.ok) throw new Error('Failed to calculate risk profile');
        const data = await res.json();
        const cat = data.data.category || 'MODERATE';
        const finalScore = data.data.score || newAnswers.reduce((a, b) => a + b, 0);
        
        navigation.navigate('RiskResult', { category: cat, score: finalScore });
      } catch (err) {
        console.log('Failed to save risk profile to backend', err);
        setLoading(false);
      }
    }
  };

  const handlePrevious = () => {
    if (current > 0) setCurrent(current - 1);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3C3985" />
        <Text style={styles.loadingText}>{t('risk.calc', { defaultValue: 'Calculating your profile...' })}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{t('risk.title', { defaultValue: 'Risk Assessment' })}</Text>
          <Text style={styles.headerCount}>{current + 1} / {QUESTIONS.length}</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${((current + 1) / QUESTIONS.length) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.qPrefix}>
          <Text style={styles.qPrefixText}>Question {current + 1}</Text>
        </View>
        <Text style={styles.questionText}>
          {t(`risk.q${q.id}.q`, { defaultValue: q.question })}
        </Text>

        <View style={styles.optionsList}>
          {q.options.map((opt, i) => {
            const isSelected = selectedScore === opt.score;
            return (
              <Pressable
                key={i}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => setSelectedScore(opt.score)}
              >
                <View style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                  <Text style={[styles.optionLetterText, isSelected && styles.optionLetterTextSelected]}>
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {t(`risk.q${q.id}.${opt.score}`, { defaultValue: opt.label })}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          {current > 0 && (
            <Pressable style={styles.backBtn} onPress={handlePrevious}>
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
          )}
          <Pressable 
            style={[styles.nextBtn, selectedScore === null && styles.nextBtnDisabled]} 
            onPress={handleNext} 
            disabled={selectedScore === null}
          >
            <Text style={styles.nextBtnText}>{current === QUESTIONS.length - 1 ? t('risk.finish', { defaultValue: 'Finish' }) : t('risk.next', { defaultValue: 'Next' })}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#3C3985', fontWeight: '800', fontSize: 18, marginTop: 16 },
  header: { backgroundColor: '#3C3985', paddingTop: 20, paddingBottom: 24, paddingHorizontal: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerCount: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '700' },
  progressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#F7941E', borderRadius: 4 },
  content: { padding: 24, paddingBottom: 40 },
  qPrefix: { backgroundColor: '#EBEBFA', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, marginBottom: 16 },
  qPrefixText: { color: '#3C3985', fontWeight: '800', fontSize: 14 },
  questionText: { fontSize: 24, fontWeight: '800', color: '#102A54', lineHeight: 32, marginBottom: 32 },
  optionsList: { gap: 16 },
  optionCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16, borderWidth: 2, borderColor: '#E2E8F0', backgroundColor: '#fff' },
  optionCardSelected: { borderColor: '#3C3985', backgroundColor: '#EBEBFA' },
  optionLetter: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8F9FB', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  optionLetterSelected: { backgroundColor: '#3C3985' },
  optionLetterText: { color: '#718096', fontWeight: '800', fontSize: 16 },
  optionLetterTextSelected: { color: '#fff' },
  optionText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#102A54' },
  optionTextSelected: { color: '#3C3985', fontWeight: '800' },
  footer: { padding: 24, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#fff' },
  footerRow: { flexDirection: 'row', gap: 12 },
  backBtn: { paddingVertical: 16, paddingHorizontal: 24, backgroundColor: '#F8F9FB', borderRadius: 16 },
  backBtnText: { color: '#4A5568', fontSize: 16, fontWeight: '800' },
  nextBtn: { flex: 1, paddingVertical: 16, backgroundColor: '#3C3985', borderRadius: 16, alignItems: 'center' },
  nextBtnDisabled: { backgroundColor: '#E2E8F0' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});
