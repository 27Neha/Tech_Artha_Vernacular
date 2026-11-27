import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';
import { Header } from '../components/Header';
import { authStore } from '../store/auth';
import { useAuth } from '../store/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { OtpVerification } from '../components/OtpVerification';
import { Ionicons } from '@expo/vector-icons';
import { TermsModal } from '../components/TermsModal';
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal';
import { API_URL as DEFAULT_API_URL, resolveApiUrl, sanitizeNetworkError } from '../services/api/client';
import { useTheme } from '../context/ThemeContext';

export interface AuthScreenProps {
  apiUrl?: string;
  defaultTab?: 'login' | 'signup';
  phone?: string;
  setPhone?: (phone: string) => void;
}

export const AuthScreen = ({
  apiUrl = DEFAULT_API_URL,
  defaultTab = 'login',
  phone: initialPhone,
  setPhone: setParentPhone,
}: AuthScreenProps) => {
  const { colors, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const getApiUrl = useCallback(() => {
    if (apiUrl && apiUrl !== DEFAULT_API_URL && apiUrl !== 'auto') {
      return apiUrl.replace(/\/+$/, '');
    }
    return resolveApiUrl();
  }, [apiUrl]);
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { signIn } = useAuth();

  // Active authentication tab: 'login' | 'signup'
  const routeTab = route.params?.initialTab;
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(
    routeTab === 'signup' || defaultTab === 'signup' ? 'signup' : 'login'
  );

  useEffect(() => {
    // Clear any stale warnings and reset to mobile login on initial mount
    setError('');
    setTermsWarning('');
    setForgotWarning('');
  }, []);

  useEffect(() => {
    if (route.params?.initialTab === 'login' || route.params?.initialTab === 'signup') {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  // Common UI states
  const [error, setError] = useState('');
  const [termsWarning, setTermsWarning] = useState('');
  const [forgotWarning, setForgotWarning] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // ---------------- LOGIN FLOW STATES ----------------
  const [loginStep, setLoginStep] = useState(1);
  const [loginPhone, setLoginPhone] = useState(initialPhone || '');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginIdentifierType, setLoginIdentifierType] = useState<'MOBILE' | 'EMAIL'>('MOBILE');
  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('otp');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [loginAuthChannel, setLoginAuthChannel] = useState<'SMS' | 'WHATSAPP' | 'EMAIL'>('SMS');

  // ---------------- SIGNUP FLOW STATES ----------------
  const [signupStep, setSignupStep] = useState(1); // 1 = input, 1.5 = OTP, 1.6 = password
  const [signupMobile, setSignupMobile] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupAuthChannel, setSignupAuthChannel] = useState<'SMS' | 'WHATSAPP' | 'EMAIL'>('SMS');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupShowPassword, setSignupShowPassword] = useState(false);
  const [signupShowConfirmPassword, setSignupShowConfirmPassword] = useState(false);
  const [signupShowReqs, setSignupShowReqs] = useState(false);
  const [signupSession, setSignupSession] = useState<{
    accessToken: string;
    refreshToken: string;
    user?: { id: string; mobile?: string };
  } | null>(null);

  const safeFetchJson = async (res: Response) => {
    try {
      const text = await res.text();
      if (!text || !text.trim()) {
        return { message: res.ok ? 'Success' : `Request failed with status ${res.status}` };
      }
      try {
        return JSON.parse(text);
      } catch {
        return {
          message: text.length < 150 ? text.trim() : `Server returned non-JSON response (${res.status})`,
        };
      }
    } catch (err: any) {
      return { message: err?.message || 'Network communication error' };
    }
  };

  const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 15000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (err: any) {
      throw new Error(sanitizeNetworkError(err, url));
    } finally {
      clearTimeout(timer);
    }
  };

  const handleTabSwitch = (newTab: 'login' | 'signup') => {
    if (activeTab === newTab) return;
    setActiveTab(newTab);
    setError('');
    setTermsWarning('');
    setForgotWarning('');
    setLoginStep(1);
    setSignupStep(1);
  };

  const handleBack = useCallback(() => {
    setError('');
    setTermsWarning('');
    setForgotWarning('');
    if (activeTab === 'login') {
      if (loginStep === 2) {
        setLoginStep(1);
        return;
      }
    } else {
      if (signupStep === 1.6) {
        setSignupStep(1.5);
        return;
      }
      if (signupStep === 1.5) {
        setSignupStep(1);
        return;
      }
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Welcome');
    }
  }, [activeTab, loginStep, signupStep, navigation]);

  // =================== LOGIN LOGIC ===================
  const handleLoginPhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setLoginPhone(cleaned);
    if (forgotWarning) setForgotWarning('');
    if (setParentPhone) setParentPhone(cleaned);
  };

  const handleForgotPasswordPress = () => {
    setError('');
    setTermsWarning('');
    setForgotWarning('');

    const initial = loginIdentifierType === 'EMAIL' && loginEmail.includes('@') ? loginEmail.trim() : '';
    navigation.navigate('ForgotPassword', {
      initialEmail: initial,
    });
  };

  const handleLoginContinue = async (channel: 'SMS' | 'EMAIL' | 'PASSWORD') => {
    setError('');
    setTermsWarning('');
    if (channel !== 'PASSWORD') setLoginAuthChannel(channel);

    if (!acceptedTerms) {
      setTermsWarning(
        t('signup.termsRequired', {
          defaultValue: 'Please agree to the Terms of Service & Privacy Policy to continue.',
        })
      );
      return;
    }

    if (loginIdentifierType === 'EMAIL') {
      if (!loginEmail.trim() || !loginEmail.includes('@')) {
        setError(t('validation.emailInvalid', { defaultValue: 'Please enter a valid email address.' }));
        return;
      }
    } else {
      if (loginPhone.length !== 10) {
        setError(t('validation.mobileInvalid', { defaultValue: 'Please enter a valid 10-digit mobile number.' }));
        return;
      }
    }

    setLoading(true);
    try {
      if (channel === 'PASSWORD') {
        await handlePasswordLogin();
      } else {
        setLoginAuthChannel(channel);
        await handleSendLoginOtp(channel);
      }
    } catch (e: any) {
      if (!error) {
        setError(e?.message || t('common.error', { defaultValue: 'Something went wrong. Please try again.' }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendLoginOtp = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithTimeout(`${getApiUrl()}/auth/login/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          loginIdentifierType === 'EMAIL'
            ? { email: loginEmail.trim(), channel }
            : { mobile: loginPhone, channel }
        ),
      });
      const data = await safeFetchJson(res);
      if (!res.ok) {
        throw new Error(data.message || t('login.failedToSendOtp', { defaultValue: 'Failed to send OTP' }));
      }

      setLoginStep(2);
    } catch (e: any) {
      const msg = sanitizeNetworkError(e);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!loginPassword) {
      setError(t('login.enterPassword', { defaultValue: 'Enter password.' }));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithTimeout(`${getApiUrl()}/auth/login-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          loginIdentifierType === 'EMAIL'
            ? { email: loginEmail.trim(), password: loginPassword }
            : { mobile: loginPhone, password: loginPassword }
        ),
      });
      const data = await safeFetchJson(res);
      if (!res.ok) {
        throw new Error(data.message || t('login.invalidCredentials', { defaultValue: 'Invalid credentials' }));
      }

      const token = data.accessToken || data.access_token;
      authStore.accessToken = token;
      authStore.userId = data.user?.id;
      if (token && data.user) {
        await signIn({
          accessToken: token,
          refreshToken: data.refreshToken || '',
          user: { id: data.user.id, mobile: data.user.mobile || loginPhone || '' },
        });
      }
      const destination = route.params?.returnTo || 'MainTabs';
      navigation.navigate(destination);
    } catch (e: any) {
      setError(sanitizeNetworkError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (otpValue: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithTimeout(`${getApiUrl()}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          loginIdentifierType === 'EMAIL'
            ? { email: loginEmail.trim(), otp: otpValue, type: 'login' }
            : { mobile: loginPhone, otp: otpValue, type: 'login' }
        ),
      });
      const data = await safeFetchJson(res);
      if (!res.ok) {
        throw new Error(data.message || t('login.invalidOtp', { defaultValue: 'Invalid OTP' }));
      }

      const token = data.accessToken || data.access_token;
      authStore.accessToken = token;
      authStore.userId = data.user?.id;
      if (token && data.user) {
        await signIn({
          accessToken: token,
          refreshToken: data.refreshToken || '',
          user: { id: data.user.id, mobile: data.user.mobile || loginPhone || '' },
        });
      }
      const destination = route.params?.returnTo || 'MainTabs';
      navigation.navigate(destination);
    } catch (e: any) {
      setError(sanitizeNetworkError(e));
    } finally {
      setLoading(false);
    }
  };

  // =================== SIGNUP LOGIC ===================
  const handleSignupContinue = async (channel: 'SMS' | 'EMAIL') => {
    setError('');
    setTermsWarning('');
    setSignupAuthChannel(channel);

    if (!acceptedTerms) {
      setTermsWarning(
        t('signup.termsRequired', {
          defaultValue: 'Please agree to the Terms of Service & Privacy Policy to continue.',
        })
      );
      return;
    }

    if (channel === 'EMAIL') {
      if (!signupEmail.trim() || !signupEmail.includes('@')) {
        setError(t('validation.emailInvalid', { defaultValue: 'Please enter a valid email address.' }));
        return;
      }
    } else {
      if (signupMobile.length !== 10) {
        setError(t('validation.mobileInvalid', { defaultValue: 'Please enter a valid 10-digit mobile number.' }));
        return;
      }
    }

    await handleSendSignupOtp(channel);
  };

  const handleSendSignupOtp = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithTimeout(`${getApiUrl()}/auth/signup/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          channel === 'EMAIL' ? { email: signupEmail.trim(), channel } : { mobile: signupMobile, channel }
        ),
      });
      const data = await safeFetchJson(res);
      if (res.status === 409) {
        throw new Error(
          channel === 'EMAIL'
            ? t('signup.emailExists', {
                defaultValue: 'This email is already registered. Please log in instead.',
              })
            : t('signup.mobileExists', {
                defaultValue: 'This mobile number is already registered. Please log in instead.',
              })
        );
      }
      if (!res.ok) {
        throw new Error(data.message || t('login.failedToSendOtp', { defaultValue: 'Failed to send OTP' }));
      }

      setSignupStep(1.5);
    } catch (e: any) {
      setError(sanitizeNetworkError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignupOtp = async (otp: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithTimeout(`${getApiUrl()}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          signupAuthChannel === 'EMAIL'
            ? { email: signupEmail.trim(), otp, type: 'signup' }
            : { mobile: signupMobile, otp, type: 'signup' }
        ),
      });
      const data = await safeFetchJson(res);
      if (!res.ok) {
        throw new Error(data.message || t('login.invalidOtp', { defaultValue: 'Invalid OTP' }));
      }

      const token = data.accessToken || data.access_token;
      setSignupSession({ accessToken: token, refreshToken: data.refreshToken || '', user: data.user });

      if (token) {
        fetchWithTimeout(
          `${getApiUrl()}/consents`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ type: 'TERMS_AND_CONDITIONS' }),
          },
          5000
        ).catch(() => {});
      }

      setSignupStep(1.6);
    } catch (e: any) {
      setError(sanitizeNetworkError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSignup = async () => {
    if (signupPassword !== signupConfirmPassword) {
      setError(t('signup.passwordMismatch', { defaultValue: 'Passwords do not match' }));
      return;
    }
    if (signupPassword.length < 8) {
      setError(t('signup.reqLength', { defaultValue: 'At least 8 characters required' }));
      return;
    }
    if (!signupSession?.accessToken) {
      setError('Your session has expired. Please verify your contact details again.');
      setSignupStep(1);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithTimeout(`${getApiUrl()}/auth/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${signupSession.accessToken}`,
        },
        body: JSON.stringify({ password: signupPassword, clientType: 'retail' }),
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || 'Signup failed');

      const { accessToken: token, refreshToken, user } = signupSession;
      authStore.accessToken = token;
      authStore.userId = user?.id ?? null;
      if (token && user) {
        await signIn({
          accessToken: token,
          refreshToken,
          user: { id: user.id, mobile: user.mobile || signupMobile || '' },
        });
      }
      navigation.navigate('KYC');
    } catch (e: any) {
      setError(sanitizeNetworkError(e));
    } finally {
      setLoading(false);
    }
  };

  // =================== RENDER HELPERS ===================
  const renderTermsSection = () => (
    <View style={localStyles.termsWrapper}>
      <View style={localStyles.consentRow}>
        <Pressable
          onPress={() => {
            setAcceptedTerms(!acceptedTerms);
            if (!acceptedTerms) setTermsWarning('');
          }}
          hitSlop={8}
        >
          <View
            style={[
              localStyles.checkbox,
              acceptedTerms && localStyles.checkboxChecked,
              !!termsWarning && localStyles.checkboxError,
            ]}
          >
            {acceptedTerms && <Text style={localStyles.checkMark}>✓</Text>}
          </View>
        </Pressable>

        <Text style={localStyles.consentText}>
          <Text
            onPress={() => {
              setAcceptedTerms(!acceptedTerms);
              if (!acceptedTerms) setTermsWarning('');
            }}
          >
            {t('signup.termsPrefix', { defaultValue: 'I agree to the ' })}
          </Text>
          <Text
            onPress={() => setTermsModalVisible(true)}
            style={{ textDecorationLine: 'underline', color: colors.primary, fontWeight: '700' }}
          >
            {t('signup.termsOfService', { defaultValue: 'Terms of Service' })}
          </Text>
          <Text
            onPress={() => {
              setAcceptedTerms(!acceptedTerms);
              if (!acceptedTerms) setTermsWarning('');
            }}
          >
            {` ${t('signup.and', { defaultValue: 'and' })} `}
          </Text>
          <Text
            onPress={() => setPrivacyModalVisible(true)}
            style={{ textDecorationLine: 'underline', color: colors.primary, fontWeight: '700' }}
          >
            {t('signup.privacyPolicy', { defaultValue: 'Privacy Policy' })}
          </Text>
          <Text> </Text>
          <Text onPress={() => setTermsModalVisible(true)} style={localStyles.learnMoreText}>
            {t('signup.learnMore', { defaultValue: 'Learn more' })}
          </Text>
        </Text>
      </View>
    </View>
  );

  const isFormStep = (activeTab === 'login' && loginStep === 1) || (activeTab === 'signup' && signupStep === 1);

  return (
    <View style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <StatusBar style={colors.statusBar} />
      <Header title="" onBack={handleBack} showSettings={false} showNotifications={false} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.page,
            {
              paddingHorizontal: windowWidth < 360 ? 16 : 22,
              paddingBottom: Math.max(insets.bottom + 24, 36),
              maxWidth: 540,
              width: '100%',
              alignSelf: 'center',
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Horizontal Combined Tab Bar: LOGIN | SIGN UP */}
          {isFormStep && (
            <View style={[localStyles.tabBarContainer, { borderBottomColor: colors.border }]}>
              <View style={localStyles.tabBarRow}>
                <Pressable
                  onPress={() => handleTabSwitch('login')}
                  style={[localStyles.tabButton, activeTab === 'login' && localStyles.activeTabButton]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab === 'login' }}
                >
                  <Text
                    style={[
                      localStyles.tabButtonText,
                      { color: activeTab === 'login' ? (isDark ? colors.textPrimary : '#102A54') : '#718096' },
                      activeTab === 'login' && localStyles.activeTabButtonText,
                    ]}
                  >
                    LOGIN
                  </Text>
                  {activeTab === 'login' && (
                    <View style={[localStyles.activeIndicator, { backgroundColor: colors.primary || '#3C3985' }]} />
                  )}
                </Pressable>

                <View style={localStyles.tabDivider}>
                  <Text style={[localStyles.tabDividerText, { color: isDark ? colors.border : '#CBD5E0' }]}>|</Text>
                </View>

                <Pressable
                  onPress={() => handleTabSwitch('signup')}
                  style={[localStyles.tabButton, activeTab === 'signup' && localStyles.activeTabButton]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab === 'signup' }}
                >
                  <Text
                    style={[
                      localStyles.tabButtonText,
                      { color: activeTab === 'signup' ? (isDark ? colors.textPrimary : '#102A54') : '#718096' },
                      activeTab === 'signup' && localStyles.activeTabButtonText,
                    ]}
                  >
                    SIGN UP
                  </Text>
                  {activeTab === 'signup' && (
                    <View style={[localStyles.activeIndicator, { backgroundColor: colors.primary || '#3C3985' }]} />
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {/* ========================================================= */}
          {/* ======================= LOGIN TAB ======================= */}
          {/* ========================================================= */}
          {activeTab === 'login' && (
            <>
              {loginStep === 1 ? (
                <View style={localStyles.content}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>
                    {t('login.welcomeBack', { defaultValue: 'Welcome Back' })}
                  </Text>
                  <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {t('login.subtitle', { defaultValue: 'Securely login to your TechArtha account.' })}
                  </Text>

                  {(termsWarning || forgotWarning) ? (
                    <View style={localStyles.topWarningBanner}>
                      <Text style={localStyles.topWarningIcon}>⚠️</Text>
                      <Text style={localStyles.topWarningText}>{forgotWarning || termsWarning}</Text>
                    </View>
                  ) : null}

                  {loginIdentifierType === 'EMAIL' ? (
                    <View style={localStyles.inputGroup}>
                      <Text style={[styles.label, { color: colors.textPrimary }]}>
                        {t('login.emailAddress', { defaultValue: 'Email Address' })}
                      </Text>
                      <TextInput
                        value={loginEmail}
                        onChangeText={(val) => {
                          setLoginEmail(val);
                          if (forgotWarning) setForgotWarning('');
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder={t('login.emailPlaceholder', { defaultValue: 'Enter your email' })}
                        placeholderTextColor="#A0AEC0"
                        style={[
                          styles.field,
                          {
                            backgroundColor: colors.surface,
                            borderColor: forgotWarning ? '#E53E3E' : colors.border,
                            color: colors.textPrimary,
                          },
                        ]}
                      />
                    </View>
                  ) : (
                    <View style={localStyles.inputGroup}>
                      <Text style={[styles.label, { color: colors.textPrimary }]}>
                        {t('login.mobileNumber', { defaultValue: 'Mobile Number' })}
                      </Text>
                      <View
                        style={[
                          styles.phoneInput,
                          {
                            backgroundColor: colors.surface,
                            borderColor: forgotWarning ? '#E53E3E' : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.country, { color: colors.textPrimary, borderColor: colors.border }]}>+91</Text>
                        <TextInput
                          value={loginPhone}
                          onChangeText={handleLoginPhoneChange}
                          keyboardType="number-pad"
                          maxLength={10}
                          placeholder={t('login.mobilePlaceholder', { defaultValue: 'Enter 10-digit number' })}
                          placeholderTextColor="#A0AEC0"
                          style={[styles.input, { color: colors.textPrimary }]}
                        />
                      </View>
                    </View>
                  )}

                  <Text style={[styles.label, { color: colors.textPrimary }]}>
                    {t('login.loginVia', { defaultValue: 'Login via' })}
                  </Text>
                  <View style={[localStyles.toggleContainer, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                    <Pressable
                      style={[
                        localStyles.toggleBtn,
                        loginMethod === 'otp' && [localStyles.toggleActive, { backgroundColor: colors.surface }],
                      ]}
                      onPress={() => {
                        setLoginMethod('otp');
                        setForgotWarning('');
                        setError('');
                      }}
                    >
                      <Text style={[localStyles.toggleText, loginMethod === 'otp' && { color: colors.primary }]}>
                        {t('login.viaOtp', { defaultValue: 'OTP' })}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        localStyles.toggleBtn,
                        loginMethod === 'password' && [localStyles.toggleActive, { backgroundColor: colors.surface }],
                      ]}
                      onPress={() => {
                        setLoginMethod('password');
                        setForgotWarning('');
                        setError('');
                      }}
                    >
                      <Text style={[localStyles.toggleText, loginMethod === 'password' && { color: colors.primary }]}>
                        {t('login.viaPassword', { defaultValue: 'Password' })}
                      </Text>
                    </Pressable>
                  </View>

                  {error ? <Text style={localStyles.errorText}>{error}</Text> : null}

                  {loginMethod === 'password' ? (
                    <View>
                      <View style={localStyles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textPrimary }]}>
                          {t('login.password', { defaultValue: 'Password' })}
                        </Text>
                        <TextInput
                          secureTextEntry={!loginShowPassword}
                          value={loginPassword}
                          onChangeText={setLoginPassword}
                          placeholder={t('login.passwordPlaceholder', { defaultValue: 'Enter your password' })}
                          placeholderTextColor="#A0AEC0"
                          style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                        />
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 8,
                            marginTop: 8,
                          }}
                        >
                          <Pressable onPress={() => setLoginShowPassword(!loginShowPassword)} hitSlop={8}>
                            <Text style={[localStyles.switchText, { color: colors.primary }]}>
                              {loginShowPassword
                                ? t('signup.hidePassword', { defaultValue: 'Hide Password' })
                                : t('signup.showPassword', { defaultValue: 'Show Password' })}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={handleForgotPasswordPress}
                            hitSlop={8}
                          >
                            <Text style={[localStyles.switchText, { color: colors.primary, fontWeight: '800' }]}>
                              {t('login.forgotPassword', { defaultValue: 'Forgot Password?' })}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                      {renderTermsSection()}
                      <Pressable
                        style={[styles.primaryButton, loading && styles.primaryDisabled]}
                        onPress={() => handleLoginContinue('PASSWORD')}
                        disabled={loading || !loginPassword}
                      >
                        <Text style={[styles.primaryText, { flex: 1 }]}>
                          {loading
                            ? t('common.loading', { defaultValue: 'Loading...' })
                            : t('login.login', { defaultValue: 'Login' })}
                        </Text>
                        {!loading && <Text style={styles.primaryText}>→</Text>}
                      </Pressable>
                    </View>
                  ) : (
                    <View>
                      {renderTermsSection()}
                      {loginIdentifierType === 'EMAIL' ? (
                        <View>
                          <Pressable
                            style={[
                              styles.primaryButton,
                              loading && loginAuthChannel === 'EMAIL' && styles.primaryDisabled,
                            ]}
                            onPress={() => handleLoginContinue('EMAIL')}
                            disabled={loading}
                          >
                            <Text style={[styles.primaryText, { flex: 1 }]}>
                              {loading && loginAuthChannel === 'EMAIL'
                                ? t('common.loading', { defaultValue: 'Loading...' })
                                : t('login.continueWithEmail', { defaultValue: 'Continue with Email' })}
                            </Text>
                            {!(loading && loginAuthChannel === 'EMAIL') && <Text style={styles.primaryText}>→</Text>}
                          </Pressable>

                          <Pressable
                            style={[
                              localStyles.secondaryBoxBtn,
                              { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: colors.border, marginTop: 16 },
                            ]}
                            onPress={() => {
                              setLoginIdentifierType('MOBILE');
                              setLoginAuthChannel('SMS');
                              setError('');
                              setTermsWarning('');
                              setForgotWarning('');
                            }}
                          >
                            <Ionicons
                              name="phone-portrait-outline"
                              size={20}
                              color={isDark ? colors.textPrimary : '#3C3985'}
                              style={{ marginRight: 8 }}
                            />
                            <Text style={[localStyles.secondaryBoxText, { color: isDark ? colors.textPrimary : '#3C3985' }]}>
                              {t('signup.useMobileInstead', { defaultValue: 'Use mobile instead' })}
                            </Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View>
                          <Pressable
                            style={[
                              styles.primaryButton,
                              loading && loginAuthChannel === 'SMS' && styles.primaryDisabled,
                            ]}
                            onPress={() => handleLoginContinue('SMS')}
                            disabled={loading}
                          >
                            <Text style={[styles.primaryText, { flex: 1 }]}>
                              {loading && loginAuthChannel === 'SMS'
                                ? t('common.loading', { defaultValue: 'Loading...' })
                                : t('login.continueWithSms', { defaultValue: 'Continue with SMS' })}
                            </Text>
                            {!(loading && loginAuthChannel === 'SMS') && <Text style={styles.primaryText}>→</Text>}
                          </Pressable>

                          <Pressable
                            style={[
                              localStyles.secondaryBoxBtn,
                              { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: colors.border, marginTop: 16 },
                            ]}
                            onPress={() => {
                              setLoginIdentifierType('EMAIL');
                              setLoginAuthChannel('EMAIL');
                              setError('');
                              setTermsWarning('');
                              setForgotWarning('');
                            }}
                          >
                            <Ionicons
                              name="mail-outline"
                              size={20}
                              color={isDark ? colors.textPrimary : '#3C3985'}
                              style={{ marginRight: 8 }}
                            />
                            <Text style={[localStyles.secondaryBoxText, { color: isDark ? colors.textPrimary : '#3C3985' }]}>
                              {t('signup.useEmailInstead', { defaultValue: 'Use email instead' })}
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Tab switch shortcut footer */}
                  <View style={localStyles.footer}>
                    <Text style={[localStyles.footerText, { color: colors.textSecondary }]}>
                      {t('login.noAccount', { defaultValue: 'Not have an account?' })}{' '}
                    </Text>
                    <Pressable onPress={() => handleTabSwitch('signup')}>
                      <Text style={[localStyles.link, { color: colors.primary }]}>
                        {t('login.signUp', { defaultValue: 'Sign up' })}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <OtpVerification
                  identifierType={loginIdentifierType}
                  initialChannel={loginAuthChannel}
                  identifierValue={loginIdentifierType === 'EMAIL' ? loginEmail : loginPhone}
                  onSendOtp={handleSendLoginOtp}
                  onVerify={handleVerifyLoginOtp}
                  onChangeIdentifier={() => setLoginStep(1)}
                  loading={loading}
                  error={error}
                  setError={setError}
                />
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* ====================== SIGNUP TAB ======================= */}
          {/* ========================================================= */}
          {activeTab === 'signup' && (
            <>
              {signupStep === 1 && (
                <View style={localStyles.content}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>
                    {t('signup.title', { defaultValue: 'Create an account' })}
                  </Text>
                  <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {t('signup.subtitle', { defaultValue: 'Join thousands of Indians investing smartly.' })}
                  </Text>

                  {termsWarning ? (
                    <View style={localStyles.topWarningBanner}>
                      <Text style={localStyles.topWarningIcon}>⚠️</Text>
                      <Text style={localStyles.topWarningText}>{termsWarning}</Text>
                    </View>
                  ) : null}

                  {signupAuthChannel === 'EMAIL' ? (
                    <View style={localStyles.inputGroup}>
                      <Text style={[styles.label, { color: colors.textPrimary }]}>
                        {t('signup.emailAddress', { defaultValue: 'Email Address' })}
                      </Text>
                      <TextInput
                        value={signupEmail}
                        onChangeText={setSignupEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder={t('signup.emailPlaceholder', { defaultValue: 'Enter your email' })}
                        placeholderTextColor="#A0AEC0"
                        style={[
                          styles.field,
                          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
                        ]}
                      />
                    </View>
                  ) : (
                    <View style={localStyles.inputGroup}>
                      <Text style={[styles.label, { color: colors.textPrimary }]}>
                        {t('signup.mobileNumber', { defaultValue: 'Mobile Number' })}
                      </Text>
                      <View style={[styles.phoneInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.country, { color: colors.textPrimary, borderColor: colors.border }]}>+91</Text>
                        <TextInput
                          value={signupMobile}
                          onChangeText={(text) => setSignupMobile(text.replace(/\D/g, ''))}
                          keyboardType="number-pad"
                          maxLength={10}
                          placeholder={t('signup.mobilePlaceholder', { defaultValue: 'Enter 10-digit number' })}
                          placeholderTextColor="#A0AEC0"
                          style={[styles.input, { color: colors.textPrimary }]}
                        />
                      </View>
                    </View>
                  )}

                  {error ? <Text style={localStyles.errorText}>{error}</Text> : null}

                  {renderTermsSection()}

                  {signupAuthChannel === 'EMAIL' ? (
                    <View>
                      <Pressable
                        style={[
                          styles.primaryButton,
                          loading && signupAuthChannel === 'EMAIL' && styles.primaryDisabled,
                        ]}
                        onPress={() => handleSignupContinue('EMAIL')}
                        disabled={loading}
                      >
                        <Text style={[styles.primaryText, { flex: 1 }]}>
                          {loading && signupAuthChannel === 'EMAIL'
                            ? t('common.loading', { defaultValue: 'Loading...' })
                            : t('signup.continueWithEmail', { defaultValue: 'Continue with Email' })}
                        </Text>
                        {!(loading && signupAuthChannel === 'EMAIL') && <Text style={styles.primaryText}>→</Text>}
                      </Pressable>

                      <Pressable
                        style={[
                          localStyles.secondaryBoxBtn,
                          { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: colors.border, marginTop: 16 },
                        ]}
                        onPress={() => {
                          setSignupAuthChannel('SMS');
                          setError('');
                          setTermsWarning('');
                        }}
                      >
                        <Ionicons
                          name="phone-portrait-outline"
                          size={20}
                          color={isDark ? colors.textPrimary : '#3C3985'}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={[localStyles.secondaryBoxText, { color: isDark ? colors.textPrimary : '#3C3985' }]}>
                          {t('signup.useMobileInstead', { defaultValue: 'Use mobile instead' })}
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View>
                      <Pressable
                        style={[
                          styles.primaryButton,
                          loading && signupAuthChannel === 'SMS' && styles.primaryDisabled,
                        ]}
                        onPress={() => handleSignupContinue('SMS')}
                        disabled={loading}
                      >
                        <Text style={[styles.primaryText, { flex: 1 }]}>
                          {loading && signupAuthChannel === 'SMS'
                            ? t('common.loading', { defaultValue: 'Loading...' })
                            : t('signup.continueWithSms', { defaultValue: 'Continue with SMS' })}
                        </Text>
                        {!(loading && signupAuthChannel === 'SMS') && <Text style={styles.primaryText}>→</Text>}
                      </Pressable>

                      <Pressable
                        style={[
                          localStyles.secondaryBoxBtn,
                          { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: colors.border, marginTop: 16 },
                        ]}
                        onPress={() => {
                          setSignupAuthChannel('EMAIL');
                          setError('');
                          setTermsWarning('');
                        }}
                      >
                        <Ionicons
                          name="mail-outline"
                          size={20}
                          color={isDark ? colors.textPrimary : '#3C3985'}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={[localStyles.secondaryBoxText, { color: isDark ? colors.textPrimary : '#3C3985' }]}>
                          {t('signup.useEmailInstead', { defaultValue: 'Use email instead' })}
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  {/* Tab switch shortcut footer */}
                  <View style={localStyles.footer}>
                    <Text style={[localStyles.footerText, { color: colors.textSecondary }]}>
                      {t('signup.haveAccount', { defaultValue: 'Already have an account?' })}{' '}
                    </Text>
                    <Pressable onPress={() => handleTabSwitch('login')}>
                      <Text style={[localStyles.link, { color: colors.primary }]}>
                        {t('signup.logIn', { defaultValue: 'Log in' })}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {signupStep === 1.5 && (
                <OtpVerification
                  identifierType={signupAuthChannel === 'EMAIL' ? 'EMAIL' : 'MOBILE'}
                  initialChannel={signupAuthChannel}
                  identifierValue={signupAuthChannel === 'EMAIL' ? signupEmail : signupMobile}
                  onSendOtp={handleSendSignupOtp}
                  onVerify={handleVerifySignupOtp}
                  onChangeIdentifier={() => setSignupStep(1)}
                  loading={loading}
                  error={error}
                  setError={setError}
                />
              )}

              {signupStep === 1.6 && (
                <View style={localStyles.content}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>
                    {t('signup.passwordLabel', { defaultValue: 'Create Password' })}
                  </Text>

                  <View style={localStyles.warningBox}>
                    <Text style={localStyles.warningText}>
                      ⚠️ Please create a secure password. Tap the{' '}
                      <Text style={{ fontWeight: '900', color: '#D69E2E' }}>ⓘ Info</Text> icon below to view password
                      requirements.
                    </Text>
                  </View>

                  <View style={localStyles.inputGroup}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Text style={[styles.label, { color: colors.textPrimary }]}>
                        {t('login.password', { defaultValue: 'Password' })}
                      </Text>
                      <Pressable onPress={() => setSignupShowReqs(!signupShowReqs)} hitSlop={10} style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '800' }}>ⓘ Info</Text>
                      </Pressable>
                    </View>

                    <View
                      style={[
                        styles.field,
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 0,
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <TextInput
                        secureTextEntry={!signupShowPassword}
                        value={signupPassword}
                        onChangeText={setSignupPassword}
                        placeholder={t('signup.passwordPlaceholder', { defaultValue: 'Secure password' })}
                        placeholderTextColor="#A0AEC0"
                        style={{ flex: 1, paddingHorizontal: 16, fontSize: 16, color: colors.textPrimary }}
                      />
                      <Pressable
                        onPress={() => setSignupShowPassword(!signupShowPassword)}
                        style={{ paddingHorizontal: 16, paddingVertical: 12 }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#718096' }}>
                          {signupShowPassword ? 'Hide' : 'Show'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {signupShowReqs && (
                    <View style={localStyles.requirementsBox}>
                      <View style={localStyles.reqHeader}>
                        <Text style={{ fontSize: 16 }}>ℹ️</Text>
                        <Text style={localStyles.reqTitle}>Password Requirements</Text>
                      </View>
                      <View style={localStyles.reqList}>
                        <View style={localStyles.reqItem}>
                          <Text
                            style={[
                              localStyles.reqIcon,
                              signupPassword.length >= 8 ? localStyles.reqMet : localStyles.reqUnmet,
                            ]}
                          >
                            {signupPassword.length >= 8 ? '✓' : '✕'}
                          </Text>
                          <Text style={localStyles.reqText}>Minimum 8 characters</Text>
                        </View>
                        <View style={localStyles.reqItem}>
                          <Text
                            style={[
                              localStyles.reqIcon,
                              /[A-Z]/.test(signupPassword) ? localStyles.reqMet : localStyles.reqUnmet,
                            ]}
                          >
                            {/[A-Z]/.test(signupPassword) ? '✓' : '✕'}
                          </Text>
                          <Text style={localStyles.reqText}>Uppercase letter</Text>
                        </View>
                        <View style={localStyles.reqItem}>
                          <Text
                            style={[
                              localStyles.reqIcon,
                              /[a-z]/.test(signupPassword) ? localStyles.reqMet : localStyles.reqUnmet,
                            ]}
                          >
                            {/[a-z]/.test(signupPassword) ? '✓' : '✕'}
                          </Text>
                          <Text style={localStyles.reqText}>Lowercase letter</Text>
                        </View>
                        <View style={localStyles.reqItem}>
                          <Text
                            style={[
                              localStyles.reqIcon,
                              /[0-9]/.test(signupPassword) ? localStyles.reqMet : localStyles.reqUnmet,
                            ]}
                          >
                            {/[0-9]/.test(signupPassword) ? '✓' : '✕'}
                          </Text>
                          <Text style={localStyles.reqText}>Number</Text>
                        </View>
                        <View style={localStyles.reqItem}>
                          <Text
                            style={[
                              localStyles.reqIcon,
                              /[^A-Za-z0-9]/.test(signupPassword) ? localStyles.reqMet : localStyles.reqUnmet,
                            ]}
                          >
                            {/[^A-Za-z0-9]/.test(signupPassword) ? '✓' : '✕'}
                          </Text>
                          <Text style={localStyles.reqText}>Special character</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  <View style={localStyles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>
                      {t('signup.confirmPassword', { defaultValue: 'Confirm Password' })}
                    </Text>
                    <View
                      style={[
                        styles.field,
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 0,
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <TextInput
                        secureTextEntry={!signupShowConfirmPassword}
                        value={signupConfirmPassword}
                        onChangeText={setSignupConfirmPassword}
                        placeholder={t('signup.confirmPasswordPlaceholder', { defaultValue: 'Confirm password' })}
                        placeholderTextColor="#A0AEC0"
                        style={{ flex: 1, paddingHorizontal: 16, fontSize: 16, color: colors.textPrimary }}
                      />
                      <Pressable
                        onPress={() => setSignupShowConfirmPassword(!signupShowConfirmPassword)}
                        style={{ paddingHorizontal: 16, paddingVertical: 12 }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#718096' }}>
                          {signupShowConfirmPassword ? 'Hide' : 'Show'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {error ? <Text style={localStyles.errorText}>{error}</Text> : null}

                  <Pressable
                    style={[styles.primaryButton, loading && styles.primaryDisabled]}
                    onPress={handleCompleteSignup}
                    disabled={loading}
                  >
                    <Text style={[styles.primaryText, { flex: 1 }]}>
                      {loading
                        ? t('common.loading', { defaultValue: 'Creating...' })
                        : t('signup.continueToKyc', { defaultValue: 'Complete Signup' })}
                    </Text>
                    {!loading && <Text style={styles.primaryText}>→</Text>}
                  </Pressable>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <TermsModal visible={termsModalVisible} onClose={() => setTermsModalVisible(false)} />
      <PrivacyPolicyModal visible={privacyModalVisible} onClose={() => setPrivacyModalVisible(false)} />
    </View>
  );
};

const localStyles = StyleSheet.create({
  // Horizontal Tab Bar styles inspired by Myntra
  tabBarContainer: {
    marginBottom: 20,
    marginTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  activeTabButton: {},
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  activeTabButtonText: {
    fontWeight: '800',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 12,
    right: 12,
    height: 3.5,
    borderRadius: 2,
  },
  tabDivider: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabDividerText: {
    fontSize: 18,
    fontWeight: '300',
  },
  content: { paddingBottom: 40 },
  inputGroup: { marginBottom: 16 },
  errorText: { color: '#E53E3E', fontSize: 14, marginBottom: 16, fontWeight: '500' },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FB',
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', borderRadius: 8 },
  toggleActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  toggleText: { fontSize: 14, fontWeight: '700', color: '#718096' },
  secondaryBoxBtn: {
    minHeight: 54,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  secondaryBoxText: { fontSize: 16, fontWeight: '700', color: '#102A54', flexShrink: 1 },
  termsWrapper: { marginTop: 4, marginBottom: 16 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
    marginRight: 10,
    marginTop: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: { backgroundColor: '#3C3985', borderColor: '#3C3985' },
  checkboxError: { borderColor: '#E53E3E' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  consentText: { color: '#718096', fontSize: 12.5, flex: 1, lineHeight: 19 },
  learnMoreText: { color: '#2B6CB0', fontSize: 12.5, fontWeight: '700', textDecorationLine: 'underline' },
  topWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  topWarningIcon: { fontSize: 16, marginRight: 8 },
  topWarningText: { flex: 1, color: '#C53030', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 },
  footerText: { color: '#718096', fontSize: 14 },
  link: { color: '#3C3985', fontSize: 14, fontWeight: '700' },
  switchText: { color: '#3C3985', fontSize: 14, fontWeight: '600' },
  warningBox: {
    backgroundColor: '#FEFCBF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F6E05E',
  },
  warningText: { color: '#744210', fontSize: 13, lineHeight: 18, fontWeight: '500' },
  requirementsBox: {
    backgroundColor: '#EDF2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reqHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reqTitle: { fontSize: 13, fontWeight: '700', color: '#2D3748', marginLeft: 6 },
  reqList: { gap: 4 },
  reqItem: { flexDirection: 'row', alignItems: 'center' },
  reqIcon: { fontSize: 12, marginRight: 8, fontWeight: 'bold' },
  reqMet: { color: '#38A169' },
  reqUnmet: { color: '#E53E3E' },
  reqText: { fontSize: 12, color: '#4A5568' },
});

export default AuthScreen;
