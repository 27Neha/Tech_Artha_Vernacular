import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { styles } from '../theme/styles';
import { Header } from '../components/Header';
import { Screen } from '../types';
import { api } from '../services/api/client';
import { useTranslation } from '../i18n/TranslationContext';
import { Session, useAuth } from '../store/AuthContext';
import { useNavigation } from '@react-navigation/native';

interface LoginScreenProps {
  phone: string;
  setPhone: (phone: string) => void;
}

export const LoginScreen = ({ phone, setPhone }: LoginScreenProps) => {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const navigation = useNavigation<any>();
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  // Matches the web login's channel choice. WhatsApp first because that is the
  // provider actually configured; SMS is the fallback when a code does not arrive.
  const [channel, setChannel] = useState<'WHATSAPP' | 'SMS'>('WHATSAPP');

  const handleSendOtp = async (via: 'WHATSAPP' | 'SMS' = channel) => {
    if (!/^\d{10}$/.test(phone)) {
      return Alert.alert('Enter a valid mobile number', 'Please enter your 10-digit mobile number.');
    }

    setLoading(true);
    try {
      // The channel must be explicit. AuthController defaults to 'SMS', and the server
      // routes per channel - WhatsApp via Interakt, SMS via msg91 or the dev mock.
      const result = await api.post<{ devOtp?: string }>(
        '/auth/send-otp',
        { mobile: phone, channel: via },
        { anonymous: true },
      );

      setChannel(via);
      setOtpSent(true);

      // AUTH_DEV_BYPASS=true makes the server return the code in the response. Showing
      // it here in development means a test login costs no Interakt credit and needs no
      // trip to the API console. __DEV__ is false in any release build, so this cannot
      // reach production.
      if (__DEV__ && result?.devOtp) {
        setOtp(result.devOtp);
        Alert.alert('Dev code', `OTP ${result.devOtp} (prefilled - development only)`);
        return;
      }

      Alert.alert(
        via === 'SMS' ? 'Code sent by SMS' : 'Code sent on WhatsApp',
        via === 'SMS'
          ? 'Enter the verification code sent to your mobile number.'
          : 'Please check WhatsApp for your verification code.',
      );
    } catch (error) {
      Alert.alert('Could not send the code', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      return Alert.alert('Invalid OTP', 'Please enter a valid OTP.');
    }

    setLoading(true);
    try {
      const session = await api.post<Session>(
        '/auth/verify-otp',
        { mobile: phone, otp },
        { anonymous: true },
      );

      // Persists to the device keychain and flips the navigator into the signed-in
      // stack; the old code only assigned to an in-memory object, so the session was
      // lost on every restart and no component re-rendered.
      await signIn(session);

      navigation.navigate('KYC');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <Header title="Welcome" back={otpSent ? undefined : "welcome"} onBack={() => {
        if (otpSent) setOtpSent(false);
        else navigation.goBack();
      }} />
      <View style={styles.page}>
        {!otpSent ? (
          <>
            <Text style={styles.title}>{t('login.title')}</Text>
            <Text style={styles.description}>{t('login.desc')}</Text>
            <Text style={styles.label}>Mobile number</Text>
            <View style={styles.phoneInput}>
              <Text style={styles.country}>+91</Text>
              <TextInput 
                value={phone} 
                onChangeText={setPhone} 
                keyboardType="phone-pad" 
                maxLength={10} 
                placeholder="10-digit number" 
                style={styles.input} 
                editable={!loading}
              />
            </View>
            <Pressable
              style={[styles.primaryButton, loading && styles.primaryDisabled]}
              onPress={() => handleSendOtp('WHATSAPP')}
              disabled={loading}
            >
              <Text style={styles.primaryText}>{loading ? 'Sending...' : 'Get code on WhatsApp'}</Text>
              <Text style={styles.primaryText}>→</Text>
            </Pressable>

            {/* Development only: avoids spending an Interakt WhatsApp credit on every
                test login. SMS has no provider configured in production - the channel
                router refuses the mock there - so this must not ship. */}
            {__DEV__ ? (
              <Pressable
                style={[styles.altButton, loading && styles.primaryDisabled]}
                onPress={() => handleSendOtp('SMS')}
                disabled={loading}
              >
                <Text style={styles.altButtonText}>Dev: get code by SMS (no WhatsApp credit)</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.title}>Verify your number</Text>
            <Text style={styles.description}>
              Enter the code sent to +91 {phone} {channel === 'SMS' ? 'by SMS' : 'on WhatsApp'}.
            </Text>
            <Text style={styles.label}>One-Time Password (OTP)</Text>
            <TextInput 
              value={otp} 
              onChangeText={setOtp} 
              keyboardType="number-pad" 
              maxLength={6} 
              placeholder="Enter OTP" 
              style={styles.field} 
              editable={!loading}
            />
            <Pressable style={[styles.primaryButton, loading && styles.primaryDisabled]} onPress={handleVerifyOtp} disabled={loading}>
              <Text style={styles.primaryText}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
              <Text style={styles.primaryText}>→</Text>
            </Pressable>

            {/* Resending on the other channel is also dev-only, for the same reason. */}
            {__DEV__ ? (
              <Pressable
                style={[styles.altButton, loading && styles.primaryDisabled]}
                onPress={() => handleSendOtp(channel === 'SMS' ? 'WHATSAPP' : 'SMS')}
                disabled={loading}
              >
                <Text style={styles.altButtonText}>
                  Dev: resend by {channel === 'SMS' ? 'WhatsApp' : 'SMS'}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
        <Text style={styles.legal}>By continuing, you agree to our Terms and Privacy Policy.</Text>
      </View>
    </SafeAreaView>
  );
};
