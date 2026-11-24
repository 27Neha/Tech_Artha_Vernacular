import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { ResetOtpInput } from '../components/ResetOtpInput';
import { PasswordRequirementsBox } from '../components/PasswordRequirementsBox';
import { styles } from '../theme/styles';
import { api, ApiError } from '../services/api/client';
import {
  isValidEmailFormat,
  maskEmailAddress,
  normalizeEmailInput,
  validatePasswordMatchAndStrength,
} from '../utils/passwordValidation';
import { getScrollBottomPadding } from '../utils/tabBarMetrics';

type ForgotStep = 'email' | 'otp' | 'password' | 'success';

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const ForgotPasswordScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const initialEmail =
    typeof route?.params?.initialEmail === 'string' ? route.params.initialEmail : '';

  const [step, setStep] = useState<ForgotStep>('email');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  // Held strictly in React memory (never AsyncStorage or navigation params)
  const [resetAuthorization, setResetAuthorization] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoNotice, setInfoNotice] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiryRemaining, setExpiryRemaining] = useState(0);

  useEffect(() => {
    if (step !== 'otp') return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      setExpiryRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const handleBackAction = () => {
    setError('');
    if (step === 'otp') {
      setOtp('');
      setStep('email');
      return;
    }
    if (step === 'password') {
      setResetAuthorization('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setStep('email');
      return;
    }
    if (step === 'success') {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }
    navigation.goBack();
  };

  const requestOtp = async (isResend = false) => {
    if (loading) return;
    setError('');
    setInfoNotice('');

    const normalized = normalizeEmailInput(email);
    if (!isValidEmailFormat(normalized)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{
        status?: string;
        message?: string;
        expiresInSeconds?: number;
        cooldownSeconds?: number;
      }>('/auth/forgot-password', { email: normalized }, { anonymous: true });

      setEmail(normalized);
      setOtp('');
      setResetAuthorization('');
      setExpiryRemaining(response?.expiresInSeconds ?? 300);
      setResendCooldown(response?.cooldownSeconds ?? 45);
      setInfoNotice(
        isResend
          ? 'A new verification code has been requested.'
          : response?.message ||
              "If an account exists for this email address, we've sent a verification code.",
      );
      setStep('otp');
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError(err.message || 'Please wait before requesting another code.');
        } else if (err.status === 503) {
          setError('Email delivery is currently unavailable. Please try again later.');
        } else {
          setError(err.message || 'Unable to send verification code. Please try again.');
        }
      } else {
        setError('Could not connect. Please check your internet connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (loading) return;
    setError('');

    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (expiryRemaining <= 0) {
      setError('Your code has expired. Request a new one.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{
        status?: string;
        resetAuthorization?: string;
      }>(
        '/auth/verify-password-reset-otp',
        { email: normalizeEmailInput(email), otp: cleanOtp },
        { anonymous: true },
      );

      if (!response?.resetAuthorization) {
        setError('Verification could not be completed. Please try again.');
        return;
      }

      setResetAuthorization(response.resetAuthorization);
      setNewPassword('');
      setConfirmPassword('');
      setInfoNotice('');
      setStep('password');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Incorrect code. Please try again.');
      } else {
        setError('Could not verify your code. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (loading) return;
    setError('');

    const validationError = validatePasswordMatchAndStrength(newPassword, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!resetAuthorization) {
      setError('Your reset session has expired. Please start again.');
      return;
    }

    setLoading(true);
    try {
      await api.post<{ status?: string; message?: string }>(
        '/auth/reset-password',
        { resetAuthorization, newPassword },
        { anonymous: true },
      );

      setResetAuthorization('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setStep('success');
    } catch (err: any) {
      if (err instanceof ApiError) {
        const msg = err.message || "Couldn't update your password. Please try again.";
        if (msg.toLowerCase().includes('session has expired')) {
          setResetAuthorization('');
        }
        setError(msg);
      } else {
        setError("Couldn't update your password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const maskedEmail = maskEmailAddress(email);

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <Header onBack={handleBackAction} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.page}
          contentContainerStyle={[
            localStyles.scrollContent,
            { paddingBottom: getScrollBottomPadding(insets.bottom, 32) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'email' && (
            <View>
              <View style={localStyles.iconBadge}>
                <Ionicons name="lock-open-outline" size={26} color="#3C3985" />
              </View>

              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.description}>
                Enter your registered email address. We'll send you a verification code.
              </Text>

              <Text style={styles.label}>Email Address</Text>
              <TextInput
                testID="forgot-email-input"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="done"
                onSubmitEditing={() => requestOtp(false)}
                placeholder="Enter your email"
                placeholderTextColor="#A0AEC0"
                style={styles.field}
                editable={!loading}
              />

              {error ? (
                <View style={localStyles.errorBanner} accessibilityRole="alert">
                  <Ionicons name="alert-circle-outline" size={18} color="#C53030" />
                  <Text style={localStyles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                testID="forgot-send-otp-button"
                style={[styles.primaryButton, loading && styles.primaryDisabled]}
                onPress={() => requestOtp(false)}
                disabled={loading}
              >
                {loading ? (
                  <View style={localStyles.loadingRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={[styles.primaryText, { marginLeft: 10 }]}>Sending OTP...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.primaryText}>Send OTP</Text>
                    <Text style={styles.primaryText}>→</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                testID="forgot-back-to-login"
                style={localStyles.textAction}
                onPress={() => navigation.navigate('Login')}
                disabled={loading}
              >
                <Text style={localStyles.textActionLabel}>Back to Login</Text>
              </Pressable>
            </View>
          )}

          {step === 'otp' && (
            <View>
              <View style={localStyles.iconBadge}>
                <Ionicons name="mail-open-outline" size={26} color="#3C3985" />
              </View>

              <Text style={styles.title}>Verify Your Email</Text>
              <Text style={styles.description}>
                We've sent a verification code to your registered email.
              </Text>

              {maskedEmail ? (
                <View style={localStyles.emailSummaryRow}>
                  <Text style={localStyles.emailSummaryText}>{maskedEmail}</Text>
                  <Pressable onPress={handleBackAction} hitSlop={8}>
                    <Text style={localStyles.changeLink}>Change</Text>
                  </Pressable>
                </View>
              ) : null}

              {infoNotice && !error ? (
                <View style={localStyles.infoCard}>
                  <Text style={localStyles.infoCardText}>{infoNotice}</Text>
                </View>
              ) : null}

              <Text style={[styles.label, { marginTop: 20 }]}>6-Digit Verification Code</Text>
              <ResetOtpInput
                value={otp}
                onChange={(next) => {
                  setOtp(next);
                  if (error) setError('');
                }}
                editable={!loading}
                hasError={!!error}
              />

              <Text style={localStyles.expiryHint}>
                {expiryRemaining > 0
                  ? `Code expires in ${formatCountdown(expiryRemaining)}`
                  : 'Code expired. Request a new code below.'}
              </Text>

              {error ? (
                <View style={localStyles.errorBanner} accessibilityRole="alert">
                  <Ionicons name="alert-circle-outline" size={18} color="#C53030" />
                  <Text style={localStyles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                testID="forgot-verify-otp-button"
                style={[
                  styles.primaryButton,
                  (loading || otp.trim().length < 6) && styles.primaryDisabled,
                ]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <View style={localStyles.loadingRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={[styles.primaryText, { marginLeft: 10 }]}>Verifying...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.primaryText}>Verify OTP</Text>
                    <Text style={styles.primaryText}>→</Text>
                  </>
                )}
              </Pressable>

              <View style={localStyles.resendRow}>
                <Text style={localStyles.resendLabel}>Didn't receive the code? </Text>
                <Pressable
                  testID="forgot-resend-otp-button"
                  onPress={() => requestOtp(true)}
                  disabled={loading || resendCooldown > 0}
                  hitSlop={8}
                >
                  <Text
                    style={[
                      localStyles.resendAction,
                      (loading || resendCooldown > 0) && localStyles.resendDisabled,
                    ]}
                  >
                    {resendCooldown > 0
                      ? `Resend OTP in ${formatCountdown(resendCooldown)}`
                      : 'Resend OTP'}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                testID="forgot-otp-back-button"
                style={localStyles.textAction}
                onPress={handleBackAction}
                disabled={loading}
              >
                <Text style={localStyles.textActionLabel}>Back</Text>
              </Pressable>
            </View>
          )}

          {step === 'password' && (
            <View>
              <View style={localStyles.iconBadge}>
                <Ionicons name="shield-checkmark-outline" size={26} color="#3C3985" />
              </View>

              <Text style={styles.title}>Create New Password</Text>
              <Text style={styles.description}>Choose a new password for your account.</Text>

              <Text style={styles.label}>New Password</Text>
              <View style={localStyles.passwordField}>
                <TextInput
                  testID="forgot-new-password-input"
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (error) setError('');
                  }}
                  textContentType="newPassword"
                  autoComplete="password-new"
                  placeholder="Enter new password"
                  placeholderTextColor="#A0AEC0"
                  style={localStyles.passwordInput}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={localStyles.eyeBtn}
                >
                  <Text style={localStyles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>

              <PasswordRequirementsBox password={newPassword} />

              <Text style={[styles.label, { marginTop: 8 }]}>Confirm New Password</Text>
              <View style={localStyles.passwordField}>
                <TextInput
                  testID="forgot-confirm-password-input"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (error) setError('');
                  }}
                  textContentType="newPassword"
                  autoComplete="password-new"
                  placeholder="Confirm new password"
                  placeholderTextColor="#A0AEC0"
                  style={localStyles.passwordInput}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  style={localStyles.eyeBtn}
                >
                  <Text style={localStyles.eyeText}>
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>

              {error ? (
                <View style={localStyles.errorBanner} accessibilityRole="alert">
                  <Ionicons name="alert-circle-outline" size={18} color="#C53030" />
                  <Text style={localStyles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                testID="forgot-update-password-button"
                style={[styles.primaryButton, loading && styles.primaryDisabled]}
                onPress={handleUpdatePassword}
                disabled={loading}
              >
                {loading ? (
                  <View style={localStyles.loadingRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={[styles.primaryText, { marginLeft: 10 }]}>
                      Updating Password...
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.primaryText}>Update Password</Text>
                    <Text style={styles.primaryText}>→</Text>
                  </>
                )}
              </Pressable>

              {!resetAuthorization ? (
                <Pressable style={localStyles.textAction} onPress={handleBackAction}>
                  <Text style={localStyles.textActionLabel}>Start Over</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {step === 'success' && (
            <View style={localStyles.successSection}>
              <View style={[localStyles.iconBadge, localStyles.iconBadgeSuccess]}>
                <Ionicons name="checkmark-circle-outline" size={32} color="#2F855A" />
              </View>

              <Text style={styles.title}>Password Updated!</Text>
              <Text style={styles.description}>
                Your password has been changed successfully.
              </Text>

              <Pressable
                testID="forgot-success-login-button"
                style={styles.primaryButton}
                onPress={() =>
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  })
                }
              >
                <Text style={styles.primaryText}>Go to Login</Text>
                <Text style={styles.primaryText}>→</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const localStyles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#EBEAF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  iconBadgeSuccess: {
    backgroundColor: '#F0FFF4',
  },
  emailSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emailSummaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#102A54',
    flex: 1,
  },
  changeLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#3C3985',
    marginLeft: 12,
  },
  infoCard: {
    marginTop: 12,
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#D4E2FF',
    borderRadius: 12,
    padding: 12,
  },
  infoCardText: {
    fontSize: 13,
    color: '#1E3A8A',
    lineHeight: 18,
    fontWeight: '600',
  },
  expiryHint: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  resendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  resendLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  resendAction: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3C3985',
  },
  resendDisabled: {
    color: '#94A3B8',
  },
  passwordField: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#102A54',
  },
  eyeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  eyeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3C3985',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#C53030',
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 19,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textAction: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 10,
  },
  textActionLabel: {
    color: '#3C3985',
    fontSize: 14,
    fontWeight: '700',
  },
  successSection: {
    paddingTop: 8,
  },
});

export default ForgotPasswordScreen;
