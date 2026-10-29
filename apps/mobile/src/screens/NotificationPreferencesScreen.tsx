import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Pressable,
  Platform,
  PermissionsAndroid,
  AppState,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

export const NotificationPreferencesScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();

  // OS-level permission state
  const [osPermissionGranted, setOsPermissionGranted] = useState<boolean>(true);

  // In-App Notification Preferences
  const [notifPrefs, setNotifPrefs] = useState({
    sipReminders: true,
    orderUpdates: true,
    portfolioAlerts: true,
    whatsappUpdates: true,
    emailStatements: true
  });

  const checkOsPermission = useCallback(async () => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const hasPermission = await PermissionsAndroid.check(
          (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS
        );
        setOsPermissionGranted(hasPermission);
      } catch {
        setOsPermissionGranted(true);
      }
    } else {
      setOsPermissionGranted(true);
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('techartha_notif_prefs');
      if (saved) {
        setNotifPrefs(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Error loading notification preferences:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkOsPermission();
      loadPreferences();
    }, [checkOsPermission, loadPreferences])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkOsPermission();
      }
    });
    return () => sub.remove();
  }, [checkOsPermission]);

  const handleToggle = async (key: keyof typeof notifPrefs) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    await AsyncStorage.setItem('techartha_notif_prefs', JSON.stringify(updated));
  };

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      // Ignored
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title="Notification Preferences" onBack={() => navigation.goBack()} showSettings={false} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Notification Settings</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Configure automated transaction alerts, SIP debits, and external channel notifications.
          </Text>
        </View>

        {/* OS-LEVEL PERMISSION BANNER */}
        {!osPermissionGranted ? (
          <View style={[styles.warningBanner, { backgroundColor: isDark ? '#450A0A' : '#FEF2F2', borderColor: isDark ? '#991B1B' : '#FCA5A5' }]}>
            <View style={styles.warningTop}>
              <Ionicons name="alert-circle" size={22} color="#DC2626" />
              <Text style={[styles.warningTitle, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>Device Push Notifications Disabled</Text>
            </View>
            <Text style={[styles.warningText, { color: isDark ? '#FECACA' : '#7F1D1D' }]}>
              Your phone operating system has push notifications turned off for TechArtha. Even if push options below are enabled, you will not receive on-screen alerts until permission is allowed in your phone Settings.
            </Text>
            <Pressable style={[styles.openSettingsBtn, { backgroundColor: colors.surface, borderColor: '#F87171' }]} onPress={handleOpenSettings}>
              <Ionicons name="settings-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.openSettingsBtnText}>Open Phone Settings</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.statusSuccessBanner, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5', borderColor: isDark ? '#047857' : '#A7F3D0' }]}>
            <Ionicons name="checkmark-circle" size={20} color={isDark ? '#34D399' : '#059669'} />
            <Text style={[styles.statusSuccessText, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
              Device Push Notifications Active (Allowed in System Settings)
            </Text>
          </View>
        )}

        {/* 1. DEVICE PUSH NOTIFICATIONS */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Device Push Notifications</Text>
        <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
          Requires device push notification permissions to be allowed on your phone.
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.switchRow, { borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
              <Ionicons name="calendar-outline" size={20} color={isDark ? '#A78BFA' : '#5B21B6'} />
            </View>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>SIP Auto-Debit Reminders</Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>Alerts 48 hours prior to monthly SIP debits to prevent bank NACH bounce fees.</Text>
            </View>
            <Switch
              value={notifPrefs.sipReminders}
              onValueChange={() => handleToggle('sipReminders')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.switchRow, { borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#082F49' : '#E0F2FE' }]}>
              <Ionicons name="checkmark-done-circle-outline" size={20} color={isDark ? '#38BDF8' : '#0369A1'} />
            </View>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Order Execution & NAV Allotments</Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>Real-time notification when AMC units are allotted or redemptions reach your bank.</Text>
            </View>
            <Switch
              value={notifPrefs.orderUpdates}
              onValueChange={() => handleToggle('orderUpdates')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#451A03' : '#FEF3C7' }]}>
              <Ionicons name="trending-up-outline" size={20} color={isDark ? '#FBBF24' : '#B45309'} />
            </View>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Portfolio & Risk Re-Test Alerts</Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>Significant market movements and annual SEBI risk profile reviews.</Text>
            </View>
            <Switch
              value={notifPrefs.portfolioAlerts}
              onValueChange={() => handleToggle('portfolioAlerts')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* 2. DIRECT EXTERNAL DELIVERY CHANNELS */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Direct External Channels</Text>
        <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
          Delivered directly to your contact channels, independent of device push permissions.
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.switchRow, { borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#052E16' : '#DCFCE7' }]}>
              <Ionicons name="logo-whatsapp" size={20} color={isDark ? '#4ADE80' : '#16A34A'} />
            </View>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>WhatsApp Financial Updates</Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>Monthly portfolio valuation statements & instant order confirmation messages.</Text>
            </View>
            <Switch
              value={notifPrefs.whatsappUpdates}
              onValueChange={() => handleToggle('whatsappUpdates')}
              trackColor={{ false: colors.border, true: '#25D366' }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#082F49' : '#F0F9FF' }]}>
              <Ionicons name="mail-outline" size={20} color={isDark ? '#38BDF8' : '#0284C7'} />
            </View>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Email Statements & Tax P&L</Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>Statutory Consolidated Account Statements (CAS) and capital gains reports.</Text>
            </View>
            <Switch
              value={notifPrefs.emailStatements}
              onValueChange={() => handleToggle('emailStatements')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* 3. AMFI COMPLIANCE NOTICE */}
        <View style={[styles.privacyCard, { backgroundColor: isDark ? '#064E3B' : '#F0FDF4', borderColor: isDark ? '#047857' : '#DCFCE7' }]}>
          <View style={styles.privacyTopRow}>
            <Ionicons name="shield-checkmark" size={18} color={isDark ? '#34D399' : '#059669'} />
            <Text style={[styles.privacyHeading, { color: isDark ? '#A7F3D0' : '#065F46' }]}>Strict Non-Commercial Policy</Text>
          </View>
          <Text style={[styles.privacyBody, { color: isDark ? '#D1FAE5' : '#047857' }]}>
            In compliance with AMFI and SEBI fair practice codes, TechArtha strictly disallows promotional spam, speculative tips, or sharing investor contact coordinates with third parties.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  headerBlock: { marginBottom: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', marginBottom: 6 },
  pageSubtitle: { fontSize: 13, lineHeight: 18 },

  warningBanner: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 20 },
  warningTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  warningTitle: { fontSize: 14, fontWeight: '800' },
  warningText: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  openSettingsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 10 },
  openSettingsBtnText: { color: '#DC2626', fontSize: 13, fontWeight: '800' },

  statusSuccessBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  statusSuccessText: { fontSize: 12, fontWeight: '700' },

  sectionHeading: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2, marginLeft: 4 },
  sectionDescription: { fontSize: 11, marginBottom: 10, marginLeft: 4 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1, marginBottom: 20 },

  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  switchTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  switchSub: { fontSize: 12, lineHeight: 16 },

  privacyCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  privacyTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  privacyHeading: { fontSize: 13, fontWeight: '800' },
  privacyBody: { fontSize: 12, lineHeight: 17 }
});
