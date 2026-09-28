import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { styles } from '../theme/styles';
import { Header } from '../components/Header';
import { authStore } from '../store/auth';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

interface LoginScreenProps {
  phone: string;
  setPhone: (phone: string) => void;
  apiUrl: string;
}

export const LoginScreen = ({ phone, setPhone, apiUrl }: LoginScreenProps) => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(phone)) {
      return Alert.alert(t('login.invalidNumber', 'Enter a valid mobile number'), 'Please enter your 10-digit mobile number.');
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: phone })
      });
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.message || 'Failed to send OTP');
      
      setOtpSent(true);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      return Alert.alert(t('login.invalidOtp', 'Invalid OTP'), 'Please enter a valid OTP.');
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: phone, otp })
      });
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.message || 'Failed to verify OTP');
      
      authStore.accessToken = result.access_token;
      authStore.userId = result.user?.id;
      
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
      <Header title={t('welcome.welcomeToTechArtha', 'Welcome')} back={otpSent ? undefined : "welcome"} onBack={() => {
        if (otpSent) setOtpSent(false);
        else navigation.goBack();
      }} />
      <View style={styles.page}>
        {!otpSent ? (
          <>
            <Text style={styles.title}>{t('login.title', 'Let’s get you started')}</Text>
            <Text style={styles.description}>{t('login.desc', 'Enter your mobile number. We’ll send a secure one-time verification code.')}</Text>
            <Text style={styles.label}>{t('login.mobileLabel', 'Mobile number')}</Text>
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
            <Pressable style={[styles.primaryButton, loading && styles.primaryDisabled]} onPress={handleSendOtp} disabled={loading}>
              <Text style={styles.primaryText}>{loading ? t('signup.sending', 'Sending...') : t('login.continue', 'Continue securely')}</Text>
              <Text style={styles.primaryText}>→</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>{t('login.verifyNumber', 'Verify your number')}</Text>
            <Text style={styles.description}>Enter the OTP sent to +91 {phone}.</Text>
            <Text style={styles.label}>{t('login.otpLabel', 'One-Time Password (OTP)')}</Text>
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
              <Text style={styles.primaryText}>{loading ? t('signup.verifyingStatus', 'Verifying...') : t('login.verifyOtp', 'Verify OTP')}</Text>
              <Text style={styles.primaryText}>→</Text>
            </Pressable>
          </>
        )}
        <Text style={styles.legal}>{t('settings.terms', 'Terms of Service')}</Text>
      </View>
    </SafeAreaView>
  );
};
