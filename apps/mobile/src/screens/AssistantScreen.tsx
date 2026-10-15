import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { HeadsetIcon, UserIcon } from '../components/Icons';
import { useTranslation } from 'react-i18next';
import { authStore } from '../store/auth';
import { api } from '../services/api/client';

type Message = { id: string; from: 'bot' | 'user'; text: string };

const GREETING: Message = {
  id: 'greet',
  from: 'bot',
  text: "Hello! 👋 I'm your Client Assistant. I can help you with your investments, goals, KYC and account questions. How can I help you today?",
};

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface RiskHistoryItem {
  id: string;
  version: number;
  score: number;
  category: string;
  answers: Record<string, number>;
  reasons: string[];
  createdAt: string;
}

export const AssistantScreen = () => {
  const { i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Risk Assessment History state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyList, setHistoryList] = useState<RiskHistoryItem[]>([]);
  const [questionnaireMap, setQuestionnaireMap] = useState<Record<string, { prompt: string; options: { label: string; score: number }[] }>>({});
  const [selectedAssessmentIndex, setSelectedAssessmentIndex] = useState(0);

  const fetchRiskHistory = async () => {
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const token = authStore.accessToken;
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // 1. Fetch questionnaire structure to accurately display original questions & all options
      const qRes = await fetch(`${API_URL}/risk/questionnaire`, { headers });
      if (qRes.ok) {
        const qData = await qRes.json();
        const map: Record<string, any> = {};
        (qData.questions || []).forEach((q: any) => {
          map[q.id] = { prompt: q.prompt, options: q.options };
        });
        setQuestionnaireMap(map);
      }

      // 2. Fetch history records from GET /risk/history
      const hRes = await fetch(`${API_URL}/risk/history`, { headers });
      if (hRes.ok) {
        const hData = await hRes.json();
        setHistoryList(Array.isArray(hData) ? hData : []);
        setSelectedAssessmentIndex(0);
      }
    } catch (err) {
      console.log('Error fetching risk history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg: Message = { id: `u-${Date.now()}`, from: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const res = await api.post<{ text: string }>('/assistant/messages', {
        message: text,
        locale: i18n.language || 'en',
      });
      const botReply = res?.text || "I'm here to help with your investments and financial questions.";
      const botMsg: Message = {
        id: `b-${Date.now()}`,
        from: 'bot',
        text: botReply,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      const errorReply = e?.status === 401
        ? 'Please sign in to access personalized portfolio and assistant insights.'
        : 'Unable to reach assistant service at the moment. Please try again.';
      const botMsg: Message = {
        id: `b-${Date.now()}`,
        from: 'bot',
        text: errorReply,
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const currentAssessment = historyList[selectedAssessmentIndex];

  return (
    <SafeAreaView style={s.safe} edges={['right', 'left']}>
      <StatusBar style="dark" />
      <Header title="Client Assistant" />

      {/* Bot Header with "My Risk Assessment History" Button */}
      <View style={s.botHeader}>
        <View style={s.botHeaderLeft}>
          <View style={s.avatar}>
            <HeadsetIcon color="#3C3985" size={24} />
          </View>
          <View>
            <Text style={s.botName}>Client Assistant</Text>
            <Text style={s.botStatus}>● Online</Text>
          </View>
        </View>

        {/* Action Button */}
        <Pressable style={s.historyActionBtn} onPress={fetchRiskHistory}>
          <Text style={s.historyActionText}>📊 Risk History</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={s.chat}>
          {messages.map((m) => (
            <View key={m.id} style={[s.bubble, m.from === 'user' ? s.userBubble : s.botBubble]}>
              <Text style={m.from === 'user' ? s.userText : s.botText}>{m.text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={s.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type your message..."
            style={s.input}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <Pressable
            style={[s.sendBtn, (!input.trim() || sending) && { opacity: 0.5 }]}
            onPress={sendMessage}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.sendText}>➤</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Modal: My Risk Assessment History */}
      <Modal visible={showHistoryModal} animationType="slide" transparent={false} onRequestClose={() => setShowHistoryModal(false)}>
        <SafeAreaView style={s.modalSafe}>
          {/* Modal Header */}
          <View style={s.modalHeader}>
            <View>
              <Text style={s.modalTitle}>My Risk Assessment History</Text>
              <Text style={s.modalSubtitle}>Read-Only Conversational Log</Text>
            </View>
            <Pressable style={s.modalCloseBtn} onPress={() => setShowHistoryModal(false)}>
              <Text style={s.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          {historyLoading ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="large" color="#3C3985" />
              <Text style={s.loadingText}>Loading your assessment logs...</Text>
            </View>
          ) : historyList.length === 0 ? (
            <View style={s.emptyContainer}>
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={s.emptyTitle}>No Assessment History Found</Text>
              <Text style={s.emptySubtitle}>You haven't completed a risk profiling assessment yet.</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {/* Assessment Selector (if multiple assessments exist) */}
              {historyList.length > 1 && (
                <View style={s.selectorContainer}>
                  <Text style={s.selectorLabel}>Select Assessment Date:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
                    {historyList.map((item, idx) => {
                      const isSelected = idx === selectedAssessmentIndex;
                      const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                      return (
                        <Pressable
                          key={item.id}
                          style={[s.tabBtn, isSelected && s.tabBtnSelected]}
                          onPress={() => setSelectedAssessmentIndex(idx)}
                        >
                          <Text style={[s.tabBtnText, isSelected && s.tabBtnTextSelected]}>
                            {dateStr} ({item.category})
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Assessment Info Banner */}
              {currentAssessment && (
                <View style={s.infoBanner}>
                  <View>
                    <Text style={s.infoCategory}>{currentAssessment.category} Investor</Text>
                    <Text style={s.infoDate}>
                      Assessed on {new Date(currentAssessment.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </Text>
                  </View>
                  <View style={s.scoreBadge}>
                    <Text style={s.scoreBadgeText}>Score: {currentAssessment.score}</Text>
                  </View>
                </View>
              )}

              {/* Conversation Log (Chat format) */}
              <ScrollView contentContainerStyle={s.historyChatScroll} showsVerticalScrollIndicator={false}>
                {currentAssessment &&
                  Object.entries(currentAssessment.answers || {}).map(([qId, scoreVal], index) => {
                    const qDef = questionnaireMap[qId];
                    const prompt = qDef?.prompt || `Question ${index + 1}: ${qId}`;
                    const options = qDef?.options || [];
                    const optDef = options.find((o) => o.score === scoreVal);
                    const answerLabel = optDef?.label || `Option Score: ${scoreVal}`;

                    return (
                      <View key={`qa-${index}`} style={s.historyTurn}>
                        {/* Bot Question Bubble with all available options displayed */}
                        <View style={s.botRow}>
                          <View style={s.botAvatarSmall}>
                            <HeadsetIcon color="#3C3985" size={14} />
                          </View>
                          <View style={s.botBubble}>
                            <Text style={s.questionIndexLabel}>Question {index + 1}</Text>
                            <Text style={s.botText}>{prompt}</Text>

                            {/* Display questionnaire options list under question */}
                            {options.length > 0 && (
                              <View style={s.historyOptionsBox}>
                                <Text style={s.historyOptionsHeader}>Available Options:</Text>
                                {options.map((opt, optIdx) => {
                                  const wasChosen = opt.score === scoreVal;
                                  return (
                                    <View
                                      key={`h-opt-${optIdx}`}
                                      style={[s.historyOptionItem, wasChosen && s.historyOptionItemChosen]}
                                    >
                                      <Text style={[s.historyOptionLetter, wasChosen && s.historyOptionLetterChosen]}>
                                        {String.fromCharCode(65 + optIdx)}.
                                      </Text>
                                      <Text style={[s.historyOptionText, wasChosen && s.historyOptionTextChosen]}>
                                        {opt.label}
                                      </Text>
                                      {wasChosen && (
                                        <View style={s.chosenPill}>
                                          <Text style={s.chosenPillText}>✓ Selected</Text>
                                        </View>
                                      )}
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        </View>

                        {/* User Answer Bubble with user avatar and neutral styling */}
                        <View style={s.historyUserRow}>
                          <View style={s.historyUserBubble}>
                            <Text style={s.historyUserRoleLabel}>You answered</Text>
                            <Text style={s.historyUserText}>{answerLabel}</Text>
                          </View>
                          <View style={s.historyUserAvatarSmall}>
                            <UserIcon color="#4A5568" size={14} />
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
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  botHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  botHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EBEBFA', alignItems: 'center', justifyContent: 'center' },
  botName: { fontSize: 16, fontWeight: '800', color: '#102A54' },
  botStatus: { fontSize: 12, color: '#48BB78', fontWeight: '600', marginTop: 2 },
  historyActionBtn: {
    backgroundColor: '#EBEBFA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D4D2F5',
  },
  historyActionText: { color: '#3C3985', fontSize: 12, fontWeight: '800' },
  chat: { padding: 16, gap: 10 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderBottomLeftRadius: 4 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#3C3985', borderBottomRightRadius: 4 },
  botText: { color: '#102A54', fontSize: 15, lineHeight: 21 },
  userText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  input: { flex: 1, backgroundColor: '#F8F9FB', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3C3985', alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontSize: 18 },

  // Modal styles
  modalSafe: { flex: 1, backgroundColor: '#F8F9FB' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#3C3985',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  modalSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: '#3C3985', fontWeight: '700', marginTop: 14, fontSize: 15 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#102A54', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#718096', textAlign: 'center', lineHeight: 20 },
  selectorContainer: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  selectorLabel: { fontSize: 11, fontWeight: '800', color: '#718096', textTransform: 'uppercase', marginBottom: 8 },
  tabsRow: { flexDirection: 'row', gap: 8 },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#F0F3F8', borderWidth: 1, borderColor: '#E2E8F0' },
  tabBtnSelected: { backgroundColor: '#3C3985', borderColor: '#3C3985' },
  tabBtnText: { fontSize: 12, fontWeight: '700', color: '#4A5568' },
  tabBtnTextSelected: { color: '#fff' },
  infoBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EBEBFA',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D4D2F5',
  },
  infoCategory: { fontSize: 16, fontWeight: '800', color: '#3C3985' },
  infoDate: { fontSize: 12, color: '#718096', marginTop: 2 },
  scoreBadge: { backgroundColor: '#F7941E', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  scoreBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  historyChatScroll: { padding: 16, paddingBottom: 32 },
  historyTurn: { marginBottom: 18 },
  botRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, maxWidth: '90%' },
  botAvatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EBEBFA', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  questionIndexLabel: { fontSize: 10, fontWeight: '800', color: '#F7941E', textTransform: 'uppercase', marginBottom: 2 },
  
  // Options list inside history bot bubble
  historyOptionsBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 6 },
  historyOptionsHeader: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 2 },
  historyOptionItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#F8FAFC' },
  historyOptionItemChosen: { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' },
  historyOptionLetter: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  historyOptionLetterChosen: { color: '#3C3985' },
  historyOptionText: { flex: 1, fontSize: 12, color: '#475569', fontWeight: '500' },
  historyOptionTextChosen: { color: '#1E1B4B', fontWeight: '700' },
  chosenPill: { backgroundColor: '#3C3985', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  chosenPillText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // User side styling (clean neutral card + user avatar)
  historyUserRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  historyUserAvatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EDF2F7', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  historyUserBubble: { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderTopRightRadius: 4, borderWidth: 1.5, borderColor: '#CBD5E1', maxWidth: '82%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  historyUserRoleLabel: { fontSize: 9, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 2, textAlign: 'right' },
  historyUserText: { color: '#0F172A', fontSize: 14, fontWeight: '700', lineHeight: 19 },
});
