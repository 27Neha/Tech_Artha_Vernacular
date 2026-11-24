import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { authStore } from '../store/auth';
import { api, API_URL } from '../services/api/client';
import { HeadsetIcon, UserIcon, EditIcon } from '../components/Icons';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { handleGlobalBack, registerUnsavedChecker } from '../navigation/navigationService';

const FALLBACK_QUESTIONS = [
  { id: 'net_worth', question: "Current market value of net worth (Assets - Liabilities)", options: [{ label: "Negative/0", score: 1 }, { label: "< 10L", score: 2 }, { label: "10L-50L", score: 3 }, { label: "> 50L", score: 4 }, { label: "> 1Cr", score: 5 }] },
  { id: 'market_familiarity', question: "How familiar are you with financial markets?", options: [{ label: "Not at all", score: 1 }, { label: "Somewhat", score: 2 }, { label: "Good", score: 3 }, { label: "Very familiar", score: 4 }, { label: "Expert", score: 5 }] },
  { id: 'risk_attitude', question: "Describe your risk range (losses vs profits)", options: [{ label: "Hate losses", score: 1 }, { label: "Accept small losses for small gains", score: 2 }, { label: "Accept moderate", score: 3 }, { label: "Accept high for high gains", score: 4 }, { label: "Maximum risk", score: 5 }] },
  { id: 'drawdown_reaction', question: "Reaction if portfolio drops 20%", options: [{ label: "Sell all", score: 1 }, { label: "Sell some", score: 2 }, { label: "Do nothing", score: 3 }, { label: "Buy more", score: 4 }, { label: "Buy aggressively", score: 5 }] },
  { id: 'volatility_preference', question: "Desired balance (Volatility vs Returns)", options: [{ label: "100% stable", score: 1 }, { label: "Mostly stable", score: 2 }, { label: "Balanced", score: 3 }, { label: "Mostly volatile", score: 4 }, { label: "100% volatile", score: 5 }] },
  { id: 'income_stability', question: "Current and future income stability", options: [{ label: "Very unstable", score: 1 }, { label: "Unstable", score: 2 }, { label: "Stable", score: 3 }, { label: "Very stable", score: 4 }, { label: "Guaranteed", score: 5 }] },
  { id: 'objective', question: "Preferred investment objective", options: [{ label: "Preserve capital", score: 1 }, { label: "Regular income", score: 2 }, { label: "Balanced growth", score: 3 }, { label: "High growth", score: 4 }, { label: "Maximum speculation", score: 5 }] },
  { id: 'horizon', question: "Years away is your nearest goal?", options: [{ label: "< 1 yr", score: 1 }, { label: "1-3 yrs", score: 2 }, { label: "3-5 yrs", score: 3 }, { label: "5-10 yrs", score: 4 }, { label: "> 10 yrs", score: 5 }] },
  { id: 'loss_tolerance', question: "How long will you hold a poorly performing portfolio?", options: [{ label: "< 3 months", score: 1 }, { label: "3-6 months", score: 2 }, { label: "6-12 months", score: 3 }, { label: "1-3 years", score: 4 }, { label: "> 3 years", score: 5 }] },
  { id: 'invest_share', question: "Percentage of net worth you plan to invest", options: [{ label: "< 10%", score: 1 }, { label: "10-25%", score: 2 }, { label: "25-50%", score: 3 }, { label: "50-75%", score: 4 }, { label: "> 75%", score: 5 }] },
  { id: 'savings_ability', question: "Ability to save money consistently", options: [{ label: "Very poor", score: 1 }, { label: "Poor", score: 2 }, { label: "Average", score: 3 }, { label: "Good", score: 4 }, { label: "Excellent", score: 5 }] },
];

interface QuestionItem {
  id: string | number;
  question: string;
  options: { label: string; score: number }[];
}

export const RiskAssessmentScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const [questions, setQuestions] = useState<QuestionItem[]>(FALLBACK_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<{ questionIndex: number; selectedScore: number; selectedLabel: string }[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const scrollViewRef = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    let active = true;
    api
      .get<{ questions?: { id: string; prompt: string; options: { label: string; score: number }[] }[] }>(
        '/risk/questionnaire',
      )
      .then((data) => {
        if (!active || !data?.questions?.length) return;
        setQuestions(data.questions.map((item) => ({ id: item.id, question: item.prompt, options: item.options })));
      })
      .catch(() => {
        // Fallback remains active
      });
    return () => {
      active = false;
    };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSelectOption = async (score: number, label: string) => {
    if (isBotTyping || submitting) return;

    const answeredItem = {
      questionIndex: currentIndex,
      selectedScore: score,
      selectedLabel: label,
    };

    const newHistory = [...history, answeredItem];
    setHistory(newHistory);
    scrollToBottom();

    if (currentIndex < questions.length - 1) {
      setIsBotTyping(true);
      setTimeout(() => {
        setIsBotTyping(false);
        setCurrentIndex((prev) => prev + 1);
        scrollToBottom();
      }, 500);
    } else {
      // Completed all questions -> submit to backend
      setSubmitting(true);
      try {
        const token = authStore.accessToken;
        const answersPayload = Object.fromEntries(
          newHistory.map((item) => [questions[item.questionIndex]?.id ?? item.questionIndex, item.selectedScore]),
        );

        const res = await fetch(`${API_URL}/risk/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            answers: answersPayload,
            consent: true,
          }),
        });

        if (!res.ok) throw new Error('Failed to calculate risk profile');
        const data = await res.json();
        const cat = data?.data?.category || 'MODERATE';
        const finalScore = data?.data?.score || newHistory.reduce((acc, h) => acc + h.selectedScore, 0);

        navigation.navigate('RiskResult', { category: cat, score: finalScore });
      } catch (err) {
        console.log('Failed to save risk profile to backend', err);
        setSubmitting(false);
      }
    }
  };

  // Revert back to the question and allow choosing a different option
  const handleGoBackToQuestion = (targetIndex: number) => {
    if (isBotTyping || submitting) return;
    // Slice history to before the target question
    const updatedHistory = history.slice(0, targetIndex);
    setHistory(updatedHistory);
    setCurrentIndex(targetIndex);
    scrollToBottom();
  };

  const currentQ = questions[currentIndex];
  const progressPercent = questions.length ? Math.min(100, Math.round(((history.length) / questions.length) * 100)) : 0;

  // Prompt confirmation if user attempts to leave mid-assessment
  useEffect(() => {
    return registerUnsavedChecker('risk_assessment', () => history.length > 0 && !submitting);
  }, [history.length, submitting]);

  if (submitting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#36358D" />
        <Text style={styles.loadingText}>{t('risk.calc', { defaultValue: 'Analyzing your profile with TechArtha Bot...' })}</Text>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <Header title="Risk Assessment" />

      {/* Bot Sub-Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerBotInfo}>
            <View style={styles.headerAvatar}>
              <HeadsetIcon color="#36358D" size={20} />
            </View>
            <View>
              <Text style={styles.headerTitle}>TechArtha Risk Profiler</Text>
              <Text style={styles.headerSubtitle}>Conversational Risk Profiling</Text>
            </View>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {Math.min(questions.length, history.length + 1)} / {questions.length}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Chat Conversation */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.chatScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Intro Greeting */}
        <View style={styles.botRow}>
          <View style={styles.botAvatarSmall}>
            <HeadsetIcon color="#36358D" size={16} />
          </View>
          <View style={styles.botBubble}>
            <Text style={styles.botText}>
              👋 Welcome! I'll guide you through our SEBI-compliant risk assessment to determine your investor profile and personalized asset allocation.
            </Text>
          </View>
        </View>

        {/* Render Answered Questions History */}
        {history.map((item, idx) => {
          const qItem = questions[item.questionIndex];
          return (
            <View key={`history-${idx}`} style={styles.messageTurn}>
              {/* Bot question */}
              <View style={styles.botRow}>
                <View style={styles.botAvatarSmall}>
                  <HeadsetIcon color="#36358D" size={16} />
                </View>
                <View style={styles.botBubble}>
                  <Text style={styles.questionIndexLabel}>Question {item.questionIndex + 1} of {questions.length}</Text>
                  <Text style={styles.botText}>{t(`risk.q${qItem?.id}.q`, { defaultValue: qItem?.question })}</Text>
                </View>
              </View>

              {/* User selected answer bubble with User avatar & bottom-right Edit Icon */}
              <View style={styles.userRow}>
                <View style={styles.userBubbleWrapper}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userRoleLabel}>You</Text>
                    <Text style={styles.userText}>{t(`risk.q${qItem?.id}.${item.selectedScore}`, { defaultValue: item.selectedLabel })}</Text>
                    
                    {/* Professional edit icon on the right bottom of the answer box */}
                    <Pressable
                      style={({ pressed }) => [styles.editIconBtn, pressed && styles.editIconBtnPressed]}
                      onPress={() => handleGoBackToQuestion(item.questionIndex)}
                      hitSlop={10}
                      accessibilityLabel="Edit answer"
                    >
                      <EditIcon color="#36358D" size={11} />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.userAvatarSmall}>
                  <UserIcon color="#4A5568" size={16} />
                </View>
              </View>
            </View>
          );
        })}

        {/* Current Active Question (Bot message + Choice Cards) */}
        {currentQ && history.length < questions.length && (
          <View style={styles.activeTurn}>
            <View style={styles.botRow}>
              <View style={styles.botAvatarSmall}>
                <HeadsetIcon color="#36358D" size={16} />
              </View>
              <View style={styles.botBubble}>
                <Text style={styles.questionIndexLabel}>
                  Question {currentIndex + 1} of {questions.length}
                </Text>
                <Text style={styles.botText}>
                  {t(`risk.q${currentQ.id}.q`, { defaultValue: currentQ.question })}
                </Text>
              </View>
            </View>

            {/* Answer Options Cards */}
            {!isBotTyping && (
              <View style={styles.optionsContainer}>
                <View style={styles.optionsHeaderRow}>
                  <Text style={styles.tapInstruction}>Tap an option to respond:</Text>
                </View>
                {currentQ.options.map((opt, i) => (
                  <Pressable
                    key={`opt-${i}`}
                    style={({ pressed }) => [styles.optionCard, pressed && styles.optionCardPressed]}
                    onPress={() => handleSelectOption(opt.score, opt.label)}
                    disabled={isBotTyping || submitting}
                  >
                    <View style={styles.optionLetter}>
                      <Text style={styles.optionLetterText}>{String.fromCharCode(65 + i)}</Text>
                    </View>
                    <Text style={styles.optionLabel}>
                      {t(`risk.q${currentQ.id}.${opt.score}`, { defaultValue: opt.label })}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Typing indicator */}
        {isBotTyping && (
          <View style={styles.botRow}>
            <View style={styles.botAvatarSmall}>
              <HeadsetIcon color="#36358D" size={16} />
            </View>
            <View style={[styles.botBubble, styles.typingBubble]}>
              <ActivityIndicator size="small" color="#36358D" />
              <Text style={styles.typingText}>TechArtha Bot is preparing the next question...</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7FC' },
  loadingContainer: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: '#36358D', fontWeight: '800', fontSize: 16, marginTop: 16, textAlign: 'center' },
  header: { backgroundColor: '#36358D', paddingTop: 14, paddingBottom: 18, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerBotInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#F7941D', borderRadius: 3 },
  chatScroll: { padding: 16, paddingBottom: 40 },
  messageTurn: { marginBottom: 16 },
  activeTurn: { marginBottom: 16 },
  botRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10, maxWidth: '88%' },
  botAvatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEEDFA', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  botBubble: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 18, borderTopLeftRadius: 4, borderWidth: 1, borderColor: '#E6E8F6', shadowColor: '#102A54', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  questionIndexLabel: { fontSize: 10.5, fontWeight: '800', color: '#F7941D', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  botText: { color: '#102A54', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  
  // User side styling
  userRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end', gap: 8, marginTop: 6, marginBottom: 12 },
  userAvatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEEDFA', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  userBubbleWrapper: { alignItems: 'flex-end', maxWidth: '82%' },
  userBubble: { backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, borderTopRightRadius: 4, borderWidth: 1.5, borderColor: '#E6E8F6', shadowColor: '#102A54', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2, minWidth: 110, paddingBottom: 10, paddingRight: 26, position: 'relative' },
  userRoleLabel: { fontSize: 10, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 2, textAlign: 'right' },
  userText: { color: '#102A54', fontSize: 15, fontWeight: '700', lineHeight: 21 },
  editIconBtn: { position: 'absolute', right: 6, bottom: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#EEEDFA', borderWidth: 1, borderColor: '#D9D7F7', alignItems: 'center', justifyContent: 'center' },
  editIconBtnPressed: { backgroundColor: '#D9D7F7', opacity: 0.8 },
  
  optionsContainer: { marginLeft: 38, marginTop: 4, gap: 8 },
  optionsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  tapInstruction: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#E6E8F6', shadowColor: '#102A54', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  optionCardPressed: { borderColor: '#36358D', backgroundColor: '#EEEDFA' },
  optionLetter: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEEDFA', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  optionLetterText: { fontSize: 13, fontWeight: '800', color: '#36358D' },
  optionLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#102A54' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  typingText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
});
