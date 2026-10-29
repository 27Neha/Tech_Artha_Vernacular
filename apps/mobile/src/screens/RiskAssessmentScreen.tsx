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
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { authStore } from '../store/auth';
import { api } from '../services/api/client';
import { HeadsetIcon, UserIcon, EditIcon } from '../components/Icons';

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
  { id: 'market_view', question: "What is your overall attitude towards the stock market?", options: [{ label: "It is a casino, highly dangerous", score: 1 }, { label: "A place for experts only", score: 2 }, { label: "A good place to invest, with some caution", score: 3 }, { label: "An excellent wealth-building opportunity", score: 4 }, { label: "The only place to beat inflation and maximize returns", score: 5 }] },
];

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

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

  if (submitting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3C3985" />
        <Text style={styles.loadingText}>{t('risk.calc', { defaultValue: 'Analyzing your profile with TechArtha Bot...' })}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerBotInfo}>
            <View style={styles.headerAvatar}>
              <HeadsetIcon color="#3C3985" size={20} />
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
            <HeadsetIcon color="#3C3985" size={16} />
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
                  <HeadsetIcon color="#3C3985" size={16} />
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
                      <EditIcon color="#3C3985" size={11} />
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
                <HeadsetIcon color="#3C3985" size={16} />
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
              <HeadsetIcon color="#3C3985" size={16} />
            </View>
            <View style={[styles.botBubble, styles.typingBubble]}>
              <ActivityIndicator size="small" color="#3C3985" />
              <Text style={styles.typingText}>TechArtha Bot is preparing the next question...</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  loadingContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: '#3C3985', fontWeight: '700', fontSize: 16, marginTop: 16, textAlign: 'center' },
  header: { backgroundColor: '#3C3985', paddingTop: 12, paddingBottom: 16, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerBotInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#F7941E', borderRadius: 3 },
  chatScroll: { padding: 16, paddingBottom: 40 },
  messageTurn: { marginBottom: 16 },
  activeTurn: { marginBottom: 16 },
  botRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10, maxWidth: '88%' },
  botAvatarSmall: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EBEBFA', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  botBubble: { backgroundColor: '#fff', padding: 14, borderRadius: 16, borderTopLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  questionIndexLabel: { fontSize: 11, fontWeight: '800', color: '#F7941E', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  botText: { color: '#102A54', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  
  // User side styling (clean white/neutral card with border, matching bot side, with user avatar)
  userRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end', gap: 8, marginTop: 6, marginBottom: 12 },
  userAvatarSmall: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EDF2F7', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  userBubbleWrapper: { alignItems: 'flex-end', maxWidth: '82%' },
  userBubble: { backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, borderTopRightRadius: 4, borderWidth: 1.5, borderColor: '#CBD5E1', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1, minWidth: 110, paddingBottom: 10, paddingRight: 26, position: 'relative' },
  userRoleLabel: { fontSize: 10, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 2, textAlign: 'right' },
  userText: { color: '#0F172A', fontSize: 15, fontWeight: '700', lineHeight: 21 },
  editIconBtn: { position: 'absolute', right: 6, bottom: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: '#F0EFFB', borderWidth: 1, borderColor: '#D4D2F5', alignItems: 'center', justifyContent: 'center' },
  editIconBtnPressed: { backgroundColor: '#D4D2F5', opacity: 0.8 },
  
  optionsContainer: { marginLeft: 38, marginTop: 4, gap: 8 },
  optionsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  tapInstruction: { fontSize: 12, color: '#718096', fontWeight: '700' },
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0' },
  optionCardPressed: { borderColor: '#3C3985', backgroundColor: '#F0EFFF' },
  optionLetter: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F3F8', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  optionLetterText: { fontSize: 13, fontWeight: '800', color: '#3C3985' },
  optionLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#102A54' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  typingText: { fontSize: 13, color: '#718096', fontWeight: '600' },
});
