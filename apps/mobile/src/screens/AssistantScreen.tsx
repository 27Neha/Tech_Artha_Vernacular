import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { HeadsetIcon } from '../components/Icons';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { authStore } from '../store/auth';
import {
  checkMicrophonePermission,
  requestMicrophonePermission,
  openPhoneSettings,
} from '../utils/permissions';
import {
  startRealSpeechRecognition,
  stopRealSpeechRecognition,
  abortRealSpeechRecognition,
  checkSpeechRecognitionAvailability,
  getSpeechRecognitionLocale,
} from '../utils/speechRecognition';

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
  const navigation = useNavigation<any>();
  const { i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollViewInstance>(null);

  // Risk Assessment History state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyList, setHistoryList] = useState<RiskHistoryItem[]>([]);
  const [questionnaireMap, setQuestionnaireMap] = useState<Record<string, { prompt: string; options: { label: string; score: number }[] }>>({});
  const [selectedAssessmentIndex, setSelectedAssessmentIndex] = useState(0);

  // Voice Recording & Speech Recognition state
  const [hasMicPermission, setHasMicPermission] = useState<boolean>(false);
  const [showPermissionModal, setShowPermissionModal] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [voiceReviewHint, setVoiceReviewHint] = useState<boolean>(false);
  const [speechErrorMsg, setSpeechErrorMsg] = useState<string | null>(null);

  const timerRef = useRef<any>(null);
  const previousInputRef = useRef<string>('');
  const transcriptAccRef = useRef<string>('');

  const currentLang = i18n.language || 'en';
  const targetLocale = getSpeechRecognitionLocale(currentLang);

  // Refresh permission on app resume & screen focus
  const refreshPermission = useCallback(async () => {
    const granted = await checkMicrophonePermission();
    setHasMicPermission(granted);
    return granted;
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshPermission();
    }, [refreshPermission])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        await refreshPermission();
      } else if (state === 'background') {
        // Automatically stop recording when app goes into background
        if (isRecording) {
          abortRealSpeechRecognition();
          setIsRecording(false);
          setIsTranscribing(false);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }
    });
    return () => sub.remove();
  }, [refreshPermission, isRecording]);

  // Clean up timer and speech sessions on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      abortRealSpeechRecognition();
    };
  }, []);

  const fetchRiskHistory = async () => {
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const token = authStore.accessToken;
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const qRes = await fetch(`${API_URL}/risk/questionnaire`, { headers });
      if (qRes.ok) {
        const qData = await qRes.json();
        const map: Record<string, any> = {};
        (qData.questions || []).forEach((q: any) => {
          map[q.id] = { prompt: q.prompt, options: q.options };
        });
        setQuestionnaireMap(map);
      }

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

  const sendMessage = () => {
    const text = input.trim();
    if (!text || isRecording || isTranscribing) return;
    const userMsg: Message = { id: `u-${Date.now()}`, from: 'user', text };
    const botMsg: Message = {
      id: `b-${Date.now()}`,
      from: 'bot',
      text: 'Thanks for your message! Our assistant will be fully available soon.',
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
    setVoiceReviewHint(false);
    setSpeechErrorMsg(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  // Voice Input Flow
  const handleMicPress = async () => {
    if (isRecording) {
      stopVoiceRecording();
      return;
    }

    if (isTranscribing) return;

    setSpeechErrorMsg(null);

    // Check microphone permission
    const granted = await refreshPermission();
    if (granted) {
      startVoiceRecording();
    } else {
      setShowPermissionModal(true);
    }
  };

  const handleRequestPermission = async () => {
    setShowPermissionModal(false);
    const result = await requestMicrophonePermission();

    if (result === 'granted') {
      setHasMicPermission(true);
      startVoiceRecording();
    } else if (result === 'never_ask_again') {
      setHasMicPermission(false);
      Alert.alert(
        'Microphone Permission Blocked',
        'Microphone access is currently disabled for TechArtha in your phone settings. Please enable it in system settings to use voice input.',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Open Phone Settings',
            onPress: () => openPhoneSettings(),
          },
          {
            text: 'Permissions Center',
            onPress: () => navigation.navigate('PhonePermissions'),
          },
        ]
      );
    } else {
      setHasMicPermission(false);
      Alert.alert(
        'Permission Not Granted',
        'Microphone access was denied. You can continue typing your questions using the keyboard.'
      );
    }
  };

  const startVoiceRecording = async () => {
    previousInputRef.current = input;
    transcriptAccRef.current = '';
    setSpeechErrorMsg(null);
    setVoiceReviewHint(false);

    // Check availability
    const avail = await checkSpeechRecognitionAvailability();
    if (!avail.available) {
      if (avail.isDevelopmentBuildRequired) {
        Alert.alert(
          'Expo Development Build Required',
          'Native voice recognition requires an Expo Development Build or Web browser because standard Expo Go does not bundle device SpeechRecognizer engines.\n\nTo test actual voice-to-text recognition:\n1. Run via Expo Development Build: npx expo run:android\n2. Or test in Web: npx expo start --web',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Speech Recognition Unavailable', avail.reason || 'Speech recognition engine is not supported on this device.');
      }
      return;
    }

    setIsRecording(true);
    setRecordSeconds(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);

    // Launch genuine speech-to-text
    const started = await startRealSpeechRecognition(currentLang, {
      onStart: () => {
        setIsTranscribing(false);
      },
      onResult: (transcript: string, isFinal: boolean) => {
        transcriptAccRef.current = transcript;
        // Stream recognized words directly into input box in real time
        setInput(transcript);
        if (isFinal) {
          setIsTranscribing(false);
          setVoiceReviewHint(true);
        }
      },
      onError: (errorMessage: string, errorCode?: string) => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecording(false);
        setIsTranscribing(false);
        setSpeechErrorMsg(errorMessage);

        // Do not overwrite user text or inject mock text
        if (!transcriptAccRef.current) {
          setInput(previousInputRef.current);
        }

        // Only alert for severe errors, not simple abort
        if (errorCode !== 'aborted') {
          Alert.alert('Speech Recognition Notice', errorMessage);
        }
      },
      onEnd: () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecording(false);
        setIsTranscribing(false);
        if (transcriptAccRef.current) {
          setVoiceReviewHint(true);
        }
      },
    });

    if (!started) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
    }
  };

  const cancelVoiceRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    abortRealSpeechRecognition();
    setIsRecording(false);
    setIsTranscribing(false);
    setRecordSeconds(0);
    // Restore previous text without changes
    setInput(previousInputRef.current);
    setSpeechErrorMsg(null);
  };

  const stopVoiceRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setIsTranscribing(true);

    // Request speech recognizer to stop capturing and finish transcription
    stopRealSpeechRecognition();

    setTimeout(() => {
      setIsTranscribing(false);
      if (transcriptAccRef.current) {
        setVoiceReviewHint(true);
      }
    }, 800);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
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
            <Text style={s.botStatus}>● Online ({targetLocale})</Text>
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

        {/* ERROR BANNER IF RECOGNITION FAILED */}
        {speechErrorMsg && !isRecording && (
          <View style={s.errorBar}>
            <Ionicons name="warning-outline" size={16} color="#DC2626" />
            <Text style={s.errorText}>{speechErrorMsg}</Text>
            <Pressable onPress={() => setSpeechErrorMsg(null)} hitSlop={8}>
              <Ionicons name="close" size={16} color="#DC2626" />
            </Pressable>
          </View>
        )}

        {/* VOICE TRANSCRIBING INDICATOR */}
        {isTranscribing && (
          <View style={s.transcribingBar}>
            <ActivityIndicator size="small" color="#3C3985" />
            <Text style={s.transcribingText}>Processing spoken words ({targetLocale})...</Text>
          </View>
        )}

        {/* VOICE REVIEW HINT BANNER */}
        {voiceReviewHint && !isRecording && !isTranscribing && (
          <View style={s.voiceReviewBar}>
            <Ionicons name="mic" size={14} color="#3C3985" />
            <Text style={s.voiceReviewText}>Voice transcribed. Review or edit your query before sending.</Text>
            <Pressable onPress={() => setVoiceReviewHint(false)} hitSlop={8}>
              <Ionicons name="close" size={14} color="#718096" />
            </Pressable>
          </View>
        )}

        {/* VOICE RECORDING ACTIVE BAR */}
        {isRecording && (
          <View style={s.recordingBar}>
            <View style={s.recordingLeft}>
              <View style={s.recDot} />
              <Text style={s.recTimer}>{formatTime(recordSeconds)}</Text>
              <View style={s.waveContainer}>
                <View style={[s.waveBar, { height: 10 }]} />
                <View style={[s.waveBar, { height: 18 }]} />
                <View style={[s.waveBar, { height: 14 }]} />
                <View style={[s.waveBar, { height: 20 }]} />
                <View style={[s.waveBar, { height: 12 }]} />
              </View>
              <Text style={s.recText}>Listening in {targetLocale}...</Text>
            </View>

            <View style={s.recordingActions}>
              <Pressable style={s.recCancelBtn} onPress={cancelVoiceRecording}>
                <Ionicons name="close-circle-outline" size={18} color="#64748B" />
                <Text style={s.recCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={s.recDoneBtn} onPress={stopVoiceRecording}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={s.recDoneText}>Done</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* CHAT INPUT BAR WITH MICROPHONE ICON BESIDE SEND BUTTON */}
        <View style={s.inputRow}>
          <View style={[s.inputWrapper, isRecording && s.inputWrapperRecording]}>
            <TextInput
              value={input}
              onChangeText={(txt) => {
                setInput(txt);
                if (voiceReviewHint) setVoiceReviewHint(false);
              }}
              placeholder={isRecording ? `Listening in ${targetLocale}...` : "Type your message..."}
              placeholderTextColor="#A0AEC0"
              style={s.input}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              editable={!isRecording && !isTranscribing}
            />
            <Pressable
              style={[s.micBtn, isRecording && s.micBtnRecording]}
              onPress={handleMicPress}
              hitSlop={6}
              accessibilityLabel={isRecording ? "Stop recording" : "Voice input"}
            >
              <Ionicons
                name={isRecording ? "mic" : "mic-outline"}
                size={20}
                color={isRecording ? "#DC2626" : "#3C3985"}
              />
            </Pressable>
          </View>

          <Pressable
            style={[s.sendBtn, (!input.trim() || isRecording || isTranscribing) && { opacity: 0.5 }]}
            onPress={sendMessage}
            disabled={!input.trim() || isRecording || isTranscribing}
            accessibilityLabel="Send message"
          >
            <Text style={s.sendText}>➤</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* MICROPHONE PERMISSION EXPLANATION MODAL */}
      <Modal visible={showPermissionModal} transparent animationType="fade" onRequestClose={() => setShowPermissionModal(false)}>
        <View style={s.permModalOverlay}>
          <View style={s.permModalCard}>
            <View style={s.permIconBox}>
              <Ionicons name="mic" size={28} color="#3C3985" />
            </View>
            <Text style={s.permModalTitle}>Microphone Access Required</Text>
            <Text style={s.permModalBody}>
              TechArtha needs microphone access to transcribe your spoken voice queries in Indian regional languages ({targetLocale}) using device speech recognition.
            </Text>
            <View style={s.permSecurityNote}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#059669" />
              <Text style={s.permSecurityText}>
                Your audio is processed strictly on-device to transcribe your question. Audio recordings are never stored or uploaded externally.
              </Text>
            </View>
            <View style={s.permModalActions}>
              <Pressable style={s.permBtnSecondary} onPress={() => setShowPermissionModal(false)}>
                <Text style={s.permBtnSecondaryText}>Not Now</Text>
              </Pressable>
              <Pressable style={s.permBtnPrimary} onPress={handleRequestPermission}>
                <Text style={s.permBtnPrimaryText}>Allow Access</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: My Risk Assessment History */}
      <Modal visible={showHistoryModal} animationType="slide" transparent={false} onRequestClose={() => setShowHistoryModal(false)}>
        <SafeAreaView style={s.modalSafe}>
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
                        <View style={s.botRow}>
                          <View style={s.botAvatarSmall}>
                            <HeadsetIcon color="#3C3985" size={14} />
                          </View>
                          <View style={s.botBubble}>
                            <Text style={s.questionIndexLabel}>Question {index + 1}</Text>
                            <Text style={s.botText}>{prompt}</Text>

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
                                          <Text style={s.chosenPillText}>CHOSEN</Text>
                                        </View>
                                      )}
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        </View>

                        <View style={s.historyUserRow}>
                          <View style={s.historyUserBubble}>
                            <Text style={s.historyUserRoleLabel}>You answered</Text>
                            <Text style={s.historyUserText}>{answerLabel}</Text>
                          </View>
                          <View style={s.historyUserAvatarSmall}>
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
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  botHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  botHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EBEBFA', alignItems: 'center', justifyContent: 'center' },
  botName: { fontSize: 16, fontWeight: '800', color: '#102A54' },
  botStatus: { fontSize: 12, color: '#10B981', marginTop: 2, fontWeight: '700' },
  historyActionBtn: {
    backgroundColor: '#EEF2FF',
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

  // Input area & microphone button
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingRight: 6,
  },
  inputWrapperRecording: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#102A54' },
  micBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  micBtnRecording: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3C3985', alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontSize: 18 },

  // Recording bar
  recordingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  recordingLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC2626' },
  recTimer: { fontSize: 14, fontWeight: '800', color: '#DC2626' },
  waveContainer: { flexDirection: 'row', alignItems: 'center', gap: 3, marginHorizontal: 4 },
  waveBar: { width: 3, backgroundColor: '#EF4444', borderRadius: 2 },
  recText: { fontSize: 12, fontWeight: '600', color: '#991B1B' },
  recordingActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recCancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#F1F5F9' },
  recCancelText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  recDoneBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#3C3985' },
  recDoneText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  // Transcribing bar
  transcribingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E7FF',
  },
  transcribingText: { fontSize: 13, fontWeight: '700', color: '#3C3985' },

  // Error Bar
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  errorText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#B91C1C' },

  // Voice review hint
  voiceReviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  voiceReviewText: { flex: 1, fontSize: 11, fontWeight: '600', color: '#166534' },

  // Permission Modal
  permModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  permModalCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center' },
  permIconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  permModalTitle: { fontSize: 18, fontWeight: '800', color: '#102A54', textAlign: 'center', marginBottom: 8 },
  permModalBody: { fontSize: 13, color: '#4A5568', textAlign: 'center', lineHeight: 19, marginBottom: 14 },
  permSecurityNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', padding: 10, borderRadius: 12, marginBottom: 20 },
  permSecurityText: { flex: 1, fontSize: 11, color: '#166534', lineHeight: 16 },
  permModalActions: { flexDirection: 'row', gap: 10, width: '100%' },
  permBtnSecondary: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center' },
  permBtnSecondaryText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  permBtnPrimary: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: '#3C3985', alignItems: 'center' },
  permBtnPrimaryText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // Modal styles for Risk Assessment History
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
  historyUserRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  historyUserAvatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EDF2F7', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  historyUserBubble: { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderTopRightRadius: 4, borderWidth: 1.5, borderColor: '#CBD5E1', maxWidth: '82%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  historyUserRoleLabel: { fontSize: 9, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 2, textAlign: 'right' },
  historyUserText: { color: '#0F172A', fontSize: 14, fontWeight: '700', lineHeight: 19 },
});
