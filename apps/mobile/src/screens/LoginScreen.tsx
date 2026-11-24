import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';
import { Header } from '../components/Header';
import { authStore } from '../store/auth';
import { useAuth } from '../store/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { OtpVerification } from '../components/OtpVerification';
import { Ionicons } from '@expo/vector-icons';
import { TermsModal } from '../components/TermsModal';
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal';
import { TermsConsentBlock } from '../components/TermsConsentBlock';
import { API_URL } from '../services/api/client';
import { isValidEmailFormat, normalizeEmailInput } from '../utils/passwordValidation';
import { getScrollBottomPadding } from '../utils/tabBarMetrics';

interface LoginScreenProps {
  apiUrl?: string;
  phone?: string;
  setPhone?: (phone: string) => void;
}

export const LoginScreen = ({ apiUrl = API_URL, phone: initialPhone, setPhone: setParentPhone }: LoginScreenProps) => {
  const effectiveApiUrl = (apiUrl && apiUrl.startsWith('https://')) ? apiUrl : API_URL;
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const termsOffsetY = useRef(0);
  
  const [phone, setPhone] = useState(initialPhone || '');
  const [step, setStep] = useState(1);
  const [authChannel, setAuthChannel] = useState<'SMS' | 'WHATSAPP' | 'EMAIL'>('SMS');
  const [identifierType, setIdentifierType] = useState<'MOBILE' | 'EMAIL'>('MOBILE');
  const [email, setEmail] = useState('');
  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('otp');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Returned by the server only outside production with AUTH_DEV_BYPASS on. Carried so
  // the OTP screen can prefill it while real SMS and WhatsApp delivery is unreliable.
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsWarning, setTermsWarning] = useState('');
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  const scrollToTerms = () => {
    const targetY = Math.max(0, termsOffsetY.current - 28);
    scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
  };

  useFocusEffect(
    React.useCallback(() => {
      setPhone(initialPhone || '');
      setEmail('');
      setPassword('');
      setStep(1);
      setError('');
      setAcceptedTerms(false);
      setTermsWarning('');
    }, [initialPhone])
  );

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setPhone(cleaned);
    if (setParentPhone) setParentPhone(cleaned);
  };

  const safeFetchJson = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return { message: 'Network or parsing error' };
    }
  };

  const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 15000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  const handleContinue = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'PASSWORD') => {
    setError('');
    setTermsWarning('');
    if (channel !== 'PASSWORD') setAuthChannel(channel as any);
    
    if (!acceptedTerms) {
      setTermsWarning(t('signup.termsRequired', { defaultValue: 'Please agree to the Terms of Service & Privacy Policy to continue.' }));
      scrollToTerms();
      return;
    }
    
    if (identifierType === 'EMAIL') {
      if (!isValidEmailFormat(email)) {
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
      if (channel === 'PASSWORD') {
        await handlePasswordLogin();
      } else {
        setAuthChannel(channel);
        await handleSendOtp(channel);
      }
    } catch (e: any) {
      if (!error) {
        setError(e?.message || t('common.error', { defaultValue: 'Something went wrong. Please try again.' }));
      }
    } finally {
      setLoading(false);
    }
  };

  const persistTermsConsent = async (token?: string) => {
    if (!token || !acceptedTerms) return;
    try {
      await fetchWithTimeout(`${effectiveApiUrl}/consents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'TERMS_AND_CONDITIONS' }),
      }, 4000);
    } catch {
      // Best-effort consent sync; backend ConsentService deduplicates active grants.
    }
  };

  const handleSendOtp = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => {
    setLoading(true);
    setError('');
    try {
      const normalizedEmail = normalizeEmailInput(email);
      const res = await fetchWithTimeout(`${effectiveApiUrl}/auth/login/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(identifierType === 'EMAIL' ? { email: normalizedEmail, channel } : { mobile: phone, channel })
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || t('login.failedToSendOtp', { defaultValue: 'Failed to send OTP' }));

      setDevOtp(data?.devOtp ?? null);
      setStep(2);
    } catch (e: any) {
      const isCanceled = e?.name === 'AbortError' || e?.message?.includes('cancel') || e?.message?.includes('aborted');
      const msg = isCanceled
        ? 'Connection timed out. Please try again.'
        : e?.message === 'Network request failed'
        ? `Could not reach server. Please check your internet connection.`
        : (e?.message || t('login.failedToSendOtp', { defaultValue: 'Failed to send OTP' }));
      setError(msg);
      throw new Error(msg);
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
      const normalizedEmail = normalizeEmailInput(email);
      const res = await fetchWithTimeout(`${effectiveApiUrl}/auth/login-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(identifierType === 'EMAIL' ? { email: normalizedEmail, password } : { mobile: phone, password })
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || t('login.invalidCredentials', { defaultValue: 'Invalid credentials' }));
      
      const token = data.accessToken || data.access_token;
      authStore.accessToken = token;
      authStore.userId = data.user?.id;
      await persistTermsConsent(token);
      if (token && data.user) {
        await signIn({
          accessToken: token,
          refreshToken: data.refreshToken || '',
          user: { id: data.user.id, mobile: data.user.mobile || phone || '' }
        });
      }
      navigation.navigate('MainTabs');
    } catch (e: any) {
      setError(e.name === 'AbortError' ? 'Request timed out. Please try again.' : e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otpValue: string) => {
    setLoading(true);
    setError('');
    try {
      const normalizedEmail = normalizeEmailInput(email);
      const res = await fetchWithTimeout(`${effectiveApiUrl}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(identifierType === 'EMAIL' ? { email: normalizedEmail, otp: otpValue, type: 'login' } : { mobile: phone, otp: otpValue, type: 'login' })
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || t('login.invalidOtp', { defaultValue: 'Invalid OTP' }));
      
      const token = data.accessToken || data.access_token;
      authStore.accessToken = token;
      authStore.userId = data.user?.id;
      await persistTermsConsent(token);
      if (token && data.user) {
        await signIn({
          accessToken: token,
          refreshToken: data.refreshToken || '',
          user: { id: data.user.id, mobile: data.user.mobile || phone || '' }
        });
      }
      navigation.navigate('MainTabs');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    navigation.navigate('ForgotPassword', {
      initialEmail: identifierType === 'EMAIL' ? email.trim() : '',
    });
  };

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <Header title="" onBack={() => {
        if (step === 2) setStep(1);
        else navigation.goBack();
      }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.page}
          contentContainerStyle={{ paddingBottom: getScrollBottomPadding(insets.bottom, 32) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 ? (
            <View style={localStyles.content}>
              <Text style={styles.title}>{t('login.welcomeBack', { defaultValue: 'Welcome Back' })}</Text>
              <Text style={styles.description}>{t('login.subtitle', { defaultValue: 'Securely login to your TechArtha account.' })}</Text>

              {identifierType === 'EMAIL' ? (
                <View style={localStyles.inputGroup}>
                  <Text style={styles.label}>{t('login.emailAddress', { defaultValue: 'Email Address' })}</Text>
                  <TextInput 
                    testID="login-email-input"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="emailAddress"
                    autoComplete="email"
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
                      testID="login-mobile-input"
                      value={phone}
                      onChangeText={handlePhoneChange}
                      keyboardType="number-pad"
                      maxLength={10}
                      placeholder={t('login.mobilePlaceholder', { defaultValue: 'Enter 10-digit number' })}
                      style={styles.input}
                    />
                  </View>
                </View>
              )}

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

              {loginMethod === 'password' ? (
                <View style={localStyles.inputGroup}>
                  <Text style={styles.label}>{t('login.password', { defaultValue: 'Password' })}</Text>
                  <TextInput 
                    testID="login-password-input"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    textContentType="password"
                    autoComplete="password"
                    placeholder={t('login.passwordPlaceholder', { defaultValue: 'Enter your password' })}
                    style={styles.field}
                  />
                  <View style={localStyles.passwordLinksRow}>
                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                      <Text style={localStyles.switchText}>
                        {showPassword
                          ? t('signup.hidePassword', { defaultValue: 'Hide Password' })
                          : t('signup.showPassword', { defaultValue: 'Show Password' })}
                      </Text>
                    </Pressable>
                    <Pressable
                      testID="login-forgot-password-link"
                      onPress={openForgotPassword}
                      hitSlop={8}
                    >
                      <Text style={localStyles.forgotLink}>
                        {t('login.forgotPassword', { defaultValue: 'Forgot Password?' })}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {error ? <Text style={localStyles.errorText}>{error}</Text> : null}

              <TermsConsentBlock
                accepted={acceptedTerms}
                warning={termsWarning}
                onLayout={(y) => {
                  termsOffsetY.current = y;
                }}
                onToggle={() => {
                  const next = !acceptedTerms;
                  setAcceptedTerms(next);
                  if (next) setTermsWarning('');
                }}
                onOpenTerms={() => setTermsModalVisible(true)}
                onOpenPrivacy={() => setPrivacyModalVisible(true)}
              />

              {loginMethod === 'password' ? (
                <View>
                  <Pressable
                    testID="login-password-submit"
                    style={[
                      styles.primaryButton,
                      localStyles.primaryActionSpacing,
                      (!acceptedTerms || loading) && styles.primaryDisabled,
                    ]}
                    onPress={() => handleContinue('PASSWORD')}
                    disabled={loading}
                  >
                    <Text style={styles.primaryText}>
                      {loading ? t('common.loading', { defaultValue: 'Loading...' }) : t('login.login', { defaultValue: 'Login' })}
                    </Text>
                    {!loading && <Text style={styles.primaryText}>→</Text>}
                  </Pressable>
                </View>
              ) : (
                <View>
                  {identifierType === 'EMAIL' ? (
                    <View>
                      <Pressable
                        testID="login-email-continue"
                        style={[
                          styles.primaryButton,
                          localStyles.primaryActionSpacing,
                          (!acceptedTerms || (loading && authChannel === 'EMAIL')) && styles.primaryDisabled,
                        ]}
                        onPress={() => handleContinue('EMAIL')}
                        disabled={loading}
                      >
                        <Text style={styles.primaryText}>
                          {(loading && authChannel === 'EMAIL') ? t('common.loading', { defaultValue: 'Loading...' }) : t('login.continueWithEmail', { defaultValue: 'Continue with Email' })}
                        </Text>
                        {!(loading && authChannel === 'EMAIL') && <Text style={styles.primaryText}>→</Text>}
                      </Pressable>

                      <Pressable 
                        style={[localStyles.secondaryBoxBtn, { marginTop: 16 }]} 
                        onPress={() => { setIdentifierType('MOBILE'); setAuthChannel('SMS'); setError(''); setTermsWarning(''); }}
                      >
                        <Ionicons name="phone-portrait-outline" size={20} color="#3C3985" style={{ marginRight: 8 }} />
                        <Text style={localStyles.secondaryBoxText}>
                          {t('signup.useMobileInstead', { defaultValue: 'Use mobile instead' })}
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View>
                      <Pressable
                        testID="login-sms-continue"
                        style={[
                          styles.primaryButton,
                          localStyles.primaryActionSpacing,
                          (!acceptedTerms || (loading && authChannel === 'SMS')) && styles.primaryDisabled,
                        ]}
                        onPress={() => handleContinue('SMS')}
                        disabled={loading}
                      >
                        <Text style={styles.primaryText}>
                          {(loading && authChannel === 'SMS') ? t('common.loading', { defaultValue: 'Loading...' }) : t('login.continueWithSms', { defaultValue: 'Continue with SMS' })}
                        </Text>
                        {!(loading && authChannel === 'SMS') && <Text style={styles.primaryText}>→</Text>}
                      </Pressable>

                      <View style={localStyles.divider}>
                        <View style={localStyles.line} />
                        <Text style={localStyles.orText}>{t('signup.or', { defaultValue: 'or' })}</Text>
                        <View style={localStyles.line} />
                      </View>

                      <Pressable 
                        style={[localStyles.waButton, (loading && authChannel === 'WHATSAPP') && styles.primaryDisabled]} 
                        onPress={() => handleContinue('WHATSAPP')} 
                        disabled={loading}
                      >
                        <Ionicons name="logo-whatsapp" size={20} color="#25D366" style={{ marginRight: 8 }} />
                        <Text style={localStyles.waText}>
                          {(loading && authChannel === 'WHATSAPP') ? t('common.loading', { defaultValue: 'Loading...' }) : t('login.useWaInstead', { defaultValue: 'Continue with WhatsApp' })}
                        </Text>
                      </Pressable>

                      <Pressable 
                        style={localStyles.secondaryBoxBtn} 
                        onPress={() => { setIdentifierType('EMAIL'); setAuthChannel('EMAIL'); setError(''); setTermsWarning(''); }}
                      >
                        <Ionicons name="mail-outline" size={20} color="#3C3985" style={{ marginRight: 8 }} />
                        <Text style={localStyles.secondaryBoxText}>
                          {t('signup.useEmailInstead', { defaultValue: 'Use email instead' })}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {loginMethod === 'otp' ? (
                <Pressable
                  testID="login-forgot-password-secondary"
                  style={localStyles.forgotBannerBtn}
                  onPress={openForgotPassword}
                  hitSlop={8}
                >
                  <Text style={localStyles.forgotLink}>
                    {t('login.forgotPassword', { defaultValue: 'Forgot Password?' })}
                  </Text>
                </Pressable>
              ) : null}

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
              devOtp={devOtp}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <TermsModal 
        visible={termsModalVisible} 
        onClose={() => setTermsModalVisible(false)} 
      />
      <PrivacyPolicyModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
      />
    </View>
  );
};

const localStyles = StyleSheet.create({
  content: { paddingBottom: 24 },
  inputGroup: { marginBottom: 16 },
  errorText: { color: '#E53E3E', fontSize: 14, marginTop: 4, marginBottom: 12, fontWeight: '500' },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#F8F9FB', padding: 4, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  toggleText: { fontSize: 14, fontWeight: '700', color: '#718096' },
  toggleActiveText: { color: '#3C3985' },
  passwordLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  forgotLink: {
    color: '#3C3985',
    fontSize: 14,
    fontWeight: '700',
  },
  forgotBannerBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  primaryActionSpacing: {
    marginTop: 16,
  },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  orText: { marginHorizontal: 16, color: '#A0AEC0', fontSize: 14 },
  waButton: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  waText: { fontSize: 16, fontWeight: '700', color: '#102A54' },
  secondaryBoxBtn: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  secondaryBoxText: { fontSize: 16, fontWeight: '700', color: '#102A54' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  footerText: { color: '#718096', fontSize: 14 },
  link: { color: '#3C3985', fontSize: 14, fontWeight: '700' },
  switchText: { color: '#3C3985', fontSize: 14, fontWeight: '600' },
});

export default LoginScreen;
