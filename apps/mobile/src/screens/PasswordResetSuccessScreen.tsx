import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';

export const PasswordResetSuccessScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const handleBackToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <StatusBar style={colors.statusBar} />
      <Header
        title=""
        showBack={false}
        hideBack={true}
        showSettings={false}
        showNotifications={false}
      />
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}>
        <View style={styles.content}>
          {/* Success Checkmark Circle */}
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle" size={72} color="#16A34A" />
          </View>

          <Text style={styles.title}>Password Reset Successful</Text>
          <Text style={styles.description}>
            Your password has been successfully reset.
          </Text>

          {/* Details Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={18} color="#059669" style={{ marginRight: 10 }} />
              <Text style={styles.infoText}>
                All previous active sessions have been safely logged out for your security.
              </Text>
            </View>
            <View style={[styles.infoRow, { marginTop: 10 }]}>
              <Ionicons name="key" size={18} color="#3C3985" style={{ marginRight: 10 }} />
              <Text style={styles.infoText}>
                You can now log in securely using your new credentials.
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Action Button */}
        <View style={styles.bottomSection}>
          <Pressable
            style={styles.primaryButton}
            onPress={handleBackToLogin}
            accessibilityRole="button"
            accessibilityLabel="Back to Login"
          >
            <Text style={styles.primaryButtonText}>Back to Login</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 36,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#16A34A',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#102A54',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 18,
    flex: 1,
  },
  bottomSection: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#3C3985',
    height: 54,
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
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
