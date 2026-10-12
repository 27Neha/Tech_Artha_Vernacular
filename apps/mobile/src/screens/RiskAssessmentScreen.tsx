import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../theme/styles';
import { api } from '../services/api/client';

const QUESTIONS = [
  {
    id: 1,
    question: "Current market value of net worth (Assets - Liabilities)",
    options: [
      { label: "Negative/0", score: 1 },
      { label: "< 10L", score: 2 },
      { label: "10L-50L", score: 3 },
      { label: "> 50L", score: 4 },
      { label: "> 1Cr", score: 5 },
    ],
  },
  {
    id: 2,
    question: "How familiar are you with financial markets?",
    options: [
      { label: "Not at all", score: 1 },
      { label: "Somewhat", score: 2 },
      { label: "Good", score: 3 },
      { label: "Very familiar", score: 4 },
      { label: "Expert", score: 5 },
    ],
  },
  {
    id: 3,
    question: "Describe your risk range (losses vs profits)",
    options: [
      { label: "Hate losses", score: 1 },
      { label: "Accept small losses for small gains", score: 2 },
      { label: "Accept moderate", score: 3 },
      { label: "Accept high for high gains", score: 4 },
      { label: "Maximum risk", score: 5 },
    ],
  },
  {
    id: 4,
    question: "Reaction if portfolio drops 20%",
    options: [
      { label: "Sell all", score: 1 },
      { label: "Sell some", score: 2 },
      { label: "Do nothing", score: 3 },
      { label: "Buy more", score: 4 },
      { label: "Buy aggressively", score: 5 },
    ],
  },
  {
    id: 5,
    question: "Desired balance (Volatility vs Returns)",
    options: [
      { label: "100% stable", score: 1 },
      { label: "Mostly stable", score: 2 },
      { label: "Balanced", score: 3 },
      { label: "Mostly volatile", score: 4 },
      { label: "100% volatile", score: 5 },
    ],
  },
  {
    id: 6,
    question: "Current and future income stability",
    options: [
      { label: "Very unstable", score: 1 },
      { label: "Unstable", score: 2 },
      { label: "Stable", score: 3 },
      { label: "Very stable", score: 4 },
      { label: "Guaranteed", score: 5 },
    ],
  },
  {
    id: 7,
    question: "Preferred investment objective",
    options: [
      { label: "Preserve capital", score: 1 },
      { label: "Regular income", score: 2 },
      { label: "Balanced growth", score: 3 },
      { label: "High growth", score: 4 },
      { label: "Maximum speculation", score: 5 },
    ],
  },
  {
    id: 8,
    question: "Years away is your nearest goal?",
    options: [
      { label: "< 1 yr", score: 1 },
      { label: "1-3 yrs", score: 2 },
      { label: "3-5 yrs", score: 3 },
      { label: "5-10 yrs", score: 4 },
      { label: "> 10 yrs", score: 5 },
    ],
  },
  {
    id: 9,
    question: "How long will you hold a poorly performing portfolio?",
    options: [
      { label: "< 3 months", score: 1 },
      { label: "3-6 months", score: 2 },
      { label: "6-12 months", score: 3 },
      { label: "1-3 years", score: 4 },
      { label: "> 3 years", score: 5 },
    ],
  },
  {
    id: 10,
    question: "Percentage of net worth you plan to invest",
    options: [
      { label: "< 10%", score: 1 },
      { label: "10-25%", score: 2 },
      { label: "25-50%", score: 3 },
      { label: "50-75%", score: 4 },
      { label: "> 75%", score: 5 },
    ],
  },
  {
    id: 11,
    question: "Ability to save money consistently",
    options: [
      { label: "Very poor", score: 1 },
      { label: "Poor", score: 2 },
      { label: "Average", score: 3 },
      { label: "Good", score: 4 },
      { label: "Excellent", score: 5 },
    ],
  },
  {
    id: 12,
    question: "What is your overall attitude towards the stock market?",
    options: [
      { label: "It is a casino, highly dangerous", score: 1 },
      { label: "A place for experts only", score: 2 },
      { label: "A good place to invest, with some caution", score: 3 },
      { label: "An excellent wealth-building opportunity", score: 4 },
      { label: "The only place to beat inflation and maximize returns", score: 5 },
    ],
  }
];

export const RiskAssessmentScreen = () => {
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
        const data = await api.post<any>('/risk/calculate', { answers: newAnswers, consent: true });
        const cat = data?.data?.category || 'MODERATE';
        const finalScore = data?.data?.score || newAnswers.reduce((a, b) => a + b, 0);
        
        navigation.navigate('RiskResult', { category: cat, score: finalScore });
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to calculate risk profile. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (current > 0) {
      setCurrent(current - 1);
    } else {
      navigation.goBack();
    }
  };

  const progress = ((current + 1) / QUESTIONS.length) * 100;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F8F9FB' }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 40, flexGrow: 1 }}>
        <Pressable onPress={handleBack} style={{ marginBottom: 20 }}>
          <Text style={{ color: '#1653B0', fontWeight: 'bold' }}>← Back</Text>
        </Pressable>

        <View style={localStyles.progressBarBg}>
          <View style={[localStyles.progressBarFill, { width: `${progress}%` }]} />
        </View>
        <Text style={{ textAlign: 'right', fontSize: 12, color: '#718096', marginBottom: 32 }}>
          Question {current + 1} of {QUESTIONS.length}
        </Text>

        <Text style={{ fontSize: 24, fontWeight: '800', color: '#102A54', marginBottom: 24 }}>
          {q.question}
        </Text>

        <View style={{ gap: 12 }}>
          {q.options.map((opt, i) => (
            <Pressable 
              key={i}
              style={[localStyles.optionCard, selectedScore === opt.score && localStyles.optionSelected]}
              onPress={() => setSelectedScore(opt.score)}
            >
              <Text style={[localStyles.optionText, selectedScore === opt.score && localStyles.optionTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable 
          style={[styles.primaryButton, (!selectedScore || loading) && styles.primaryDisabled, { marginTop: 'auto' }]} 
          onPress={handleNext} 
          disabled={!selectedScore || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>{current === QUESTIONS.length - 1 ? 'Submit' : 'Next'}</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#1653B0',
    borderRadius: 4,
  },
  optionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  optionSelected: {
    borderColor: '#1653B0',
    backgroundColor: '#EEF2FF',
  },
  optionText: {
    fontSize: 16,
    color: '#4A5568',
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#1653B0',
  }
});
