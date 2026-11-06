import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Header } from './Header';

export interface AppShellProps {
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
  hideBack?: boolean;
  showSettings?: boolean;
  showNotifications?: boolean;
  showLanguage?: boolean;
  onSettingsPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * AppShell: The centralized layout container for TechArtha mobile screens.
 * Ensures the persistent company header is rendered once with accurate safe-area insets,
 * fixed at the top, while the screen content scrolls freely underneath.
 */
export const AppShell: React.FC<AppShellProps> = ({
  title,
  onBack,
  showBack,
  hideBack,
  showSettings = true,
  showNotifications = true,
  showLanguage = true,
  onSettingsPress,
  style,
  contentStyle,
  children,
}) => {
  return (
    <View style={[styles.shellContainer, style]}>
      <StatusBar style="dark" />
      <Header
        title={title}
        onBack={onBack}
        showBack={showBack}
        hideBack={hideBack}
        showSettings={showSettings}
        showNotifications={showNotifications}
        showLanguage={showLanguage}
        onSettingsPress={onSettingsPress}
      />
      <View style={[styles.shellContent, contentStyle]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shellContainer: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  shellContent: {
    flex: 1,
  },
});
