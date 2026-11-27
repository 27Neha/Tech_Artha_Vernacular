import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authStore } from '../store/auth';
import { api, API_URL } from '../services/api/client';
import { HeadsetIcon, UserIcon, EditIcon } from '../components/Icons';
import { Header } from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { registerUnsavedChecker } from '../navigation/navigationService';

// Exact 12 SEBI-aligned questions matching backend RISK_QUESTIONS (services/api/src/modules/risk/risk-questionnaire.ts)
const FALLBACK_QUESTIONS = [
  {
    id: 'age',
    question: 'What is your age group?',
    options: [
      { label: 'Above 50 years', score: 1 },
      { label: '36 - 50 years', score: 2 },
      { label: '25 - 35 years', score: 3 },
      { label: 'Below 25 years', score: 4 },
    ],
  },
  {
    id: 'horizon',
    question: 'For how long do you plan to stay invested?',
    options: [
      { label: 'Less than 1 year', score: 1 },
      { label: '1 to 3 years', score: 2 },
      { label: '3 to 7 years', score: 3 },
      { label: 'More than 7 years', score: 4 },
    ],
  },
  {
    id: 'income',
    question: 'What is your monthly household income?',
    options: [
      { label: 'Below ₹15,000', score: 1 },
      { label: '₹15,000 - ₹30,000', score: 2 },
      { label: '₹30,000 - ₹60,000', score: 3 },
      { label: 'Above ₹60,000', score: 4 },
    ],
  },
  {
    id: 'income_source',
    question: 'My current and future source of income are',
    options: [
      { label: 'Very unstable', score: 1 },
      { label: 'Unstable', score: 2 },
      { label: 'Somewhat stable', score: 3 },
      { label: 'Stable', score: 4 },
      { label: 'Very Stable', score: 5 },
    ],
  },
  {
    id: 'preference',
    question: 'Choose your investment preference/Objective',
    options: [
      { label: 'Principal protection', score: 1 },
      { label: 'Can consider a loss of 4% if the expected gains are of 10%', score: 2 },
      { label: 'Can consider a loss of 8% if the expected gains are of 20%', score: 3 },
      { label: 'Can consider a loss of 15% if the expected gains are of 30%', score: 4 },
      { label: 'Can consider a loss of 25% if the expected gains are of 50%', score: 5 },
    ],
  },
  {
    id: 'decline_reaction',
    question:
      'If a few months after investing, the value of your portfolio goes down due to market decline by 20%, what would you do?',
    options: [
      { label: 'Cut losses and Sell completely', score: 1 },
      { label: 'Sell partially and transfer investments to safer asset classes', score: 2 },
      { label: 'You would be worried, but would give your investments a little more time', score: 3 },
      { label: 'Retain fully, you are OK with volatility and accept decline', score: 4 },
      { label: 'Buy more to bring down the average buying price', score: 5 },
    ],
  },
  {
    id: 'tax_efficiency',
    question:
      'Volatile investments usually provide higher returns and tax efficiency. What is your desired balance?',
    options: [
      { label: 'Preferably guaranteed returns, before tax efficiency', score: 1 },
      { label: 'Stable returns, minimal tax efficiency', score: 2 },
      { label: 'Some variability in returns, some tax efficiency', score: 3 },
      { label: 'Moderate variability in returns, reasonable tax efficiency', score: 4 },
      { label: 'Unstable but potentially higher returns, maximising tax efficiency', score: 5 },
    ],
  },
  {
    id: 'familiarity',
    question: 'How familiar are you with financial markets?',
    options: [
      { label: 'I have no idea about financial markets', score: 1 },
      { label: 'I have very basic idea about investing & no experience', score: 2 },
      { label: 'I have a fair knowledge & experience', score: 3 },
      { label: 'I have thorough knowledge & experience', score: 4 },
    ],
  },
  {
    id: 'risk_range',
    question: 'Describe your Risk Range. What level of losses and profits you would be comfortable with?',
    options: [
      { label: 'Worst Year = 1% and Best Year = 15%', score: 1 },
      { label: 'Worst Year = -5% and Best Year = 20%', score: 2 },
      { label: 'Worst Year = -10% and Best Year = 25%', score: 3 },
      { label: 'Worst Year = -15% and Best Year = 30%', score: 4 },
      { label: 'Worst Year = -18% and Best Year = 35%', score: 5 },
      { label: 'Worst Year = -22% and Best Year = 45%', score: 5 },
    ],
  },
  {
    id: 'dependents',
    question: 'How many financial dependents do you have?',
    options: [
      { label: 'More than 3', score: 1 },
      { label: '2 to 3', score: 2 },
      { label: '1', score: 3 },
      { label: 'None', score: 4 },
    ],
  },
  {
    id: 'liabilities',
    question: 'What percentage of your income goes towards paying off loans/EMIs?',
    options: [
      { label: 'More than 50%', score: 1 },
      { label: '30% to 50%', score: 2 },
      { label: '10% to 30%', score: 3 },
      { label: 'Less than 10% or None', score: 4 },
    ],
  },
  {
    id: 'emergency_fund',
    question: 'How many months of expenses do you have saved in an emergency fund?',
    options: [
      { label: 'Less than 1 month', score: 1 },
      { label: '1 to 3 months', score: 2 },
      { label: '3 to 6 months', score: 3 },
      { label: 'More than 6 months', score: 4 },
    ],
  },
];

interface QuestionItem {
  id: string | number;
  question: string;
  options: { label: string; score: number }[];
}

export const RiskAssessmentScreen = () => {
  const { colors, isDark } = useTheme();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [selectedAssessmentIndex, setSelectedAssessmentIndex] = useState(0);
  const [questionnaireMap, setQuestionnaireMap] = useState<Record<string, any>>({});
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const [questions, setQuestions] = useState<QuestionItem[]>(FALLBACK_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<{ questionIndex: number; selectedScore: number; selectedLabel: string }[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const completedRef = useRef(false);
  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    let active = true;
    api
      .get<{ questions?: { id: string; prompt: string; options: { label: string; score: number }[] }[] }>(
        '/risk/questionnaire',
        { anonymous: true },
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

  
  const fetchRiskHistory = async () => {
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const token = authStore.accessToken;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Build question map
      const map: Record<string, any> = {};
      questions.forEach((q) => {
        map[q.id] = { prompt: q.question, options: q.options };
      });
      setQuestionnaireMap(map);

      const hRes = await fetch(`${API_URL}/risk/history`, { headers });
      if (hRes.ok) {
        const hData = await hRes.json();
        const records = (Array.isArray(hData) ? hData : []).slice(0, 3);
        setHistoryList(records);
        setSelectedAssessmentIndex(0);
        if (records.length > 0) {
          await AsyncStorage.setItem('techartha_risk_history_cache', JSON.stringify(records)).catch(() => {});
        }
      } else {
        const cached = await AsyncStorage.getItem('techartha_risk_history_cache').catch(() => null);
        if (cached) {
          const parsed = JSON.parse(cached);
          setHistoryList((Array.isArray(parsed) ? parsed : []).slice(0, 3));
        }
      }
    } catch (err) {
      console.log('Error fetching risk history:', err);
      const cached = await AsyncStorage.getItem('techartha_risk_history_cache').catch(() => null);
      if (cached) {
        const parsed = JSON.parse(cached);
        setHistoryList((Array.isArray(parsed) ? parsed : []).slice(0, 3));
      }
    } finally {
      setHistoryLoading(false);
    }
  };

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
      }, 400);
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

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.message || 'Failed to calculate risk profile');
        }

        const profileObj = data?.data || data;
        const cat = profileObj?.category;
        const finalScore = profileObj?.score;
        const reasons = Array.isArray(data?.explanation)
          ? data.explanation
          : typeof profileObj?.reasons === 'string'
          ? JSON.parse(profileObj.reasons)
          : Array.isArray(profileObj?.reasons)
          ? profileObj.reasons
          : [];

        if (!cat || typeof finalScore !== 'number') {
          throw new Error('Invalid risk assessment response from server.');
        }

        const persistedPayload = {
          id: profileObj?.id,
          score: finalScore,
          category: cat,
          reasons,
          version: profileObj?.version,
          updatedAt: profileObj?.updatedAt || new Date().toISOString(),
        };
        await AsyncStorage.setItem('techartha_latest_risk_profile', JSON.stringify(persistedPayload)).catch(() => {});

        completedRef.current = true;
        setSubmitting(false);
        navigation.replace('RiskResult', {
          category: cat,
          score: finalScore,
          reasons,
          updatedAt: persistedPayload.updatedAt,
        });
      } catch (err: any) {
        setSubmitting(false);
        Alert.alert(
          'Could Not Save Risk Assessment',
          err?.message || 'Please check your connection and tap your last answer again to submit.',
        );
        // Step back one answer so the user can retry submitting the final answer cleanly
        setHistory(newHistory.slice(0, -1));
      }
    }
  };

  // Revert back to the question and allow choosing a different option
  const handleGoBackToQuestion = (targetIndex: number) => {
    if (isBotTyping || submitting) return;
    const updatedHistory = history.slice(0, targetIndex);
    setHistory(updatedHistory);
    setCurrentIndex(targetIndex);
    scrollToBottom();
  };

  const currentQ = questions[currentIndex];
  const progressPercent = questions.length
    ? Math.min(100, Math.round((history.length / questions.length) * 100))
    : 0;

  // Prompt confirmation if user attempts to leave mid-assessment (never after completion)
  useEffect(() => {
    return registerUnsavedChecker(
      'risk_assessment',
      () => history.length > 0 && !submitting && !completedRef.current,
    );
  }, [history.length, submitting]);

  if (submitting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3C3985" />
        <Text style={styles.loadingText}>
          {t('risk.calc', { defaultValue: 'Analyzing your profile with TechArtha Risk Profiler...' })}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <StatusBar style={colors.statusBar} />
      <Header title="Risk Assessment" />

      {/* Bot Sub-Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={[styles.headerBotInfo, { flex: 1, paddingRight: 8 }]}>
            <View style={styles.headerAvatar}>
              <HeadsetIcon color="#36358D" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>TechArtha Risk Profiler</Text>
              <Pressable
                style={styles.riskHistoryBtnBelowTitle}
                onPress={fetchRiskHistory}
                accessibilityLabel="Risk History"
                accessibilityRole="button"
              >
                <Ionicons name="time-outline" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.riskHistoryBtnBelowTitleText}>Risk History</Text>
              </Pressable>
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
          <View style={[styles.botBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.botText, { color: colors.textPrimary }]}>
              👋 Welcome! I'll guide you through our SEBI-aligned risk assessment to determine your investor profile and
              illustrative asset allocation.
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
                  <Text style={styles.questionIndexLabel}>
                    Question {item.questionIndex + 1} of {questions.length}
                  </Text>
                  <Text style={styles.botText}>{t(`risk.q${qItem?.id}.q`, { defaultValue: qItem?.question })}</Text>
                </View>
              </View>

              {/* User selected answer bubble with User avatar & bottom-right Edit Icon */}
              <View style={styles.userRow}>
                <View style={styles.userBubbleWrapper}>
                  <View style={[styles.userBubble, { backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF', borderColor: colors.border }]}>
                    <Text style={styles.userRoleLabel}>You</Text>
                    <Text style={[styles.userText, { color: colors.textPrimary }]}>
                      {t(`risk.q${qItem?.id}.${item.selectedScore}`, { defaultValue: item.selectedLabel })}
                    </Text>

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
                    <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
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
              <Text style={styles.typingText}>Preparing next question...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal: My Risk Assessment History */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.canvas }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>My Risk Assessment History</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Latest 2 Completed Assessment Records</Text>
            </View>
            <Pressable
              style={[styles.modalCloseBtn, { backgroundColor: isDark ? colors.surfaceMuted : '#F1F5F9' }]}
              onPress={() => setShowHistoryModal(false)}
              accessibilityLabel="Close History"
            >
              <Text style={[styles.modalCloseText, { color: colors.textPrimary }]}>✕</Text>
            </Pressable>
          </View>

          {historyLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your assessment logs...</Text>
            </View>
          ) : historyList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Assessment History Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Complete this 12-question suitability assessment to record your verified investor category.
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {historyList.length > 1 && (
                <View style={[styles.selectorContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                  <Text style={[styles.selectorLabel, { color: colors.textMuted }]}>Select Assessment Date:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
                    {historyList.slice(0, 3).map((item, idx) => {
                      const isSelected = idx === selectedAssessmentIndex;
                      const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                      return (
                        <Pressable
                          key={item.id || `hist-${idx}`}
                          style={[
                            styles.tabBtn,
                            { backgroundColor: isDark ? colors.surfaceMuted : '#F1F5F9', borderColor: colors.border },
                            isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                          ]}
                          onPress={() => setSelectedAssessmentIndex(idx)}
                        >
                          <Text style={[styles.tabBtnText, { color: isDark ? colors.textPrimary : '#4A5568' }, isSelected && { color: '#FFFFFF', fontWeight: '800' }]}>
                            {dateStr} ({item.category})
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {historyList[selectedAssessmentIndex] && (
                <View style={[styles.infoBanner, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF', borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoCategory, { color: colors.primary }]}>
                      {historyList[selectedAssessmentIndex].category} Investor
                    </Text>
                    <Text style={[styles.infoDate, { color: colors.textSecondary }]}>
                      Assessed on {new Date(historyList[selectedAssessmentIndex].createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </Text>
                    {historyList.length > 1 && selectedAssessmentIndex === 0 && (
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: '600' }}>
                        Trend: {historyList[0].score - historyList[1].score > 0
                          ? `▲ +${historyList[0].score - historyList[1].score} pts higher than previous assessment`
                          : historyList[0].score - historyList[1].score < 0
                          ? `▼ ${historyList[0].score - historyList[1].score} pts lower than previous assessment`
                          : '═ Score unchanged from previous assessment'}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.scoreBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.scoreBadgeText}>Score: {historyList[selectedAssessmentIndex].score} / 60</Text>
                  </View>
                </View>
              )}

              <ScrollView contentContainerStyle={styles.historyChatScroll} showsVerticalScrollIndicator={false}>
                {historyList[selectedAssessmentIndex] &&
                  Object.entries(historyList[selectedAssessmentIndex].answers || {}).map(([qId, scoreVal], index) => {
                    const qDef = questionnaireMap[qId];
                    const prompt = qDef?.prompt || `Question ${index + 1}: ${qId}`;
                    const options = qDef?.options || [];
                    const optDef = options.find((o: any) => o.score === scoreVal);
                    const answerLabel = optDef?.label || `Option Score: ${scoreVal}`;

                    return (
                      <View key={`qa-${index}`} style={styles.historyTurn}>
                        <View style={styles.botRow}>
                          <View style={styles.botAvatarSmall}>
                            <HeadsetIcon color={colors.primary} size={14} />
                          </View>
                          <View style={[styles.botBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={styles.questionIndexLabel}>Question {index + 1}</Text>
                            <Text style={[styles.botText, { color: colors.textPrimary }]}>{prompt}</Text>

                            {options.length > 0 && (
                              <View style={[styles.historyOptionsBox, { backgroundColor: isDark ? colors.surfaceMuted : '#F8FAFC', borderColor: colors.border }]}>
                                <Text style={[styles.historyOptionsHeader, { color: colors.textMuted }]}>Available Options:</Text>
                                {options.map((opt: any, optIdx: number) => {
                                  const wasChosen = opt.score === scoreVal;
                                  return (
                                    <View
                                      key={`h-opt-${optIdx}`}
                                      style={[
                                        styles.historyOptionItem,
                                        { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: colors.border },
                                        wasChosen && { borderColor: '#10B981', backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }
                                      ]}
                                    >
                                      <Text style={[styles.historyOptionLetter, wasChosen && { color: '#059669', fontWeight: '800' }]}>
                                        {String.fromCharCode(65 + optIdx)}.
                                      </Text>
                                      <Text style={[styles.historyOptionText, { color: colors.textPrimary }, wasChosen && { color: '#059669', fontWeight: '700' }]}>
                                        {opt.label}
                                      </Text>
                                      {wasChosen && (
                                        <View style={styles.chosenPill}>
                                          <Text style={styles.chosenPillText}>CHOSEN</Text>
                                        </View>
                                      )}
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        </View>

                        <View style={styles.historyUserRow}>
                          <View style={[styles.historyUserBubble, { backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF', borderColor: colors.border }]}>
                            <Text style={styles.historyUserRoleLabel}>You answered</Text>
                            <Text style={[styles.historyUserText, { color: colors.textPrimary }]}>{answerLabel}</Text>
                          </View>
                          <View style={styles.historyUserAvatarSmall}>
                            <Text style={{ fontSize: 12 }}>👤</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  loadingContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: '#3C3985', fontWeight: '700', fontSize: 16, marginTop: 16, textAlign: 'center' },
  header: { backgroundColor: '#36358D', paddingTop: 12, paddingBottom: 16, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerBotInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#F7941E', borderRadius: 3 },
  chatScroll: { padding: 16, paddingBottom: 40 },
  messageTurn: { marginBottom: 16 },
  activeTurn: { marginBottom: 16 },
  botRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10, maxWidth: '92%' },
  botAvatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EBEBFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  botBubble: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  questionIndexLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F7941E',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  botText: { color: '#102A54', fontSize: 15, lineHeight: 22, fontWeight: '600' },

  userRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  userAvatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EDF2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  userBubbleWrapper: { alignItems: 'flex-end', maxWidth: '84%' },
  userBubble: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderTopRightRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 110,
    paddingBottom: 10,
    paddingRight: 28,
    position: 'relative',
  },
  userRoleLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2,
    textAlign: 'right',
  },
  userText: { color: '#0F172A', fontSize: 15, fontWeight: '700', lineHeight: 21 },
  editIconBtn: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F0EFFB',
    borderWidth: 1,
    borderColor: '#D4D2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconBtnPressed: { backgroundColor: '#D4D2F5', opacity: 0.8 },

  optionsContainer: { marginLeft: 38, marginTop: 4, gap: 8 },
  optionsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  tapInstruction: { fontSize: 12, color: '#718096', fontWeight: '700' },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  optionCardPressed: { borderColor: '#3C3985', backgroundColor: '#F0EFFF' },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F3F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLetterText: { fontSize: 13, fontWeight: '800', color: '#3C3985' },
  optionLabel: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#102A54' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  typingText: { fontSize: 13, color: '#718096', fontWeight: '600', flexShrink: 1 },
  historyHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginRight: 4,
  },
  historyHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  riskHistoryBtnBelowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  riskHistoryBtnBelowTitleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  subHistoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  subHistoryPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalSubtitle: { fontSize: 12, marginTop: 2 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { fontSize: 16, fontWeight: '800' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  selectorContainer: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  selectorLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  tabsRow: { gap: 8 },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  tabBtnText: { fontSize: 12, fontWeight: '600' },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoCategory: { fontSize: 15, fontWeight: '800' },
  infoDate: { fontSize: 12, marginTop: 2 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  scoreBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  historyChatScroll: { padding: 16, paddingBottom: 40 },
  historyTurn: { marginBottom: 16 },
  historyOptionsBox: { marginTop: 10, padding: 10, borderRadius: 10, borderWidth: 1, gap: 6 },
  historyOptionsHeader: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  historyOptionItem: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, borderWidth: 1, gap: 8 },
  historyOptionLetter: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  historyOptionText: { fontSize: 12, flex: 1 },
  chosenPill: { backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  chosenPillText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  historyUserRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8 },
  historyUserBubble: { padding: 10, borderRadius: 12, borderWidth: 1, maxWidth: '80%' },
  historyUserRoleLabel: { fontSize: 9, color: '#64748B', fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
  historyUserText: { fontSize: 13, fontWeight: '600' },
  historyUserAvatarSmall: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },

});
