import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api/client';

type TwoFactorChannel = 'WHATSAPP' | 'SMS' | 'EMAIL';

export const TwoFactorSettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();

  const [preferredChannel, setPreferredChannel] = useState<TwoFactorChannel>('WHATSAPP');
  const [userMobile, setUserMobile] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [savedChannel, res] = await Promise.all([
          AsyncStorage.getItem('techartha_2fa_preferred_channel'),
          api.get<any>('/auth/profile').catch(() => null),
        ]);
        if (!mounted) return;
        if (savedChannel === 'WHATSAPP' || savedChannel === 'SMS' || savedChannel === 'EMAIL') {
          setPreferredChannel(savedChannel);
        }
        if (res) {
          if (res.mobile) setUserMobile(`+91 ${res.mobile}`);
          if (res.email) setUserEmail(res.email);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectChannel = async (channel: TwoFactorChannel) => {
    setPreferredChannel(channel);
    await AsyncStorage.setItem('techartha_2fa_preferred_channel', channel);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top', 'right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Two-Factor Authentication</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Transaction Security & OTP Delivery Channel
          </Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={14} color="#059669" />
          <Text style={styles.badgeText}>Enforced</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statusRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="finger-print-outline" size={28} color="#3C3985" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Mandatory Transaction 2FA</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                Every mutual fund purchase, SIP registration, and redemption requires a cryptographic 4-digit OTP challenge.
              </Text>
            </View>
          </View>
        </View>

        {/* Regulatory Banner */}
        <View style={[styles.regBanner, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', borderColor: '#C7D2FE' }]}>
          <Ionicons name="information-circle" size={20} color="#3730A3" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.regTitle}>SEBI Two-Factor Compliance</Text>
            <Text style={styles.regText}>
              Per SEBI regulations, two-factor authentication cannot be disabled for mutual fund orders. You can choose your preferred OTP delivery channel below.
            </Text>
          </View>
        </View>

        {/* Preferred Delivery Channel */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PREFERRED OTP DELIVERY CHANNEL</Text>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* WhatsApp Channel */}
            <Pressable
              style={[styles.channelRow, { borderBottomColor: colors.borderSubtle }]}
              onPress={() => handleSelectChannel('WHATSAPP')}
            >
              <View style={[styles.channelIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="logo-whatsapp" size={22} color="#15803D" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.channelName, { color: colors.textPrimary }]}>WhatsApp OTP (Recommended)</Text>
                <Text style={[styles.channelSub, { color: colors.textSecondary }]}>
                  {userMobile
                    ? `Sent to ${userMobile} with automatic SMS fallback`
                    : 'Sent to your registered mobile number with SMS fallback'}
                </Text>
              </View>
              <Ionicons
                name={preferredChannel === 'WHATSAPP' ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={preferredChannel === 'WHATSAPP' ? colors.primary : colors.textPlaceholder}
              />
            </Pressable>

            {/* SMS Channel */}
            <Pressable
              style={[styles.channelRow, { borderBottomColor: colors.borderSubtle }]}
              onPress={() => handleSelectChannel('SMS')}
            >
              <View style={[styles.channelIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color="#0369A1" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.channelName, { color: colors.textPrimary }]}>Direct SMS OTP</Text>
                <Text style={[styles.channelSub, { color: colors.textSecondary }]}>
                  {userMobile
                    ? `Standard carrier SMS to ${userMobile}`
                    : 'Standard carrier SMS to your registered mobile number'}
                </Text>
              </View>
              <Ionicons
                name={preferredChannel === 'SMS' ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={preferredChannel === 'SMS' ? colors.primary : colors.textPlaceholder}
              />
            </Pressable>

            {/* Email OTP */}
            <Pressable
              style={[styles.channelRow, { borderBottomWidth: 0 }]}
              onPress={() => handleSelectChannel('EMAIL')}
            >
              <View style={[styles.channelIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="mail-outline" size={22} color="#5B21B6" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.channelName, { color: colors.textPrimary }]}>Verified Email OTP</Text>
                <Text style={[styles.channelSub, { color: colors.textSecondary }]}>
                  {userEmail ? `Delivered to ${userEmail}` : 'Delivered to your verified email address'}
                </Text>
              </View>
              <Ionicons
                name={preferredChannel === 'EMAIL' ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={preferredChannel === 'EMAIL' ? colors.primary : colors.textPlaceholder}
              />
            </Pressable>
          </View>
        )}

        <View style={styles.footerNote}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            All transaction OTP challenges are fingerprinted to the exact scheme and amount, remain valid for 5 minutes, and lock after 5 incorrect attempts.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  regBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  regTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3730A3',
  },
  regText: {
    fontSize: 11,
    color: '#4338CA',
    marginTop: 2,
    lineHeight: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  channelIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  channelName: {
    fontSize: 14,
    fontWeight: '700',
  },
  channelSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  footerNote: {
    marginTop: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
});
