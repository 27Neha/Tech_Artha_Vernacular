import React, { useState, useEffect } from 'react';
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
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { api, sanitizeNetworkError } from '../services/api/client';
import { useTheme } from '../context/ThemeContext';

export const ForgotPasswordScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const paramEmail = (route.params?.initialEmail as string) || '';

  const [email, setEmail] = useState(paramEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (route.params?.initialEmail !== undefined) {
      setEmail(route.params.initialEmail);
    }
  }, [route.params?.initialEmail]);

  const validateEmail = (val: string) => {
    const clean = val.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean);
  };

  const isInputValid = validateEmail(email);

  const handleSendOtp = async () => {
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!validateEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{
        status: string;
        message: string;
        expiresInSeconds?: number;
      }>('/auth/forgot-password', { email: cleanEmail });

      navigation.navigate('ForgotPasswordOtp', {
        identifierType: 'EMAIL',
        email: cleanEmail,
        mobile: '',
        expiresInSeconds: response.expiresInSeconds || 300,
      });
    } catch (e: any) {
      setError(sanitizeNetworkError(e));
    } finally {
      setLoading(false);
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
          {/* Header Card */}
          <View style={styles.brandRow}>
            <View
              style={[
                styles.iconCircle,
                isDark && { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              ]}
            >
              <Ionicons name="key-outline" size={28} color={colors.primary} />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('login.forgotPasswordTitle', { defaultValue: 'Forgot Password?' })}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Confirm your registered email address. We'll send you an OTP to verify your identity.
          </Text>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#C53030" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Contact Input Field (Email) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Registered Email Address
            </Text>

            <View
              style={[
                styles.inputBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
                !!error && styles.inputBoxError,
              ]}
            >
              <Ionicons name="mail-outline" size={20} color="#718096" style={styles.fieldIcon} />
              <TextInput
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (error) setError('');
                }}
                placeholder="name@example.com"
                placeholderTextColor="#A0AEC0"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: colors.textPrimary }]}
                editable={!loading}
                onSubmitEditing={handleSendOtp}
                returnKeyType="done"
              />
              {validateEmail(email) && (
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
              )}
            </View>
          </View>

          {/* Primary Action Button */}
          <Pressable
            style={[
              styles.primaryButton,
              (loading || !isInputValid) && styles.buttonDisabled,
            ]}
            onPress={handleSendOtp}
            disabled={loading || !isInputValid}
            accessibilityRole="button"
            accessibilityLabel="Send OTP"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Send OTP</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </Pressable>

          {/* Security Notice Card */}
          <View
            style={[
              styles.securityBox,
              isDark && { backgroundColor: '#0F291E', borderColor: '#166534' },
            ]}
          >
            <View style={styles.securityHeader}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#059669" />
              <Text style={[styles.securityTitle, isDark && { color: '#4ADE80' }]}>
                Bank-Grade Privacy & Security
              </Text>
            </View>
            <Text style={[styles.securityBody, isDark && { color: '#86EFAC' }]}>
              For your account safety, password reset codes are single-use and expire within 5 minutes. TechArtha will never ask for your code over a call or text.
            </Text>
          </View>

          {/* Back to Login Link */}
          <Pressable
            style={styles.backToLoginBtn}
            onPress={() => navigation.navigate('Login')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back to Login"
          >
            <Ionicons name="arrow-back" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.backToLoginText, { color: colors.primary }]}>Back to Login</Text>
          </Pressable>
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
  brandRow: {
    marginBottom: 20,
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
    marginBottom: 24,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2D3748',
  },
  switchModeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3C3985',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  inputBoxError: {
    borderColor: '#DC2626',
    backgroundColor: '#FFF5F5',
  },
  fieldIcon: {
    marginRight: 10,
  },
  countryPrefix: {
    fontSize: 15,
    fontWeight: '700',
    color: '#102A54',
    paddingRight: 12,
    marginRight: 10,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#102A54',
    paddingVertical: 12,
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
  securityBox: {
    marginTop: 28,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  securityTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#166534',
  },
  securityBody: {
    fontSize: 12,
    color: '#15803D',
    lineHeight: 17,
  },
  backToLoginBtn: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  backToLoginText: {
    color: '#3C3985',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
