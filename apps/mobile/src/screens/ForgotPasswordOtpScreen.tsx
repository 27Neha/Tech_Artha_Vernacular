import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { api, sanitizeNetworkError } from '../services/api/client';
import { useTheme } from '../context/ThemeContext';

export const ForgotPasswordOtpScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const email = (route.params?.email as string) || '';
  const mobile = (route.params?.mobile as string) || '';
  const identifierType: 'MOBILE' | 'EMAIL' =
    route.params?.identifierType || (mobile && !email ? 'MOBILE' : 'EMAIL');

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(30);
  const timerRef = useRef<any>(null);

  const maskContact = () => {
    if (identifierType === 'MOBILE' && mobile) {
      return `+91 ******${mobile.slice(-4)}`;
    }
    if (!email || !email.includes('@')) return email;
    const [name, domain] = email.split('@');
    if (name.length <= 2) {
      return `${name[0]}*@${domain}`;
    }
    return `${name[0]}${'*'.repeat(Math.max(name.length - 2, 3))}${name[name.length - 1]}@${domain}`;
  };

  useEffect(() => {
    if (resendCooldown > 0) {
      timerRef.current = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resendCooldown]);

  const handleVerifyOtp = async () => {
    const cleanOtp = otp.trim();
    setError('');

    if (!cleanOtp) {
      setError('Please enter the verification code.');
      return;
    }

    if (!/^\d{4,6}$/.test(cleanOtp)) {
      setError('Verification code must be 4 to 6 digits.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{
        verified: boolean;
        resetToken: string;
        message: string;
      }>(
        '/auth/reset-password/verify-otp',
        identifierType === 'MOBILE'
          ? { mobile, otp: cleanOtp }
          : { email, otp: cleanOtp },
      );

      if (response.verified && response.resetToken) {
        navigation.navigate('ResetPassword', {
          resetToken: response.resetToken,
          email: email || mobile,
        });
      } else {
        throw new Error('Verification failed. Please try again.');
      }
    } catch (e: any) {
      setError(sanitizeNetworkError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setError('');
    setResending(true);
    try {
      await api.post<{ devOtp?: string }>(
        '/auth/forgot-password',
        identifierType === 'MOBILE' ? { mobile } : { email },
      );
      setResendCooldown(30);
      setOtp('');
    } catch (e: any) {
      setError(sanitizeNetworkError(e));
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <StatusBar style={colors.statusBar} />
      <Header
        title=""
        onBack={() => navigation.goBack()}
        showSettings={false}
        showNotifications={false}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingBottom: Math.max(insets.bottom + 24, 40) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Icon */}
          <View
            style={[
              styles.iconCircle,
              isDark && { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name={identifierType === 'MOBILE' ? 'chatbox-ellipses-outline' : 'mail-open-outline'}
              size={28}
              color={colors.primary}
            />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {identifierType === 'MOBILE' ? 'Verify Mobile' : 'Verify Email'}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {identifierType === 'MOBILE'
              ? 'We have sent a verification code via SMS to your mobile number:'
              : 'We have sent a verification code to your email address:'}
          </Text>

          {/* Masked Contact Badge & Edit option */}
          <View
            style={[
              styles.emailBadge,
              isDark && { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name={identifierType === 'MOBILE' ? 'call' : 'mail'}
              size={16}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.maskedEmailText, { color: colors.textPrimary }]}>
              {maskContact()}
            </Text>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={8}
              style={styles.editEmailBtn}
              accessibilityLabel="Edit contact details"
            >
              <Ionicons name="pencil" size={13} color={colors.primary} style={{ marginRight: 3 }} />
              <Text style={[styles.editEmailText, { color: colors.primary }]}>Edit</Text>
            </Pressable>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#C53030" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* OTP Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Enter Verification Code
            </Text>
            <View
              style={[
                styles.otpBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
                !!error && styles.otpBoxError,
              ]}
            >
              <TextInput
                value={otp}
                onChangeText={(val) => {
                  const cleaned = val.replace(/\D/g, '').slice(0, 6);
                  setOtp(cleaned);
                  if (error) setError('');
                }}
                placeholder="• • • • • •"
                placeholderTextColor="#A0AEC0"
                keyboardType="number-pad"
                maxLength={6}
                style={[styles.otpInput, { color: colors.textPrimary }]}
                autoFocus={true}
                editable={!loading}
                onSubmitEditing={handleVerifyOtp}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Verify Button */}
          <Pressable
            style={[
              styles.primaryButton,
              (loading || otp.trim().length < 4) && styles.buttonDisabled,
            ]}
            onPress={handleVerifyOtp}
            disabled={loading || otp.trim().length < 4}
            accessibilityRole="button"
            accessibilityLabel="Verify OTP"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Verify & Proceed</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </Pressable>

          {/* Resend Countdown / Action */}
          <View style={styles.resendSection}>
            <Text style={[styles.resendPrompt, { color: colors.textSecondary }]}>
              Didn't receive the code?{' '}
            </Text>
            {resendCooldown > 0 ? (
              <Text style={[styles.cooldownText, { color: colors.textMuted }]}>
                Resend in{' '}
                <Text style={{ fontWeight: '800' }}>
                  0:{resendCooldown < 10 ? `0${resendCooldown}` : resendCooldown}
                </Text>
              </Text>
            ) : (
              <Pressable
                onPress={handleResendOtp}
                disabled={resending}
                hitSlop={8}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                {resending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.resendActiveText, { color: colors.primary }]}>Resend Code</Text>
                )}
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#EBEBFA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DEDBF7',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
    marginBottom: 14,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EEF0FB',
    borderWidth: 1,
    borderColor: '#D4D8F6',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 22,
    flexWrap: 'wrap',
  },
  maskedEmailText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#102A54',
    marginRight: 10,
  },
  editEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#CBD5E1',
  },
  editEmailText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3C3985',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDECEC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F8B4B4',
  },
  errorText: {
    color: '#C53030',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 8,
  },
  otpBox: {
    minHeight: 58,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  otpBoxError: {
    borderColor: '#DC2626',
    backgroundColor: '#FFF5F5',
  },
  otpInput: {
    fontSize: 22,
    fontWeight: '800',
    color: '#102A54',
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: 10,
  },
  primaryButton: {
    backgroundColor: '#3C3985',
    minHeight: 54,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#3C3985',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  resendSection: {
    marginTop: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendPrompt: {
    fontSize: 14,
    color: '#64748B',
  },
  cooldownText: {
    fontSize: 14,
    color: '#64748B',
  },
  resendActiveText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3C3985',
    textDecorationLine: 'underline',
  },
});
