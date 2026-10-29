import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Linking,
  Platform,
  AppState,
  PermissionsAndroid,
  Permission
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

interface PermissionItem {
  id: string;
  title: string;
  subtitle: string;
  feature: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBgLight: string;
  iconBgDark: string;
  iconColor: string;
  androidPerm?: Permission;
  rationale: string;
}

const PERMISSION_CONFIGS: PermissionItem[] = [
  {
    id: 'microphone',
    title: 'Microphone (Voice Assistant)',
    subtitle: 'Hands-free spoken voice queries in 12 regional languages.',
    feature: 'Vernacular AI Assistant',
    icon: 'mic-outline',
    iconBgLight: '#E0F2FE',
    iconBgDark: '#082F49',
    iconColor: '#0369A1',
    androidPerm: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    rationale: 'Powers hands-free voice search and spoken queries in Indian languages with the TechArtha AI Assistant.'
  },
  {
    id: 'camera',
    title: 'Camera',
    subtitle: 'SEBI In-Person Verification (IPV) and optical PAN card scanning.',
    feature: 'Digital KYC & IPV',
    icon: 'camera-outline',
    iconBgLight: '#EDE9FE',
    iconBgDark: '#2E1065',
    iconColor: '#5B21B6',
    androidPerm: PermissionsAndroid.PERMISSIONS.CAMERA,
    rationale: 'SEBI regulations require live photo capture during account opening to verify identity against Income Tax records.'
  },
  {
    id: 'photos',
    title: 'Photos & Files',
    subtitle: 'Upload pre-saved PAN card photos, cancelled cheques & download CAS statements.',
    feature: 'Document Upload & Export',
    icon: 'images-outline',
    iconBgLight: '#FEF3C7',
    iconBgDark: '#451A03',
    iconColor: '#B45309',
    androidPerm: (PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_IMAGES || PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    rationale: 'Allows you to select digital documents from your photo library for KYC and download mutual fund statement PDFs.'
  },
  {
    id: 'notifications',
    title: 'Push Notifications',
    subtitle: 'Alerts for scheduled SIP debits, NAV updates & execution reports.',
    feature: 'SIP & NAV Alerts',
    icon: 'notifications-outline',
    iconBgLight: '#E0E7FF',
    iconBgDark: '#1E1B4B',
    iconColor: '#3730A3',
    androidPerm: (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS,
    rationale: 'TechArtha notifies you 48 hours before auto-debits so you can maintain sufficient balance.'
  },
  {
    id: 'location',
    title: 'Location (SEBI KYC Only)',
    subtitle: 'Mandatory Indian GPS geo-tagging during digital in-person verification.',
    feature: 'SEBI Compliance',
    icon: 'location-outline',
    iconBgLight: '#FCE7F3',
    iconBgDark: '#500724',
    iconColor: '#BE185D',
    androidPerm: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    rationale: 'Under SEBI circular SEBI/HO/MIRSD/DOP/CIR/P/2020/73, digital IPV must be geo-tagged with Indian GPS coordinates.'
  }
];

export const PermissionsScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();

  // All initial statuses set to 'denied' - never show granted before real verification
  const [statuses, setStatuses] = useState<Record<string, 'granted' | 'denied'>>({
    microphone: 'denied',
    camera: 'denied',
    photos: 'denied',
    notifications: 'denied',
    location: 'denied'
  });

  const checkAllPermissions = useCallback(async () => {
    const newStatuses: Record<string, 'granted' | 'denied'> = {
      microphone: 'denied',
      camera: 'denied',
      photos: 'denied',
      notifications: 'denied',
      location: 'denied'
    };

    if (Platform.OS === 'android') {
      try {
        for (const perm of PERMISSION_CONFIGS) {
          if (perm.androidPerm) {
            try {
              const isGranted = await PermissionsAndroid.check(perm.androidPerm);
              newStatuses[perm.id] = isGranted ? 'granted' : 'denied';
            } catch {
              newStatuses[perm.id] = 'denied';
            }
          }
        }
      } catch (e) {
        console.warn('Error checking Android permissions:', e);
      }
    }
    setStatuses(newStatuses);
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkAllPermissions();
    }, [checkAllPermissions])
  );

  useEffect(() => {
    // Refresh permission statuses whenever the user switches back from system Settings
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkAllPermissions();
      }
    });
    return () => sub.remove();
  }, [checkAllPermissions]);

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert('Settings', 'Please open your phone Settings manually to manage permissions.');
    }
  };

  const handlePermissionPress = async (perm: PermissionItem) => {
    const isGranted = statuses[perm.id] === 'granted';

    if (isGranted) {
      Alert.alert(
        `${perm.title} is Allowed`,
        `TechArtha currently has access to ${perm.title.toLowerCase()} for ${perm.feature}.\n\nTo manage or revoke this permission, you can adjust it in your phone's native Settings.`,
        [
          { text: 'Done', style: 'cancel' },
          { text: 'Open Settings', onPress: handleOpenSettings }
        ]
      );
      return;
    }

    // Permission is not granted yet: try genuine in-app OS request
    if (Platform.OS === 'android' && perm.androidPerm) {
      try {
        const result = await PermissionsAndroid.request(perm.androidPerm, {
          title: `TechArtha: ${perm.title} Access`,
          message: `${perm.rationale}\n\nRequired for: ${perm.feature}`,
          buttonPositive: 'Allow',
          buttonNegative: 'Deny'
        });

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          setStatuses((prev) => ({ ...prev, [perm.id]: 'granted' }));
          Alert.alert('Permission Allowed', `${perm.title} has been enabled for TechArtha.`);
        } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert(
            'Permission Blocked in System Settings',
            `Access to ${perm.title} was declined with "Don't ask again". Please enable it in your phone's System Settings to use ${perm.feature}.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Phone Settings', onPress: handleOpenSettings }
            ]
          );
        } else {
          setStatuses((prev) => ({ ...prev, [perm.id]: 'denied' }));
        }
      } catch (err) {
        handleOpenSettings();
      }
    } else {
      Alert.alert(
        `Enable ${perm.title}`,
        `${perm.rationale}\n\nPlease enable this permission in your phone's System Settings.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: handleOpenSettings }
        ]
      );
    }
  };

  const allowedCount = Object.values(statuses).filter((s) => s === 'granted').length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title="Device Permissions" onBack={() => navigation.goBack()} showSettings={false} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Title & Explanatory Banner */}
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>App Permissions</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Review and configure device capabilities utilized by TechArtha for mutual fund onboarding and transaction alerts.
          </Text>
        </View>

        {/* Status Overview Card */}
        <View style={[styles.overviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.overviewTop}>
            <View>
              <Text style={[styles.overviewTitle, { color: colors.textPrimary }]}>Permissions Status</Text>
              <Text style={[styles.overviewSub, { color: colors.textSecondary }]}>
                {allowedCount} of {PERMISSION_CONFIGS.length} permissions allowed
              </Text>
            </View>
            <Pressable
              style={[styles.openSettingsButton, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF', borderColor: colors.border }]}
              onPress={handleOpenSettings}
            >
              <Ionicons name="settings-outline" size={15} color={colors.primary} style={{ marginRight: 5 }} />
              <Text style={[styles.openSettingsButtonText, { color: colors.primary }]}>Open Settings</Text>
            </Pressable>
          </View>
        </View>

        {/* Permissions List */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Configured Permissions ({PERMISSION_CONFIGS.length})</Text>
        <View style={styles.permListGroup}>
          {PERMISSION_CONFIGS.map((item) => {
            const isGranted = statuses[item.id] === 'granted';
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.permCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { backgroundColor: isDark ? colors.surfaceMuted : '#F8FAFC' }
                ]}
                onPress={() => handlePermissionPress(item)}
                hitSlop={6}
              >
                <View style={styles.permRow}>
                  <View style={[styles.iconBox, { backgroundColor: isDark ? item.iconBgDark : item.iconBgLight }]}>
                    <Ionicons name={item.icon} size={20} color={item.iconColor} />
                  </View>

                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.permTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                      <View style={[styles.statusPill, isGranted ? (isDark ? styles.pillAllowedDark : styles.pillAllowed) : (isDark ? styles.pillDeniedDark : styles.pillDenied)]}>
                        <Ionicons
                          name={isGranted ? 'checkmark-circle' : 'close-circle'}
                          size={12}
                          color={isGranted ? '#059669' : '#DC2626'}
                          style={{ marginRight: 3 }}
                        />
                        <Text style={[styles.statusPillText, isGranted ? (isDark ? styles.textAllowedDark : styles.textAllowed) : (isDark ? styles.textDeniedDark : styles.textDenied)]}>
                          {isGranted ? 'Allowed' : 'Not Allowed'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.permSub, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                    <View style={[styles.featureBadge, { backgroundColor: isDark ? colors.surfaceMuted : '#F1F5F9' }]}>
                      <Ionicons name="shield-outline" size={10} color={colors.textMuted} style={{ marginRight: 3 }} />
                      <Text style={[styles.featureBadgeText, { color: colors.textMuted }]}>{item.feature}</Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Privacy & Regulatory Assurance */}
        <View style={[styles.privacyCard, { backgroundColor: isDark ? '#064E3B' : '#F0FDF4', borderColor: isDark ? '#047857' : '#DCFCE7' }]}>
          <View style={styles.privacyTopRow}>
            <Ionicons name="shield-checkmark" size={20} color={isDark ? '#34D399' : '#059669'} />
            <Text style={[styles.privacyHeading, { color: isDark ? '#A7F3D0' : '#065F46' }]}>Strict User-Initiated Access</Text>
          </View>
          <Text style={[styles.privacyBody, { color: isDark ? '#D1FAE5' : '#047857' }]}>
            TechArtha complies with SEBI circulars and Indian financial privacy frameworks. Permissions are utilized strictly during active user flows and never accessed in the background.
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

  overviewCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1 },
  overviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overviewTitle: { fontSize: 15, fontWeight: '800' },
  overviewSub: { fontSize: 12, marginTop: 2 },
  openSettingsButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  openSettingsButtonText: { fontSize: 12, fontWeight: '700' },

  sectionHeading: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  permListGroup: { gap: 10, marginBottom: 20 },

  permCard: { borderRadius: 16, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  permTitle: { fontSize: 14, fontWeight: '800' },
  permSub: { fontSize: 12, lineHeight: 16, marginBottom: 6 },

  featureBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  featureBadgeText: { fontSize: 10, fontWeight: '700' },

  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillAllowed: { backgroundColor: '#ECFDF5' },
  pillDenied: { backgroundColor: '#FEF2F2' },
  pillAllowedDark: { backgroundColor: '#064E3B' },
  pillDeniedDark: { backgroundColor: '#450A0A' },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  textAllowed: { color: '#059669' },
  textDenied: { color: '#DC2626' },
  textAllowedDark: { color: '#34D399' },
  textDeniedDark: { color: '#F87171' },

  privacyCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  privacyTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  privacyHeading: { fontSize: 13, fontWeight: '800' },
  privacyBody: { fontSize: 12, lineHeight: 17 }
});
