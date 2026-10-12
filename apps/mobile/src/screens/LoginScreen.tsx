import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { styles } from '../theme/styles';
import { Header } from '../components/Header';
import { authStore } from '../store/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { OtpVerification } from '../components/OtpVerification';

interface LoginScreenProps {
  apiUrl: string;
}

export const LoginScreen = ({ apiUrl }: LoginScreenProps) => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState(1);
  const [authChannel, setAuthChannel] = useState<'SMS' | 'WHATSAPP' | 'EMAIL'>('SMS');
  const [identifierType, setIdentifierType] = useState<'MOBILE' | 'EMAIL'>('MOBILE');
  const [email, setEmail] = useState('');
  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('otp');

  useFocusEffect(
    React.useCallback(() => {
      setPhone('');
      setEmail('');
      setPassword('');
      setStep(1);
      setError('');
    }, [])
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  // Cybrilla compliance point 11: consent must be an explicit, unticked action before
  // any credential is sent, not implied by continuing. Restored after the b657c9f merge,
  // whose version of this screen had no consent gate.
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');

  const safeFetchJson = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return { message: 'Network or parsing error' };
    }
  };

  const handleContinue = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'PASSWORD') => {
    setError('');
    // Guarded here rather than on each button: all four entry points - SMS, WhatsApp,
    // email and password - come through this function, so one check cannot be bypassed
    // by a path someone adds later.
    if (!acceptedTerms) {
      setError(
        t('validation.termsRequired', {
          defaultValue: 'Please accept the Terms & Conditions and Privacy Policy to continue.',
        }),
      );
      return;
    }
    if (channel !== 'PASSWORD') setAuthChannel(channel as any);
    
    if (identifierType === 'EMAIL') {
      if (!email.trim() || !email.includes('@')) {
        setError(t('validation.emailInvalid', { defaultValue: 'Please enter a valid email address.' }));
        return;
      }
    } else {
      if (phone.length !== 10) {
        setError(t('validation.mobileInvalid', { defaultValue: 'Please enter a valid 10-digit mobile number.' }));
        return;
      }
    }

    setLoading(true);
    try {
      // Skip existence check for faster login
      if (channel === 'PASSWORD') {
        await handlePasswordLogin();
      } else {
        setAuthChannel(channel);
        await handleSendOtp(channel);
      }
    } catch (e: any) {
      setError(t('common.error', { defaultValue: 'Something went wrong. Please try again.' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/auth/login/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(identifierType === 'EMAIL' ? { email, channel } : { mobile: phone, channel })
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || t('login.failedToSendOtp', { defaultValue: 'Failed to send OTP' }));
      
      setStep(2);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!password) {
      setError(t('login.enterPassword', { defaultValue: 'Enter password.' }));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/auth/login-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(identifierType === 'EMAIL' ? { email, password } : { mobile: phone, password })
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || t('login.invalidCredentials', { defaultValue: 'Invalid credentials' }));
      
      authStore.accessToken = data.accessToken || data.access_token;
      authStore.userId = data.user?.id;
      navigation.navigate('MainTabs');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(identifierType === 'EMAIL' ? { email, otp, type: 'login' } : { mobile: phone, otp, type: 'login' })
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || t('login.invalidOtp', { defaultValue: 'Invalid OTP' }));
      
      authStore.accessToken = data.accessToken || data.access_token;
      authStore.userId = data.user?.id;
      navigation.navigate('MainTabs');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="" onBack={() => {
        if (step === 2) setStep(1);
        else navigation.goBack();
      }} />
      <ScrollView style={styles.page} keyboardShouldPersistTaps="handled">
        {step === 1 ? (
          <View style={localStyles.content}>
            <Text style={styles.title}>{t('login.welcomeBack', { defaultValue: 'Welcome Back' })}</Text>
            <Text style={styles.description}>{t('login.subtitle', { defaultValue: 'Securely login to your TechArtha account.' })}</Text>
            
            {identifierType === 'EMAIL' ? (
              <View style={localStyles.inputGroup}>
                <Text style={styles.label}>{t('login.emailAddress', { defaultValue: 'Email Address' })}</Text>
                <TextInput 
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder={t('login.emailPlaceholder', { defaultValue: 'Enter your email' })}
                  style={styles.field}
                />
              </View>
            ) : (
              <View style={localStyles.inputGroup}>
                <Text style={styles.label}>{t('login.mobileNumber', { defaultValue: 'Mobile Number' })}</Text>
                <View style={styles.phoneInput}>
                  <Text style={styles.country}>+91</Text>
                  <TextInput 
                    value={phone}
                    onChangeText={(text) => setPhone(text.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder={t('login.mobilePlaceholder', { defaultValue: 'Enter 10-digit number' })}
                    style={styles.input}
                  />
                </View>
              </View>
            )}

            <Pressable
              style={localStyles.termsRow}
              onPress={() => setAcceptedTerms((prev) => !prev)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
            >
              <View style={[localStyles.checkbox, acceptedTerms && localStyles.checkboxOn]}>
                {acceptedTerms ? <Text style={localStyles.checkboxTick}>✓</Text> : null}
              </View>
              <Text style={localStyles.termsText}>
                {t('login.acceptTerms', {
                  defaultValue:
                    'I agree to the Terms & Conditions and the Privacy Policy, and to receive transaction updates about my investments.',
                })}
              </Text>
            </Pressable>

            <Text style={styles.label}>{t('login.loginVia', { defaultValue: 'Login via' })}</Text>
            <View style={localStyles.toggleContainer}>
              <Pressable 
                style={[localStyles.toggleBtn, loginMethod === 'otp' && localStyles.toggleActive]}
                onPress={() => setLoginMethod('otp')}
              >
                <Text style={[localStyles.toggleText, loginMethod === 'otp' && localStyles.toggleActiveText]}>{t('login.viaOtp', { defaultValue: 'OTP' })}</Text>
              </Pressable>
              <Pressable 
                style={[localStyles.toggleBtn, loginMethod === 'password' && localStyles.toggleActive]}
                onPress={() => setLoginMethod('password')}
              >
                <Text style={[localStyles.toggleText, loginMethod === 'password' && localStyles.toggleActiveText]}>{t('login.viaPassword', { defaultValue: 'Password' })}</Text>
              </Pressable>
            </View>

            {error ? <Text style={localStyles.errorText}>{error}</Text> : null}

            {loginMethod === 'password' ? (
              <View>
                <View style={localStyles.inputGroup}>
                  <Text style={styles.label}>{t('login.password', { defaultValue: 'Password' })}</Text>
                  <TextInput 
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t('login.passwordPlaceholder', { defaultValue: 'Enter your password' })}
                    style={styles.field}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={{marginTop: 8}}>
                    <Text style={localStyles.switchText}>{showPassword ? t('signup.hidePassword', { defaultValue: 'Hide Password' }) : t('signup.showPassword', { defaultValue: 'Show Password' })}</Text>
                  </Pressable>
                </View>
                <Pressable style={[styles.primaryButton, loading && styles.primaryDisabled]} onPress={() => handleContinue('PASSWORD')} disabled={loading || !password}>
                  <Text style={styles.primaryText}>{loading ? t('common.loading', { defaultValue: 'Loading...' }) : t('login.login', { defaultValue: 'Login' })}</Text>
                  {!loading && <Text style={styles.primaryText}>→</Text>}
                </Pressable>
              </View>
            ) : (
              <View>
                {identifierType === 'EMAIL' ? (
                  <Pressable style={[styles.primaryButton, (loading && authChannel === 'EMAIL') && styles.primaryDisabled]} onPress={() => handleContinue('EMAIL')} disabled={loading}>
                    <Text style={styles.primaryText}>{(loading && authChannel === 'EMAIL') ? t('common.loading', { defaultValue: 'Loading...' }) : t('login.continueWithEmail', { defaultValue: 'Continue with Email' })}</Text>
                    {!(loading && authChannel === 'EMAIL') && <Text style={styles.primaryText}>→</Text>}
                  </Pressable>
                ) : (
                  <>
                    <Pressable style={[styles.primaryButton, (loading && authChannel === 'SMS') && styles.primaryDisabled]} onPress={() => handleContinue('SMS')} disabled={loading}>
                      <Text style={styles.primaryText}>{(loading && authChannel === 'SMS') ? t('common.loading', { defaultValue: 'Loading...' }) : t('login.continueWithSms', { defaultValue: 'Continue with SMS' })}</Text>
                      {!(loading && authChannel === 'SMS') && <Text style={styles.primaryText}>→</Text>}
                    </Pressable>
                    <View style={localStyles.divider}>
                      <View style={localStyles.line} />
                      <Text style={localStyles.orText}>{t('signup.or', { defaultValue: 'or' })}</Text>
                      <View style={localStyles.line} />
                    </View>
                    <Pressable style={localStyles.waButton} onPress={() => handleContinue('WHATSAPP')} disabled={loading}>
                      <Text style={localStyles.waIcon}>💬</Text>
                      <Text style={localStyles.waText}>{(loading && authChannel === 'WHATSAPP') ? t('common.loading', { defaultValue: 'Loading...' }) : t('login.useWaInstead', { defaultValue: 'Continue with WhatsApp' })}</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}

            <Pressable onPress={() => { setIdentifierType(identifierType === 'EMAIL' ? 'MOBILE' : 'EMAIL'); setError(''); }} style={[localStyles.switchBtn, { marginTop: 12 }]}>
              <Text style={localStyles.switchText}>
                {identifierType === 'EMAIL' ? t('signup.useMobileInstead', { defaultValue: 'Use mobile instead' }) : t('signup.useEmailInstead', { defaultValue: 'Use email instead' })}
              </Text>
            </Pressable>
            
            <View style={localStyles.footer}>
              <Text style={localStyles.footerText}>{t('login.noAccount', { defaultValue: 'Not have an account?' })} </Text>
              <Pressable onPress={() => navigation.navigate('Signup')}><Text style={localStyles.link}>{t('login.signUp', { defaultValue: 'Sign up' })}</Text></Pressable>
            </View>
          </View>
        ) : (
          <OtpVerification
            identifierType={identifierType}
            initialChannel={authChannel}
            identifierValue={identifierType === 'EMAIL' ? email : phone}
            onSendOtp={handleSendOtp}
            onVerify={handleVerifyOtp}
            onChangeIdentifier={() => setStep(1)}
            loading={loading}
            error={error}
            setError={setError}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 20, marginBottom: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#A0AEC0', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: '#3C3985', borderColor: '#3C3985' },
  checkboxTick: { color: '#fff', fontSize: 13, fontWeight: '800' },
  termsText: { flex: 1, color: '#4A5568', fontSize: 12, lineHeight: 18 },

  content: { paddingBottom: 40 },
  inputGroup: { marginBottom: 16 },
  errorText: { color: '#E53E3E', fontSize: 14, marginBottom: 16, fontWeight: '500' },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#F8F9FB', padding: 4, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  toggleText: { fontSize: 14, fontWeight: '700', color: '#718096' },
  toggleActiveText: { color: '#3C3985' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  orText: { marginHorizontal: 16, color: '#A0AEC0', fontSize: 14 },
  waButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff', marginBottom: 24 },
  waIcon: { fontSize: 20, marginRight: 12 },
  waText: { fontSize: 16, fontWeight: '700', color: '#4A5568' },
  switchBtn: { alignItems: 'center', paddingVertical: 12 },
  switchText: { color: '#3C3985', fontSize: 14, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  footerText: { color: '#718096', fontSize: 14 },
  link: { color: '#3C3985', fontSize: 14, fontWeight: '700' }
});
