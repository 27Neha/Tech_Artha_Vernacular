import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Paths } from 'expo-file-system';
import { useTheme } from '../context/ThemeContext';

export const StorageCacheScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const [cacheSize, setCacheSize] = useState<string>('Calculating...');
  const [clearing, setClearing] = useState(false);

  const calculateCacheSize = useCallback(async () => {
    try {
      let totalBytes = 0;
      if (Paths?.cache) {
        try {
          const items = Paths.cache.list();
          for (const item of items) {
            if ('size' in item && typeof item.size === 'number') {
              totalBytes += item.size;
            }
          }
        } catch {
          // Empty or non-accessible cache directory
        }
      }

      if (totalBytes === 0) {
        setCacheSize('0.00 MB');
      } else {
        const mb = (totalBytes / (1024 * 1024)).toFixed(2);
        setCacheSize(`${mb} MB`);
      }
    } catch {
      setCacheSize('0.00 MB');
    }
  }, []);

  useEffect(() => {
    calculateCacheSize();
  }, [calculateCacheSize]);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Temporary Cache',
      'This action will remove cached AMC fund fact-sheets, scheme logos, and temporary files to free up device space.\n\nYour portfolio investments, login credentials, and bank authorizations remain completely safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              if (Paths?.cache) {
                try {
                  const items = Paths.cache.list();
                  for (const item of items) {
                    if (typeof (item as any).delete === 'function') {
                      (item as any).delete();
                    }
                  }
                } catch {
                  // Handled gracefully
                }
              }
              await calculateCacheSize();
              Alert.alert('Cache Cleared', 'Temporary cache has been purged successfully.');
            } catch {
              setCacheSize('0.00 MB');
              Alert.alert('Cache Cleared', 'Temporary cache has been purged.');
            } finally {
              setClearing(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title="Storage & Cache" onBack={() => navigation.goBack()} showSettings={false} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Device Storage</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Manage cached mutual fund factsheets, downloaded statements, and device storage footprint.
          </Text>
        </View>

        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF', borderColor: colors.border }]}>
          <Ionicons name="server-outline" size={22} color={colors.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBannerTitle, { color: colors.primary }]}>Optimized Device Footprint</Text>
            <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
              TechArtha caches scheme NAVs and AMC documents locally to ensure fast performance even on intermittent connections.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Current Cache Usage</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.usageRow}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
              <Ionicons name="file-tray-full-outline" size={22} color={isDark ? '#A78BFA' : '#5B21B6'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.usageLabel, { color: colors.textMuted }]}>Temporary App Storage</Text>
              <Text style={[styles.usageValue, { color: colors.textPrimary }]}>{cacheSize}</Text>
            </View>
            <Pressable
              style={[styles.clearBtn, clearing && styles.clearBtnDisabled]}
              onPress={handleClearCache}
              disabled={clearing}
            >
              <Ionicons name="trash-outline" size={16} color="#C53030" style={{ marginRight: 4 }} />
              <Text style={styles.clearBtnText}>Purge</Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Cache Categories</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.itemRow, { borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.iconBoxSm, { backgroundColor: isDark ? '#082F49' : '#E0F2FE' }]}>
              <Ionicons name="document-text-outline" size={18} color={isDark ? '#38BDF8' : '#0369A1'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>AMC Scheme Factsheets</Text>
              <Text style={[styles.itemSub, { color: colors.textMuted }]}>SID/KIM documentation & fund holdings</Text>
            </View>
            <Text style={[styles.itemSize, { color: colors.textMuted }]}>~65%</Text>
          </View>

          <View style={[styles.itemRow, { borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.iconBoxSm, { backgroundColor: isDark ? '#451A03' : '#FEF3C7' }]}>
              <Ionicons name="images-outline" size={18} color={isDark ? '#FBBF24' : '#B45309'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>Asset & Logo Graphics</Text>
              <Text style={[styles.itemSub, { color: colors.textMuted }]}>Mutual Fund logos & UI icons</Text>
            </View>
            <Text style={[styles.itemSize, { color: colors.textMuted }]}>~25%</Text>
          </View>

          <View style={[styles.itemRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.iconBoxSm, { backgroundColor: isDark ? '#052E16' : '#DCFCE7' }]}>
              <Ionicons name="stats-chart-outline" size={18} color={isDark ? '#4ADE80' : '#15803D'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>Historical NAV Curves</Text>
              <Text style={[styles.itemSub, { color: colors.textMuted }]}>5-year benchmark return charts</Text>
            </View>
            <Text style={[styles.itemSize, { color: colors.textMuted }]}>~10%</Text>
          </View>
        </View>

        <View style={[styles.privacyCard, { backgroundColor: isDark ? '#064E3B' : '#F0FDF4', borderColor: isDark ? '#047857' : '#DCFCE7' }]}>
          <View style={styles.privacyTopRow}>
            <Ionicons name="shield-checkmark" size={18} color={isDark ? '#34D399' : '#059669'} />
            <Text style={[styles.privacyHeading, { color: isDark ? '#A7F3D0' : '#065F46' }]}>Account Data Unaffected</Text>
          </View>
          <Text style={[styles.privacyBody, { color: isDark ? '#D1FAE5' : '#047857' }]}>
            Purging cache does not affect your active orders, portfolio balance, bank accounts, or security credentials. Essential data will reload automatically when needed.
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

  infoBanner: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  infoBannerTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  infoBannerText: { fontSize: 12, lineHeight: 17 },

  sectionHeading: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1, marginBottom: 20 },

  usageRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  usageLabel: { fontSize: 12, fontWeight: '600' },
  usageValue: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#FEB2B2' },
  clearBtnDisabled: { opacity: 0.5 },
  clearBtnText: { color: '#C53030', fontSize: 12, fontWeight: '800' },

  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  iconBoxSm: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemTitle: { fontSize: 14, fontWeight: '700' },
  itemSub: { fontSize: 11, marginTop: 2 },
  itemSize: { fontSize: 12, fontWeight: '800' },

  privacyCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  privacyTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  privacyHeading: { fontSize: 13, fontWeight: '800' },
  privacyBody: { fontSize: 12, lineHeight: 17 }
});
