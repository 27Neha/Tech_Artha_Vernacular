import React, { useState } from 'react';
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

export const ResetPasswordScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const resetToken = (route.params?.resetToken as string) || '';
  const email = (route.params?.email as string) || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password criteria
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isFormValid =
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecialChar &&
    passwordsMatch;

  const handleUpdatePassword = async () => {
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Both password fields are required.');
      return;
    }

    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!hasUppercase) {
      setError('Password must contain at least one uppercase letter (A-Z).');
      return;
    }

    if (!hasLowercase) {
      setError('Password must contain at least one lowercase letter (a-z).');
      return;
    }

    if (!hasNumber) {
      setError('Password must contain at least one number (0-9).');
      return;
    }

    if (!hasSpecialChar) {
      setError('Password must contain at least one special character (such as @, #, $, %, &, !).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify and re-enter.');
      return;
    }

    if (!resetToken) {
      setError('Password reset session has expired. Please restart the forgot password process.');
      return;
    }

    setLoading(true);
    try {
      await api.post<{ success: boolean; message: string }>('/auth/reset-password', {
        resetToken,
        newPassword,
      });

      navigation.reset({
        index: 0,
        routes: [{ name: 'PasswordResetSuccess' }],
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
          {/* Header Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed-outline" size={28} color="#3C3985" />
          </View>

          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.description}>
            Choose a strong password to protect your TechArtha portfolio and investment account.
          </Text>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#C53030" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* New Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={20} color="#718096" style={styles.fieldIcon} />
              <TextInput
                value={newPassword}
                onChangeText={(val) => {
                  setNewPassword(val);
                  if (error) setError('');
                }}
                secureTextEntry={!showNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#A0AEC0"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <Pressable
                onPress={() => setShowNewPassword(!showNewPassword)}
                hitSlop={8}
                style={styles.eyeBtn}
                accessibilityLabel={showNewPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#718096"
                />
              </Pressable>
            </View>
          </View>

          {/* Password Requirements Guidance Box - Displayed directly below New Password field */}
          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Password Requirements</Text>

            <View style={styles.criteriaRow}>
              <Ionicons
                name={hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={hasMinLength ? '#16A34A' : '#A0AEC0'}
              />
              <Text style={[styles.criteriaText, hasMinLength && styles.criteriaMet]}>
                At least 8 characters
              </Text>
            </View>

            <View style={styles.criteriaRow}>
              <Ionicons
                name={hasUppercase ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={hasUppercase ? '#16A34A' : '#A0AEC0'}
              />
              <Text style={[styles.criteriaText, hasUppercase && styles.criteriaMet]}>
                At least one uppercase letter (A-Z)
              </Text>
            </View>

            <View style={styles.criteriaRow}>
              <Ionicons
                name={hasLowercase ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={hasLowercase ? '#16A34A' : '#A0AEC0'}
              />
              <Text style={[styles.criteriaText, hasLowercase && styles.criteriaMet]}>
                At least one lowercase letter (a-z)
              </Text>
            </View>

            <View style={styles.criteriaRow}>
              <Ionicons
                name={hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={hasNumber ? '#16A34A' : '#A0AEC0'}
              />
              <Text style={[styles.criteriaText, hasNumber && styles.criteriaMet]}>
                At least one number (0-9)
              </Text>
            </View>

            <View style={styles.criteriaRow}>
              <Ionicons
                name={hasSpecialChar ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={hasSpecialChar ? '#16A34A' : '#A0AEC0'}
              />
              <Text style={[styles.criteriaText, hasSpecialChar && styles.criteriaMet]}>
                At least one special character (@, #, $, %, &, !, etc.)
              </Text>
            </View>
          </View>

          {/* Confirm New Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={[styles.inputBox, confirmPassword.length > 0 && !passwordsMatch && styles.inputBoxMismatch]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#718096" style={styles.fieldIcon} />
              <TextInput
                value={confirmPassword}
                onChangeText={(val) => {
                  setConfirmPassword(val);
                  if (error) setError('');
                }}
                secureTextEntry={!showConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor="#A0AEC0"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <Pressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={8}
                style={styles.eyeBtn}
                accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#718096"
                />
              </Pressable>
            </View>

            {confirmPassword.length > 0 && (
              <View style={[styles.criteriaRow, { marginTop: 8, paddingLeft: 4 }]}>
                <Ionicons
                  name={passwordsMatch ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={passwordsMatch ? '#16A34A' : '#E53E3E'}
                />
                <Text style={[styles.criteriaText, passwordsMatch ? styles.criteriaMet : { color: '#E53E3E' }]}>
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            )}
          </View>

          {/* Update Password Button */}
          <Pressable
            style={[
              styles.primaryButton,
              (loading || !isFormValid) && styles.buttonDisabled,
            ]}
            onPress={handleUpdatePassword}
            disabled={loading || !isFormValid}
            accessibilityRole="button"
            accessibilityLabel="Update Password"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Update Password</Text>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </>
            )}
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
    marginBottom: 20,
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
    marginBottom: 16,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  inputBoxMismatch: {
    borderColor: '#F87171',
    backgroundColor: '#FFF5F5',
  },
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#102A54',
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  requirementsBox: {
    backgroundColor: '#F8F9FD',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
    marginBottom: 20,
    gap: 8,
  },
  requirementsTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#4A5568',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  criteriaText: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '500',
  },
  criteriaMet: {
    color: '#166534',
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#3C3985',
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    elevation: 2,
    shadowColor: '#3C3985',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
