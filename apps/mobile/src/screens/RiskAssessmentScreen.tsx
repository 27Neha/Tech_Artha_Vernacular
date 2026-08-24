import React, { useState } from 'react';
import { SafeAreaView, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { authStore } from '../store/auth';

const QUESTIONS = [
  {
    id: 'q1',
    title: 'What is your age group?',
    options: [
      { id: 'A', text: 'Below 25 years', score: 4 },
      { id: 'B', text: '25 - 35 years', score: 3 },
      { id: 'C', text: '36 - 50 years', score: 2 },
      { id: 'D', text: 'Above 50 years', score: 1 },
    ]
  },
  {
    id: 'q2',
    title: 'For how long do you plan to stay invested?',
    options: [
      { id: 'A', text: 'Less than 1 year', score: 1 },
      { id: 'B', text: '1 to 3 years', score: 2 },
      { id: 'C', text: '3 to 7 years', score: 3 },
      { id: 'D', text: 'More than 7 years', score: 4 },
    ]
  },
  {
    id: 'q3',
    title: 'What is your monthly household income?',
    options: [
      { id: 'A', text: 'Below ₹15,000', score: 1 },
      { id: 'B', text: '₹15,000 - ₹30,000', score: 2 },
      { id: 'C', text: '₹30,000 - ₹60,000', score: 3 },
      { id: 'D', text: 'Above ₹60,000', score: 4 },
    ]
  },
  {
    id: 'q4',
    title: 'Imagine your ₹1 lakh investment temporarily falls to ₹85,000. What would you do?',
    options: [
      { id: 'A', text: 'Withdraw everything immediately', score: 1 },
      { id: 'B', text: 'Feel worried, wait a little while', score: 2 },
      { id: 'C', text: 'Stay calm and wait for recovery', score: 3 },
      { id: 'D', text: 'See it as an opportunity and invest more', score: 4 },
    ]
  },
  {
    id: 'q5',
    title: 'What is your main goal for investing?',
    options: [
      { id: 'A', text: 'Keep my money safe', score: 1 },
      { id: 'B', text: 'Get regular income', score: 2 },
      { id: 'C', text: 'Grow wealth over the long term', score: 3 },
      { id: 'D', text: 'Maximize growth, willing to accept ups and downs', score: 4 },
    ]
  }
];

export const RiskAssessmentScreen = () => {
  const navigation = useNavigation<any>();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const question = QUESTIONS[currentQuestionIndex];
  const selectedScore = answers[question.id];

  const handleNext = async () => {
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Submit
      setLoading(true);
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'}/risk/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authStore.userId,
            answers: Object.values(answers)
          })
        });
        const result = await response.json();
        navigation.navigate('RiskProfileResult', { profile: result });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Risk Assessment</Text>
        <Text style={styles.progress}>{currentQuestionIndex + 1}/{QUESTIONS.length}</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.qBadge}>
          <Text style={styles.qBadgeText}>Q{currentQuestionIndex + 1}</Text>
        </View>
        <Text style={styles.questionText}>{question.title}</Text>

        <View style={styles.options}>
          {question.options.map(opt => (
            <Pressable 
              key={opt.id} 
              style={[styles.optionCard, selectedScore === opt.score && styles.optionSelected]}
              onPress={() => setAnswers(prev => ({ ...prev, [question.id]: opt.score }))}
            >
              <View style={[styles.letterCircle, selectedScore === opt.score && styles.letterCircleSelected]}>
                <Text style={[styles.letterText, selectedScore === opt.score && styles.letterTextSelected]}>{opt.id}</Text>
              </View>
              <Text style={styles.optionText}>{opt.text}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable 
          style={[styles.button, !selectedScore && styles.buttonDisabled]} 
          onPress={handleNext}
          disabled={!selectedScore || loading}
        >
          <Text style={styles.buttonText}>{currentQuestionIndex === QUESTIONS.length - 1 ? (loading ? 'Submitting...' : 'See My Profile') : 'Next'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { backgroundColor: '#3C3985', padding: 20, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
  progress: { color: 'white', fontSize: 14, opacity: 0.8 },
  content: { padding: 24 },
  qBadge: { backgroundColor: '#EBEAF8', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 16 },
  qBadgeText: { color: '#3C3985', fontWeight: '700' },
  questionText: { fontSize: 24, fontWeight: '800', color: '#102A54', marginBottom: 32 },
  options: { gap: 16 },
  optionCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' },
  optionSelected: { borderColor: '#3C3985', backgroundColor: '#EBEAF8' },
  letterCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  letterCircleSelected: { backgroundColor: '#3C3985' },
  letterText: { color: '#64748B', fontWeight: '700' },
  letterTextSelected: { color: 'white' },
  optionText: { fontSize: 16, color: '#102A54', flex: 1, fontWeight: '500' },
  footer: { padding: 24, paddingBottom: 40, backgroundColor: '#F8F9FB' },
  button: { backgroundColor: '#3C3985', padding: 18, borderRadius: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' }
});
