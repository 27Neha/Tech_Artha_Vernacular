import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { HeadsetIcon } from '../components/Icons';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api/client';

type Message = { id: string; from: 'bot' | 'user'; text: string };

const GREETING: Message = {
  id: 'greet',
  from: 'bot',
  text: "Hello! 👋 I'm your Client Assistant. I can help you with your investments, goals, KYC and account questions. How can I help you today?",
};

export const AssistantScreen = () => {
  const { i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

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

  return (
    <SafeAreaView style={s.safe} edges={['right', 'left']}>
      <StatusBar style="dark" />
      <Header title="Client Assistant" />
      <View style={s.botHeader}>
        <View style={s.avatar}><HeadsetIcon color="#3C3985" size={24} /></View>
        <View>
          <Text style={s.botName}>Client Assistant</Text>
          <Text style={s.botStatus}>● Online</Text>
        </View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={s.chat}>
          {messages.map(m => (
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
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  botHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EBEBFA', alignItems: 'center', justifyContent: 'center' },
  botName: { fontSize: 16, fontWeight: '800', color: '#102A54' },
  botStatus: { fontSize: 12, color: '#48BB78', fontWeight: '600', marginTop: 2 },
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
});
