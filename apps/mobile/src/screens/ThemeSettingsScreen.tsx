import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemePreference } from '../context/ThemeContext';

interface ThemeOption {
  id: ThemePreference;
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBgLight: string;
  iconBgDark: string;
  iconColor: string;
}

const THEMES: ThemeOption[] = [
  {
    id: 'system',
    title: 'System Default',
    desc: 'Automatically matches your phone’s display settings and daylight schedule.',
    icon: 'phone-portrait-outline',
    iconBgLight: '#EDE9FE',
    iconBgDark: '#2E1065',
    iconColor: '#8B5CF6'
  },
  {
    id: 'light',
    title: 'Light Theme',
    desc: 'Clean, high-contrast crisp daytime interface with white cards.',
    icon: 'sunny-outline',
    iconBgLight: '#FEF3C7',
    iconBgDark: '#451A03',
    iconColor: '#F59E0B'
  },
  {
    id: 'dark',
    title: 'Dark Theme',
    desc: 'Deep slate appearance optimized for low-light environments and OLED efficiency.',
    icon: 'moon-outline',
    iconBgLight: '#E0E7FF',
    iconBgDark: '#1E1B4B',
    iconColor: '#6366F1'
  }
];

export const ThemeSettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { preference, setTheme, colors, isDark } = useTheme();

  const handleThemeChange = async (newTheme: ThemePreference) => {
    await setTheme(newTheme);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['right', 'bottom', 'left']}>
      <StatusBar style={colors.statusBar} />
      <Header title="App Theme" onBack={() => navigation.goBack()} showSettings={false} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Appearance</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Customize your visual theme and color palette for viewing charts, funds, and portfolio summaries.
          </Text>
        </View>

        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF', borderColor: colors.border }]}>
          <Ionicons name="color-palette" size={22} color={colors.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBannerTitle, { color: colors.primary }]}>Visual Accessibility</Text>
            <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
              All themes maintain WCAG 2.1 AA contrast ratios for financial tables and candlestick charts.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Theme Options</Text>
        <View style={styles.themeList}>
          {THEMES.map(item => {
            const isSelected = preference === item.id;
            return (
              <Pressable
                key={item.id}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border
                  },
                  isSelected && {
                    backgroundColor: isDark ? colors.surfaceElevated : '#FBFBFE'
                  }
                ]}
                onPress={() => handleThemeChange(item.id)}
              >
                <View style={[styles.iconBox, { backgroundColor: isDark ? item.iconBgDark : item.iconBgLight }]}>
                  <Ionicons name={item.icon} size={22} color={item.iconColor} />
                </View>

                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[
                    styles.themeTitle,
                    { color: colors.textPrimary },
                    isSelected && { color: colors.primary }
                  ]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.themeDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                </View>

                {isSelected ? (
                  <View style={styles.activeCheck}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  </View>
                ) : (
                  <View style={[styles.inactiveCircle, { borderColor: colors.border }]} />
                )}
              </Pressable>
            );
          })}
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
  themeList: { gap: 10 },

  themeCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  themeTitle: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  themeDesc: { fontSize: 12, lineHeight: 16 },

  activeCheck: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  inactiveCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 }
});
