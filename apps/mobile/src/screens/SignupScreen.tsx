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
import { PasswordRequirementsBox } from '../components/PasswordRequirementsBox';
import { API_URL } from '../services/api/client';
import {
  isValidEmailFormat,
  normalizeEmailInput,
  validatePasswordMatchAndStrength,
} from '../utils/passwordValidation';
import { getScrollBottomPadding } from '../utils/tabBarMetrics';

interface SignupScreenProps {
  apiUrl?: string;
}

export const SignupScreen = ({ apiUrl = API_URL }: SignupScreenProps) => {
  const effectiveApiUrl = (apiUrl && apiUrl.startsWith('https://')) ? apiUrl : API_URL;
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const termsOffsetY = useRef(0);
  
  const [step, setStep] = useState(1);
  const [authChannel, setAuthChannel] = useState<'SMS' | 'WHATSAPP' | 'EMAIL'>('SMS');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
      setMobile('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setStep(1);
      setError('');
      setAcceptedTerms(false);
      setTermsWarning('');
    }, [])
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Returned by the server only outside production with AUTH_DEV_BYPASS on. Carried so
  // the OTP screen can prefill it while real SMS and WhatsApp delivery is unreliable.
  const [devOtp, setDevOtp] = useState<string | null>(null);
  // Held between OTP verification (which creates the account) and the password step.
  const [signupSession, setSignupSession] = useState<{
    accessToken: string;
    refreshToken: string;
    user?: { id: string; mobile?: string };
  } | null>(null);
  const [error, setError] = useState('');
  const [showReqs, setShowReqs] = useState(true);

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

  const handleContinue = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => {
    setError('');
    setTermsWarning('');
    setAuthChannel(channel);
    
    if (!acceptedTerms) {
      setTermsWarning(t('signup.termsRequired', { defaultValue: 'Please agree to the Terms of Service & Privacy Policy to continue.' }));
      scrollToTerms();
      return;
    }
    
    if (channel === 'EMAIL') {
      if (!isValidEmailFormat(email)) {
        setError(t('validation.emailInvalid', { defaultValue: 'Please enter a valid email address.' }));
        return;
      }
    } else {
      if (mobile.length !== 10) {
        setError(t('validation.mobileInvalid', { defaultValue: 'Please enter a valid 10-digit mobile number.' }));
        return;
      }
    }

    // No separate existence check: /auth/signup/start answers 409 for a registered
    // number, which handleSendSignupOtp already turns into "please log in instead".
    setAuthChannel(channel);
    await handleSendSignupOtp(channel);
  };

  const handleSendSignupOtp = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => {
    setLoading(true);
    setError('');
    try {
      const normalizedEmail = normalizeEmailInput(email);
      const res = await fetchWithTimeout(`${effectiveApiUrl}/auth/signup/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channel === 'EMAIL' ? { email: normalizedEmail, channel } : { mobile, channel })
      });
      const data = await safeFetchJson(res);
      setDevOtp(data?.devOtp ?? null);
      if (res.status === 409) {
        throw new Error(channel === 'EMAIL' ? t('signup.emailExists', { defaultValue: 'This email is already registered. Please log in instead.' }) : t('signup.mobileExists', { defaultValue: 'This mobile number is already registered. Please log in instead.' }));
      }
      if (!res.ok) throw new Error(data.message || t('login.failedToSendOtp', { defaultValue: 'Failed to send OTP' }));
      
      setStep(1.5);
    } catch (e: any) {
      const isCanceled = e?.name === 'AbortError' || e?.message?.includes('cancel') || e?.message?.includes('aborted');
      setError(isCanceled ? 'Connection timed out. Please try again.' : e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    setLoading(true);
    setError('');
    try {
      const normalizedEmail = normalizeEmailInput(email);
      const res = await fetchWithTimeout(`${effectiveApiUrl}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authChannel === 'EMAIL' ? { email: normalizedEmail, otp, type: 'signup' } : { mobile, otp, type: 'signup' })
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || t('login.invalidOtp', { defaultValue: 'Invalid OTP' }));

      // Verifying the OTP creates the account and signs the investor in. The session is
      // kept for the password step, which acts on it rather than on the mobile number.
      const token = data.accessToken || data.access_token;
      setSignupSession({ accessToken: token, refreshToken: data.refreshToken || '', user: data.user });

      // Persist TERMS_AND_CONDITIONS consent reliably before advancing.
      if (token && acceptedTerms) {
        try {
          await fetchWithTimeout(`${effectiveApiUrl}/consents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ type: 'TERMS_AND_CONDITIONS' }),
          }, 5000);
        } catch {
          // Best-effort network resilience: do not trap a verified user before password creation.
        }
      }

      setStep(1.6);
    } catch (e: any) {
      const isCanceled = e?.name === 'AbortError' || e?.message?.includes('cancel') || e?.message?.includes('aborted');
      setError(isCanceled ? 'Connection timed out. Please try again.' : e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    const pwdError = validatePasswordMatchAndStrength(password, confirmPassword);
    if (pwdError) {
      setError(pwdError);
      return;
    }
    if (!signupSession?.accessToken) {
      setError('Your session has expired. Please verify your number again.');
      setStep(1);
      return;
    }
    setLoading(true);
    setError('');
    try {
      // POST /auth/signup would refuse here: the OTP step already created the account.
      // The password is set on that account through its own session instead.
      const res = await fetchWithTimeout(`${effectiveApiUrl}/auth/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${signupSession.accessToken}` },
        body: JSON.stringify({ password, clientType: 'retail' })
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || 'Signup failed');

      const { accessToken: token, refreshToken, user } = signupSession;
      authStore.accessToken = token;
      authStore.userId = user?.id;
      if (token && user) {
        await signIn({
          accessToken: token,
          refreshToken,
          user: { id: user.id, mobile: user.mobile || mobile || '' }
        });
      }
      navigation.navigate('KYC');
    } catch (e: any) {
      const isCanceled = e?.name === 'AbortError' || e?.message?.includes('cancel') || e?.message?.includes('aborted');
      setError(isCanceled ? 'Connection timed out. Please try again.' : e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <Header title="" onBack={() => {
        if (step > 1) setStep(1);
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
          {step === 1 && (
            <View style={localStyles.content}>
              <Text style={styles.title}>{t('signup.title', { defaultValue: 'Create an account' })}</Text>
              <Text style={styles.description}>{t('signup.subtitle', { defaultValue: 'Join thousands of Indians investing smartly.' })}</Text>

              {authChannel === 'EMAIL' ? (
                <View style={localStyles.inputGroup}>
                  <Text style={styles.label}>{t('signup.emailAddress', { defaultValue: 'Email Address' })}</Text>
                  <TextInput 
                    testID="signup-email-input"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="emailAddress"
                    autoComplete="email"
                    placeholder={t('signup.emailPlaceholder', { defaultValue: 'Enter your email' })}
                    style={styles.field}
                  />
                </View>
              ) : (
                <View style={localStyles.inputGroup}>
                  <Text style={styles.label}>{t('signup.mobileNumber', { defaultValue: 'Mobile Number' })}</Text>
                  <View style={styles.phoneInput}>
                    <Text style={styles.country}>+91</Text>
                    <TextInput 
                      testID="signup-mobile-input"
                      value={mobile}
                      onChangeText={(text) => setMobile(text.replace(/\D/g, ''))}
                      keyboardType="number-pad"
                      maxLength={10}
                      placeholder={t('signup.mobilePlaceholder', { defaultValue: 'Enter 10-digit number' })}
                      style={styles.input}
                    />
                  </View>
                </View>
              )}

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

              {authChannel === 'EMAIL' ? (
                <View>
                  <Pressable 
                    testID="signup-email-continue"
                    style={[
                      styles.primaryButton,
                      localStyles.primaryActionSpacing,
                      (!acceptedTerms || (loading && authChannel === 'EMAIL')) && styles.primaryDisabled,
                    ]} 
                    onPress={() => handleContinue('EMAIL')} 
                    disabled={loading}
                  >
                    <Text style={styles.primaryText}>
                      {(loading && authChannel === 'EMAIL') ? t('common.loading', { defaultValue: 'Loading...' }) : t('signup.continueWithEmail', { defaultValue: 'Continue with Email' })}
                    </Text>
                    {!(loading && authChannel === 'EMAIL') && <Text style={styles.primaryText}>→</Text>}
                  </Pressable>

                  <Pressable 
                    style={[localStyles.secondaryBoxBtn, { marginTop: 16 }]} 
                    onPress={() => { setAuthChannel('SMS'); setError(''); setTermsWarning(''); }}
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
                    testID="signup-sms-continue"
                    style={[
                      styles.primaryButton,
                      localStyles.primaryActionSpacing,
                      (!acceptedTerms || (loading && authChannel === 'SMS')) && styles.primaryDisabled,
                    ]} 
                    onPress={() => handleContinue('SMS')} 
                    disabled={loading}
                  >
                    <Text style={styles.primaryText}>
                      {(loading && authChannel === 'SMS') ? t('common.loading', { defaultValue: 'Loading...' }) : t('signup.continueWithSms', { defaultValue: 'Continue with SMS' })}
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
                      {(loading && authChannel === 'WHATSAPP') ? t('common.loading', { defaultValue: 'Loading...' }) : t('signup.continueWithWa', { defaultValue: 'Continue with WhatsApp' })}
                    </Text>
                  </Pressable>

                  <Pressable 
                    style={localStyles.secondaryBoxBtn} 
                    onPress={() => { setAuthChannel('EMAIL'); setError(''); setTermsWarning(''); }}
                  >
                    <Ionicons name="mail-outline" size={20} color="#3C3985" style={{ marginRight: 8 }} />
                    <Text style={localStyles.secondaryBoxText}>
                      {t('signup.useEmailInstead', { defaultValue: 'Use email instead' })}
                    </Text>
                  </Pressable>
                </View>
              )}

              <View style={localStyles.footer}>
                <Text style={localStyles.footerText}>{t('signup.haveAccount', { defaultValue: 'Already have an account?' })} </Text>
                <Pressable onPress={() => navigation.navigate('Login')}><Text style={localStyles.link}>{t('signup.logIn', { defaultValue: 'Log in' })}</Text></Pressable>
              </View>
            </View>
          )}

          {step === 1.5 && (
            <OtpVerification
              identifierType={authChannel === 'EMAIL' ? 'EMAIL' : 'MOBILE'}
              initialChannel={authChannel}
              identifierValue={authChannel === 'EMAIL' ? email : mobile}
              onSendOtp={handleSendSignupOtp}
              onVerify={handleVerifyOtp}
              onChangeIdentifier={() => setStep(1)}
              loading={loading}
              error={error}
              setError={setError}
              devOtp={devOtp}
            />
          )}

          {step === 1.6 && (
            <View style={localStyles.content}>
              <Text style={styles.title}>{t('signup.passwordLabel', { defaultValue: 'Create Password' })}</Text>
              
              <View style={localStyles.warningBox}>
                <Text style={localStyles.warningText}>
                  ⚠️ Please create a strong password that satisfies all security requirements below.
                </Text>
              </View>
              
              <View style={localStyles.inputGroup}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Text style={styles.label}>{t('login.password', { defaultValue: 'Password' })}</Text>
                  <Pressable onPress={() => setShowReqs(!showReqs)} hitSlop={10} style={{marginBottom: 8}}>
                    <Text style={{fontSize: 14, color: '#3C3985', fontWeight: '800'}}>
                      {showReqs ? 'ⓘ Hide Info' : 'ⓘ Info'}
                    </Text>
                  </Pressable>
                </View>
                
                <View style={[styles.field, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0 }]}>
                  <TextInput 
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    textContentType="newPassword"
                    autoComplete="password-new"
                    placeholder={t('signup.passwordPlaceholder', { defaultValue: 'Secure password' })}
                    style={{ flex: 1, paddingHorizontal: 16, fontSize: 16, color: '#102A54' }}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#718096' }}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </Pressable>
                </View>
              </View>

              {showReqs ? <PasswordRequirementsBox password={password} /> : null}

              <View style={localStyles.inputGroup}>
                <Text style={styles.label}>{t('signup.confirmPassword', { defaultValue: 'Confirm Password' })}</Text>
                <View style={[styles.field, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0 }]}>
                  <TextInput 
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    textContentType="newPassword"
                    autoComplete="password-new"
                    placeholder={t('signup.confirmPasswordPlaceholder', { defaultValue: 'Confirm password' })}
                    style={{ flex: 1, paddingHorizontal: 16, fontSize: 16, color: '#102A54' }}
                  />
                  <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#718096' }}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                  </Pressable>
                </View>
              </View>
              
              {error ? <Text style={localStyles.errorText}>{error}</Text> : null}

              <Pressable style={[styles.primaryButton, loading && styles.primaryDisabled]} onPress={handleSignup} disabled={loading}>
                <Text style={styles.primaryText}>{loading ? t('common.loading', { defaultValue: 'Creating...' }) : t('signup.continueToKyc', { defaultValue: 'Complete Signup' })}</Text>
                {!loading && <Text style={styles.primaryText}>→</Text>}
              </Pressable>
            </View>
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
  warningBox: { backgroundColor: '#FEFCBF', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#F6E05E' },
  warningText: { color: '#744210', fontSize: 13, lineHeight: 18, fontWeight: '500' },
  content: { paddingBottom: 24 },
  inputGroup: { marginBottom: 16 },
  errorText: { color: '#E53E3E', fontSize: 14, marginTop: 4, marginBottom: 12, fontWeight: '500' },
  primaryActionSpacing: { marginTop: 16 },
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
});
