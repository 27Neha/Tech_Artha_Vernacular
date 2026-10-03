import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../../services/api/client';
import { minorStyles as s } from './minorStyles';

/**
 * POST /api/v1/minor/guardian/send-otp then /verify-otp - step 2.
 *
 * The server checks the number against the saved guardian record and rejects a mismatch,
 * so the mobile is carried in from the previous screen and shown read-only.
 *
 * Note MinorService.sendGuardianOtp calls AuthService.sendOtp with the SMS channel.
 * With OTP_PROVIDER=interakt the Interakt provider only handles WHATSAPP and silently
 * skips anything else, so no message is actually delivered in the current configuration.
 */
export const MinorVerifyScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mobile: string = route.params?.mobile ?? '';

  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const sendOtp = async () => {
    setBusy(true);
    try {
      await api.post('/api/v1/minor/guardian/send-otp', { mobile });
      setSent(true);
      Alert.alert('Code sent', `A verification code has been sent to the guardian on ${mobile}.`);
    } catch (e) {
      Alert.alert('Could not send the code', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (code.trim().length < 4) return Alert.alert('Enter the code', 'Enter the code sent to the guardian.');
    setBusy(true);
    try {
      await api.post('/api/v1/minor/guardian/verify-otp', { mobile, code: code.trim() });
      navigation.navigate('MinorConsent');
    } catch (e) {
      Alert.alert('Verification failed', e instanceof Error ? e.message : 'Please check the code and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.step}>STEP 2 OF 4</Text>
        <Text style={s.title}>Verify the guardian</Text>
        <Text style={s.subtitle}>
          We need to confirm the guardian controls this number before consent can be recorded.
        </Text>
      </View>

      <ScrollView style={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Guardian&apos;s mobile number</Text>
        <View style={[s.input, { justifyContent: 'center', backgroundColor: '#EDF2F7' }]}>
          <Text style={s.rowValue}>+91 {mobile}</Text>
        </View>

        {!sent ? (
          <Pressable style={[s.button, busy && s.disabled]} onPress={sendOtp} disabled={busy}>
            <Text style={s.buttonText}>{busy ? 'Sending…' : 'Send verification code'}</Text>
          </Pressable>
        ) : (
          <>
            <Text style={s.label}>Verification code</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Enter the code"
              style={s.input}
            />
            <Pressable style={[s.button, busy && s.disabled]} onPress={verify} disabled={busy}>
              <Text style={s.buttonText}>{busy ? 'Verifying…' : 'Verify'}</Text>
            </Pressable>
            <Pressable style={s.outlineButton} onPress={sendOtp} disabled={busy}>
              <Text style={s.outlineText}>Resend code</Text>
            </Pressable>
          </>
        )}
        <View style={s.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
};
