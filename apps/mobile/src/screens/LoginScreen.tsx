import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { styles } from '../theme/styles';
import { Header } from '../components/Header';
import { api } from '../services/api/client';
import { Session, useAuth } from '../store/AuthContext';
import { useNavigation } from '@react-navigation/native';

interface LoginScreenProps {
  phone: string;
  setPhone: (phone: string) => void;
}

export const LoginScreen = ({ phone, setPhone }: LoginScreenProps) => {
  const { signIn } = useAuth();
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<'contact' | 'otp' | 'password'>('contact');
  const [authType, setAuthType] = useState<'login' | 'signup' | null>(null);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!phone) {
      return Alert.alert('Enter contact', 'Please enter your mobile number or email.');
    }
    
    setLoading(true);
    try {
      // 1. Check if user exists
      const isEmail = phone.includes('@');
      const payload = isEmail ? { email: phone } : { mobile: phone };
      
      const checkRes = await api.post<{ exists: boolean }>('/auth/check', payload, { anonymous: true });
      const type = checkRes.exists ? 'login' : 'signup';
      setAuthType(type);

      // 2. Start flow
      const channel = isEmail ? 'EMAIL' : 'SMS';
      const endpoint = type === 'login' ? '/auth/login/start' : '/auth/signup/start';
      
      await api.post(endpoint, { ...payload, channel }, { anonymous: true });

      setStep('otp');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      return Alert.alert('Invalid OTP', 'Please enter a valid OTP.');
    }
    if (authType === 'signup' && password.length < 8) {
      return Alert.alert('Weak Password', 'Please create a password of at least 8 characters.');
    }

    setLoading(true);
    try {
      const isEmail = phone.includes('@');
      const payload = isEmail ? { email: phone } : { mobile: phone };
      
      const session = await api.post<Session>(
        '/auth/otp/verify',
        { ...payload, otp, type: authType!, password: password || undefined },
        { anonymous: true }
      );

      await signIn(session);
      navigation.navigate('ProfileSetup');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <Header title="Welcome" back={step === 'otp' ? undefined : "welcome"} onBack={() => {
        if (step === 'otp') {
          setStep('contact');
          setOtp('');
          setPassword('');
        } else {
          navigation.goBack();
        }
      }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.page}>
          {step === 'contact' ? (
            <>
              <Text style={styles.title}>Let's get you started</Text>
              <Text style={styles.description}>Enter your mobile number or email address.</Text>
              <Text style={styles.label}>Mobile or Email</Text>
              <View style={styles.phoneInput}>
                {!phone.includes('@') && <Text style={styles.country}>+91</Text>}
                <TextInput 
                  value={phone} 
                  onChangeText={setPhone} 
                  keyboardType={phone.includes('@') ? "email-address" : "phone-pad"}
                  placeholder="Mobile number or Email" 
                  style={{flex: 1, fontSize: 16, color: '#102A54', fontWeight: 'bold'}}
                  autoCapitalize="none"
                />
              </View>
              <Pressable style={[styles.primaryButton, loading && {opacity: 0.7}]} onPress={handleContinue} disabled={loading}>
                <Text style={styles.primaryText}>{loading ? 'Checking...' : 'Continue'}</Text>
                {!loading && <Text style={styles.primaryText}>→</Text>}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>{authType === 'login' ? 'Welcome back' : 'Create an account'}</Text>
              <Text style={styles.description}>We sent a verification code to {phone}</Text>
              
              <Text style={styles.label}>Enter OTP</Text>
              <TextInput 
                value={otp} 
                onChangeText={setOtp} 
                keyboardType="number-pad" 
                maxLength={6} 
                placeholder="000000" 
                style={styles.input}
              />

              {authType === 'signup' && (
                <>
                  <Text style={[styles.label, {marginTop: 20}]}>Create a Password</Text>
                  <TextInput 
                    value={password} 
                    onChangeText={setPassword} 
                    secureTextEntry 
                    placeholder="Minimum 8 characters" 
                    style={styles.input}
                  />
                </>
              )}

              <Pressable style={[styles.primaryButton, loading && {opacity: 0.7}]} onPress={handleVerifyOtp} disabled={loading}>
                <Text style={styles.primaryText}>{loading ? 'Verifying...' : 'Verify & Continue'}</Text>
                {!loading && <Text style={styles.primaryText}>→</Text>}
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
