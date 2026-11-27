import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface ThemeColors {
  isDark: boolean;
  canvas: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textPlaceholder: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySurface: string;
  accent: string;
  cardBg: string;
  iconBgDefault: string;
  divider: string;
  statusBar: 'light' | 'dark';
}

export const lightColors: ThemeColors = {
  isDark: false,
  canvas: '#F8F9FB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  borderSubtle: '#EDF2F7',
  textPrimary: '#102A54',
  textSecondary: '#4A5568',
  textMuted: '#718096',
  textPlaceholder: '#A0AEC0',
  primary: '#3C3985',
  primaryDark: '#232262',
  primaryLight: '#4A48A8',
  primarySurface: '#EEF0FB',
  accent: '#F7941D',
  cardBg: '#FFFFFF',
  iconBgDefault: '#F1F5F9',
  divider: '#F1F5F9',
  statusBar: 'dark',
};

export const darkColors: ThemeColors = {
  isDark: true,
  canvas: '#0B0F19',
  surface: '#151D2E',
  surfaceElevated: '#1E293B',
  surfaceMuted: '#243047',
  border: '#2A374E',
  borderSubtle: '#1E293B',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textPlaceholder: '#64748B',
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  primarySurface: '#1E1B4B',
  accent: '#FB923C',
  cardBg: '#151D2E',
  iconBgDefault: '#1E293B',
  divider: '#2A374E',
  statusBar: 'light',
};

interface ThemeContextType {
  preference: ThemePreference;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (pref: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  preference: 'system',
  isDark: false,
  colors: lightColors,
  setTheme: async () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hookColorScheme = useColorScheme();
  const [deviceColorScheme, setDeviceColorScheme] = useState<'light' | 'dark'>(
    (hookColorScheme || Appearance.getColorScheme() || 'light') as 'light' | 'dark'
  );
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Synchronize with react-native hook and Appearance listener
  useEffect(() => {
    const current = (hookColorScheme || Appearance.getColorScheme() || 'light') as 'light' | 'dark';
    setDeviceColorScheme(current);
  }, [hookColorScheme]);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme) setDeviceColorScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  // Load saved preference on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('appTheme');
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setPreferenceState(saved);
        }
      } catch (e) {
        console.warn('Error reading appTheme preference:', e);
      }
    })();
  }, []);

  const setTheme = useCallback(async (newPref: ThemePreference) => {
    setPreferenceState(newPref);
    try {
      await AsyncStorage.setItem('appTheme', newPref);
    } catch (e) {
      console.warn('Error saving appTheme preference:', e);
    }
  }, []);

  // Compute active dark state: manual preference takes precedence, system follows device
  const isDark =
    preference === 'dark' || (preference === 'system' && deviceColorScheme === 'dark');

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ preference, isDark, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
