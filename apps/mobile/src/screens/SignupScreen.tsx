import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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

interface SignupScreenProps {
  apiUrl: string;
}

export const SignupScreen = ({ apiUrl }: SignupScreenProps) => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const { signIn } = useAuth();
  
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
  const [error, setError] = useState('');
  const [showReqs, setShowReqs] = useState(false);

  const safeFetchJson = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return { message: 'Network or parsing error' };
    }
  };

  const handleContinue = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => {
    setError('');
    setTermsWarning('');
    setAuthChannel(channel);
    
    if (!acceptedTerms) {
      setTermsWarning(t('signup.termsRequired', { defaultValue: 'Please agree to the Terms of Service & Privacy Policy to continue.' }));
      return;
    }
    
    if (channel === 'EMAIL') {
      if (!email.trim() || !email.includes('@')) {
        setError(t('validation.emailInvalid', { defaultValue: 'Please enter a valid email address.' }));
        return;
      }
    } else {
      if (mobile.length !== 10) {
        setError(t('validation.mobileInvalid', { defaultValue: 'Please enter a valid 10-digit mobile number.' }));
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/auth/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channel === 'EMAIL' ? { email } : { mobile })
      });
      const data = await safeFetchJson(res);
      if (data.exists) {
        setError(channel === 'EMAIL' ? t('signup.emailExists', { defaultValue: 'This email is already registered. Please log in instead.' }) : t('signup.mobileExists', { defaultValue: 'This mobile number is already registered. Please log in instead.' }));
        setLoading(false);
        return;
      }
      
      setAuthChannel(channel);
      await handleSendSignupOtp(channel);
    } catch (e: any) {
      setError(t('common.error', { defaultValue: 'Something went wrong. Please try again.' }));
      setLoading(false);
    }
  };

  const handleSendSignupOtp = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/auth/signup/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channel === 'EMAIL' ? { email, channel } : { mobile, channel })
      });
      const data = await safeFetchJson(res);
      setDevOtp(data?.devOtp ?? null);
      if (res.status === 409) {
        throw new Error(channel === 'EMAIL' ? t('signup.emailExists', { defaultValue: 'This email is already registered. Please log in instead.' }) : t('signup.mobileExists', { defaultValue: 'This mobile number is already registered. Please log in instead.' }));
      }
      if (!res.ok) throw new Error(data.message || t('login.failedToSendOtp', { defaultValue: 'Failed to send OTP' }));
      
      setStep(1.5);
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
        body: JSON.stringify(authChannel === 'EMAIL' ? { email, otp, type: 'signup' } : { mobile, otp, type: 'signup' })
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || t('login.invalidOtp', { defaultValue: 'Invalid OTP' }));
      
      setStep(1.6);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      setError(t('signup.passwordMismatch', { defaultValue: 'Passwords do not match' }));
      return;
    }
    if (password.length < 8) {
      setError(t('signup.reqLength', { defaultValue: 'At least 8 characters required' }));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authChannel === 'EMAIL' 
          ? { email, password, clientType: 'retail' } 
          : { mobile, password, clientType: 'retail' })
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      
      const token = data.accessToken || data.access_token;
      authStore.accessToken = token;
      authStore.userId = data.user?.id;
      if (token && data.user) {
        await signIn({
          accessToken: token,
          refreshToken: data.refreshToken || '',
          user: { id: data.user.id, mobile: data.user.mobile || mobile || '' }
        });
      }
      navigation.navigate('ProfileSetup');
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
        if (step > 1) setStep(1);
        else navigation.goBack();
      }} />
      <ScrollView style={styles.page} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View style={localStyles.content}>
            <Text style={styles.title}>{t('signup.title', { defaultValue: 'Create an account' })}</Text>
            <Text style={styles.description}>{t('signup.subtitle', { defaultValue: 'Join thousands of Indians investing smartly.' })}</Text>

            {termsWarning ? (
              <View style={localStyles.topWarningBanner}>
                <Text style={localStyles.topWarningIcon}>⚠️</Text>
                <Text style={localStyles.topWarningText}>{termsWarning}</Text>
              </View>
            ) : null}
            
            {authChannel === 'EMAIL' ? (
              <View style={localStyles.inputGroup}>
                <Text style={styles.label}>{t('signup.emailAddress', { defaultValue: 'Email Address' })}</Text>
                <TextInput 
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
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

            {authChannel === 'EMAIL' ? (
              <View>
                <Pressable 
                  style={[styles.primaryButton, (loading && authChannel === 'EMAIL') && styles.primaryDisabled, localStyles.mt24]} 
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
                  style={[styles.primaryButton, (loading && authChannel === 'SMS') && styles.primaryDisabled, localStyles.mt24]} 
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

            <View style={localStyles.termsWrapper}>
              <View style={localStyles.consentRow}>
                <Pressable 
                  onPress={() => { 
                    setAcceptedTerms(!acceptedTerms); 
                    if (!acceptedTerms) setTermsWarning(''); 
                  }}
                  hitSlop={8}
                >
                  <View style={[localStyles.checkbox, acceptedTerms && localStyles.checkboxChecked, !!termsWarning && localStyles.checkboxError]}>
                    {acceptedTerms && <Text style={localStyles.checkMark}>✓</Text>}
                  </View>
                </Pressable>

                <Text style={localStyles.consentText}>
                  <Text onPress={() => {
                    setAcceptedTerms(!acceptedTerms); 
                    if (!acceptedTerms) setTermsWarning(''); 
                  }}>
                    {t('signup.termsPrefix', { defaultValue: 'I agree to the ' })}
                  </Text>
                  <Text 
                    onPress={() => setTermsModalVisible(true)} 
                    style={{ textDecorationLine: 'underline', color: '#102A54', fontWeight: '600' }}
                  >
                    {t('signup.termsOfService', { defaultValue: 'Terms of Service' })}
                  </Text>
                  <Text onPress={() => {
                    setAcceptedTerms(!acceptedTerms); 
                    if (!acceptedTerms) setTermsWarning(''); 
                  }}>
                    {` ${t('signup.and', { defaultValue: 'and' })} `}
                  </Text>
                  <Text 
                    onPress={() => setPrivacyModalVisible(true)} 
                    style={{ textDecorationLine: 'underline', color: '#102A54', fontWeight: '600' }}
                  >
                    {t('signup.privacyPolicy', { defaultValue: 'Privacy Policy' })}
                  </Text>
                  <Text> </Text>
                  <Text 
                    onPress={() => setTermsModalVisible(true)} 
                    style={localStyles.learnMoreText}
                  >
                    {t('signup.learnMore', { defaultValue: 'Learn more' })}
                  </Text>
                </Text>
              </View>
            </View>
            
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
                ⚠️ Please create a secure password. Tap the <Text style={{fontWeight: '900', color: '#D69E2E'}}>ⓘ Info</Text> icon below to view password requirements.
              </Text>
            </View>
            
            <View style={localStyles.inputGroup}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={styles.label}>{t('login.password', { defaultValue: 'Password' })}</Text>
                <Pressable onPress={() => setShowReqs(!showReqs)} hitSlop={10} style={{marginBottom: 8}}>
                  <Text style={{fontSize: 14, color: '#3C3985', fontWeight: '800'}}>ⓘ Info</Text>
                </Pressable>
              </View>
              
              <View style={[styles.field, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0 }]}>
                <TextInput 
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('signup.passwordPlaceholder', { defaultValue: 'Secure password' })}
                  style={{ flex: 1, paddingHorizontal: 16, fontSize: 16, color: '#102A54' }}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#718096' }}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
            </View>

            {showReqs && (
              <View style={localStyles.requirementsBox}>
                <View style={localStyles.reqHeader}>
                  <Text style={{fontSize: 16}}>ℹ️</Text>
                  <Text style={localStyles.reqTitle}>Password Requirements</Text>
                </View>
                <View style={localStyles.reqList}>
                  <View style={localStyles.reqItem}>
                    <Text style={[localStyles.reqIcon, password.length >= 8 ? localStyles.reqMet : localStyles.reqUnmet]}>{password.length >= 8 ? '✓' : '✕'}</Text>
                    <Text style={localStyles.reqText}>Minimum 8 characters</Text>
                  </View>
                  <View style={localStyles.reqItem}>
                    <Text style={[localStyles.reqIcon, /[A-Z]/.test(password) ? localStyles.reqMet : localStyles.reqUnmet]}>{/[A-Z]/.test(password) ? '✓' : '✕'}</Text>
                    <Text style={localStyles.reqText}>Uppercase letter</Text>
                  </View>
                  <View style={localStyles.reqItem}>
                    <Text style={[localStyles.reqIcon, /[a-z]/.test(password) ? localStyles.reqMet : localStyles.reqUnmet]}>{/[a-z]/.test(password) ? '✓' : '✕'}</Text>
                    <Text style={localStyles.reqText}>Lowercase letter</Text>
                  </View>
                  <View style={localStyles.reqItem}>
                    <Text style={[localStyles.reqIcon, /[0-9]/.test(password) ? localStyles.reqMet : localStyles.reqUnmet]}>{/[0-9]/.test(password) ? '✓' : '✕'}</Text>
                    <Text style={localStyles.reqText}>Number</Text>
                  </View>
                  <View style={localStyles.reqItem}>
                    <Text style={[localStyles.reqIcon, /[^A-Za-z0-9]/.test(password) ? localStyles.reqMet : localStyles.reqUnmet]}>{/[^A-Za-z0-9]/.test(password) ? '✓' : '✕'}</Text>
                    <Text style={localStyles.reqText}>Special character</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={localStyles.inputGroup}>
              <Text style={styles.label}>{t('signup.confirmPassword', { defaultValue: 'Confirm Password' })}</Text>
              <View style={[styles.field, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0 }]}>
                <TextInput 
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
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
              {!loading && <Text style={styles.primaryText}>-&gt;</Text>}
            </Pressable>
          </View>
        )}
      </ScrollView>
      <TermsModal 
        visible={termsModalVisible} 
        onClose={() => setTermsModalVisible(false)} 
      />
      <PrivacyPolicyModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({

  warningBox: { backgroundColor: '#FEFCBF', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#F6E05E' },
  warningText: { color: '#744210', fontSize: 13, lineHeight: 18, fontWeight: '500' },
  

  requirementsBox: { backgroundColor: '#F8F9FB', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  reqHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  reqTitle: { fontSize: 14, fontWeight: '700', color: '#102A54', marginLeft: 8 },
  reqList: { gap: 8 },
  reqItem: { flexDirection: 'row', alignItems: 'center' },
  reqIcon: { fontSize: 14, fontWeight: '900', marginRight: 8, width: 16, textAlign: 'center' },
  reqMet: { color: '#48BB78' },
  reqUnmet: { color: '#E53E3E' },
  reqText: { fontSize: 13, color: '#4A5568' },

  content: { paddingBottom: 40 },
  inputGroup: { marginBottom: 16 },
  errorText: { color: '#E53E3E', fontSize: 14, marginTop: -8, marginBottom: 16, fontWeight: '500' },
  mt24: { marginTop: 24 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
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
  termsWrapper: { marginTop: 12, marginBottom: 8 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#CBD5E0', marginRight: 10, marginTop: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  checkboxChecked: { backgroundColor: '#3C3985', borderColor: '#3C3985' },
  checkboxError: { borderColor: '#E53E3E' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  consentText: { color: '#718096', fontSize: 12, flex: 1, lineHeight: 18 },
  learnMoreText: { color: '#2B6CB0', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
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
  termsWarningText: { color: '#E53E3E', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerText: { color: '#718096', fontSize: 14 },
  link: { color: '#3C3985', fontSize: 14, fontWeight: '700' }
});
