import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api/client';
import { useAppLock } from '../components/AppLockGate';
import { useTheme } from '../context/ThemeContext';

export const SecuritySettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { setPinActive: updateAppLockPin, lockAppNow } = useAppLock();
  const { colors, isDark } = useTheme();

  // App Lock (PIN) States
  const [pinEnabled, setPinEnabled] = useState<boolean>(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
  const [tempPin, setTempPin] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Password Change States
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const loadPinStatus = useCallback(async () => {
    try {
      const hasPin = await AsyncStorage.getItem('techartha_pin_enabled');
      setPinEnabled(hasPin === 'true');
    } catch (e) {
      console.warn('Error loading PIN status:', e);
    }
  }, []);

  useEffect(() => {
    loadPinStatus();
  }, [loadPinStatus]);

  // App Lock Toggle Handler
  const handleTogglePin = async () => {
    if (pinEnabled) {
      Alert.alert(
        'Disable App Lock',
        'Are you sure you want to disable the 4-digit PIN App Lock for TechArtha?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await AsyncStorage.removeItem('techartha_pin_enabled');
              await SecureStore.deleteItemAsync('techartha_user_pin').catch(() => {});
              setPinEnabled(false);
              updateAppLockPin(false);
              Alert.alert('App Lock Disabled', '4-digit security PIN lock has been turned off.');
            }
          }
        ]
      );
    } else {
      setIsChangingPin(false);
      setPinStep('create');
      setPinInput('');
      setTempPin('');
      setPinError('');
      setPinModalVisible(true);
    }
  };

  // Start PIN change process
  const handleStartChangePin = () => {
    setIsChangingPin(true);
    setPinStep('create');
    setPinInput('');
    setTempPin('');
    setPinError('');
    setPinModalVisible(true);
  };

  // PIN Submission Handler
  const handlePinSubmit = async () => {
    setPinError('');
    if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
      setPinError('PIN must be exactly 4 numeric digits.');
      return;
    }

    if (pinStep === 'create') {
      setTempPin(pinInput);
      setPinInput('');
      setPinStep('confirm');
    } else {
      if (pinInput !== tempPin) {
        setPinError('PINs do not match. Please re-enter your 4-digit PIN.');
        setPinInput('');
        return;
      }

      try {
        await SecureStore.setItemAsync('techartha_user_pin', pinInput);
        await AsyncStorage.setItem('techartha_pin_enabled', 'true');
        setPinEnabled(true);
        updateAppLockPin(true);
        setPinModalVisible(false);
        if (isChangingPin) {
          Alert.alert('PIN Updated', 'Your 4-digit security PIN has been updated successfully.');
        } else {
          Alert.alert('App Lock Enabled', 'Your 4-digit security PIN is now active and will be required when opening the app.');
        }
      } catch {
        Alert.alert('Error', 'Unable to save PIN securely on this device.');
      }
    }
  };

  // Password Submission Handler
  const handlePasswordSubmit = async () => {
    setPasswordError('');
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please check and re-enter.');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: currentPassword ? currentPassword.trim() : undefined,
        newPassword: newPassword.trim()
      });
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password Updated', 'Your account password has been successfully updated.');
    } catch (e: any) {
      setPasswordError(e?.message || 'Could not update password. Please check your credentials.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title="Account & Security" onBack={() => navigation.goBack()} showSettings={false} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Account Security</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Manage your account authentication password, 4-digit device PIN, and App Lock settings.
          </Text>
        </View>

        {/* Security Hardware Shield Banner */}
        <View style={[styles.infoBanner, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF', borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark" size={22} color={colors.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBannerTitle, { color: colors.primary }]}>Hardware Keystore Protection</Text>
            <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
              Security keys and PIN tokens are encrypted inside the device's secure hardware enclave (iOS Keychain / Android Keystore) in compliance with SEBI cybersecurity circulars.
            </Text>
          </View>
        </View>

        {/* 1. PASSWORD & AUTHENTICATION SECTION */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Account Authentication</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={styles.cardActionRow}
            onPress={() => {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setPasswordError('');
              setPasswordModalVisible(true);
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
              <Ionicons name="key-outline" size={20} color={isDark ? '#A78BFA' : '#5B21B6'} />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Change Account Password</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Update login password for web and mobile access.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </Pressable>
        </View>

        {/* 2. APP LOCK & 4-DIGIT PIN */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Device App Lock</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.switchRow}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#052E16' : '#DCFCE7' }]}>
              <Ionicons name="lock-closed-outline" size={20} color={isDark ? '#4ADE80' : '#15803D'} />
            </View>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>App Lock (4-Digit PIN)</Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                {pinEnabled
                  ? 'PIN lock is active. Required when switching or opening TechArtha.'
                  : 'Require 4-digit PIN whenever opening TechArtha.'}
              </Text>
            </View>
            <Switch
              value={pinEnabled}
              onValueChange={handleTogglePin}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          {pinEnabled && (
            <View style={{ gap: 10, marginTop: 14 }}>
              <Pressable
                style={[styles.actionBtnRow, { backgroundColor: isDark ? colors.surfaceMuted : '#F0F0FC' }]}
                onPress={handleStartChangePin}
              >
                <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                <Text style={[styles.actionBtnRowText, { color: colors.primary }]}>Change 4-Digit Security PIN</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />
              </Pressable>

              <Pressable
                style={[styles.actionBtnRow, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', borderWidth: 1, borderColor: colors.primary }]}
                onPress={() => lockAppNow()}
              >
                <Ionicons name="lock-closed" size={18} color={colors.primary} />
                <Text style={[styles.actionBtnRowText, { color: colors.primary }]}>Lock App Now (Test Lock Screen)</Text>
                <Ionicons name="shield-checkmark" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />
              </Pressable>
            </View>
          )}
        </View>

        {/* 3. ACTIVE DEVICE & SESSION */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Active Device & Session</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.deviceSessionCard}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? colors.surfaceMuted : '#F1F5F9' }]}>
              <Ionicons name="phone-portrait-outline" size={20} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.sessionTitle, { color: colors.textPrimary }]}>This Device</Text>
              <Text style={[styles.sessionSub, { color: colors.textSecondary }]}>
                {Platform.OS === 'ios' ? 'Apple iOS' : 'Google Android'} • Tech Artha 2.0
              </Text>
            </View>
            <View style={[styles.activeTag, { backgroundColor: isDark ? '#052E16' : '#DCFCE7' }]}>
              <Text style={[styles.activeTagText, { color: isDark ? '#4ADE80' : '#15803D' }]}>CURRENT SESSION</Text>
            </View>
          </View>
        </View>

        {/* 4. PRIVACY CARD */}
        <View style={[styles.privacyCard, { backgroundColor: isDark ? '#064E3B' : '#F0FDF4', borderColor: isDark ? '#047857' : '#DCFCE7' }]}>
          <View style={styles.privacyTopRow}>
            <Ionicons name="lock-closed" size={18} color={isDark ? '#34D399' : '#059669'} />
            <Text style={[styles.privacyHeading, { color: isDark ? '#A7F3D0' : '#065F46' }]}>Zero Plaintext Storage</Text>
          </View>
          <Text style={[styles.privacyBody, { color: isDark ? '#D1FAE5' : '#047857' }]}>
            TechArtha never logs or transmits your PIN to any server. Authentication happens strictly on-device in compliance with SEBI cybersecurity circulars.
          </Text>
        </View>
      </ScrollView>

      {/* CHANGE PASSWORD MODAL */}
      <Modal visible={passwordModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Change Account Password</Text>
              <Pressable onPress={() => setPasswordModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Enter your current password and choose a secure new password (min. 8 characters).
            </Text>

            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Current Password</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? colors.surfaceMuted : '#F8FAFC', color: colors.textPrimary, borderColor: colors.border }]}
              secureTextEntry={!showPassword}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Leave blank if registering for first time"
              placeholderTextColor={colors.textPlaceholder}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>New Password (min 8 characters)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? colors.surfaceMuted : '#F8FAFC', color: colors.textPrimary, borderColor: colors.border }]}
              secureTextEntry={!showPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor={colors.textPlaceholder}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Confirm New Password</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? colors.surfaceMuted : '#F8FAFC', color: colors.textPrimary, borderColor: colors.border }]}
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textPlaceholder}
            />

            <Pressable
              style={styles.showPassToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
              <Text style={[styles.showPassText, { color: colors.textMuted }]}>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</Text>
            </Pressable>

            <Pressable
              style={[styles.modalPrimaryBtn, { backgroundColor: colors.primary }, passwordLoading && styles.btnDisabled]}
              onPress={handlePasswordSubmit}
              disabled={passwordLoading}
            >
              {passwordLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Update Password</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* PIN SETUP / CHANGE MODAL */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {pinStep === 'create'
                  ? (isChangingPin ? 'Enter New 4-Digit PIN' : 'Set 4-Digit Security PIN')
                  : 'Confirm Your New PIN'}
              </Text>
              <Pressable onPress={() => setPinModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              {pinStep === 'create'
                ? 'Enter a 4-digit numeric code to protect your investments on this device.'
                : 'Re-enter your 4-digit code to confirm and activate app lock.'}
            </Text>

            {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}

            <TextInput
              style={[
                styles.pinInput,
                { backgroundColor: isDark ? colors.surfaceMuted : '#fff', color: colors.textPrimary, borderColor: colors.border }
              ]}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={pinInput}
              onChangeText={setPinInput}
              placeholder="••••"
              placeholderTextColor={colors.textPlaceholder}
              autoFocus
            />

            <Pressable
              style={[styles.modalPrimaryBtn, { backgroundColor: colors.primary }]}
              onPress={handlePinSubmit}
            >
              <Text style={styles.modalPrimaryBtnText}>
                {pinStep === 'create' ? 'Continue' : (isChangingPin ? 'Save New PIN' : 'Activate PIN Lock')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  headerBlock: { marginBottom: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', marginBottom: 6 },
  pageSubtitle: { fontSize: 13, lineHeight: 18 },

  infoBanner: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  infoBannerTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  infoBannerText: { fontSize: 12, lineHeight: 17 },

  sectionHeading: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1, marginBottom: 20 },

  cardActionRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardSub: { fontSize: 12, lineHeight: 16 },

  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  switchTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  switchSub: { fontSize: 12, lineHeight: 16 },

  actionBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
  actionBtnRowText: { fontSize: 13, fontWeight: '700' },

  deviceSessionCard: { flexDirection: 'row', alignItems: 'center' },
  sessionTitle: { fontSize: 14, fontWeight: '700' },
  sessionSub: { fontSize: 12, marginTop: 2 },
  activeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  activeTagText: { fontSize: 9, fontWeight: '800' },

  privacyCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  privacyTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  privacyHeading: { fontSize: 13, fontWeight: '800' },
  privacyBody: { fontSize: 12, lineHeight: 17 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { borderRadius: 24, padding: 24, width: '100%', maxWidth: 380 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSub: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
  errorText: { color: '#DC2626', fontSize: 12, fontWeight: '700', marginBottom: 10 },

  inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4, marginTop: 8 },
  textInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  showPassToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 12 },
  showPassText: { fontSize: 12, fontWeight: '600' },

  pinInput: { fontSize: 32, letterSpacing: 16, textAlign: 'center', borderWidth: 2, borderRadius: 16, paddingVertical: 14, marginBottom: 20, fontWeight: '800' },
  modalPrimaryBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalPrimaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  btnDisabled: { opacity: 0.6 }
});
