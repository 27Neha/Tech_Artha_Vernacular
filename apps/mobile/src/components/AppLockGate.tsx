import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  AppState,
  AppStateStatus,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface AppLockContextType {
  isPinActive: boolean;
  setPinActive: (active: boolean) => void;
  lockAppNow: () => void;
}

const AppLockContext = createContext<AppLockContextType>({
  isPinActive: false,
  setPinActive: () => {},
  lockAppNow: () => {}
});

export const useAppLock = () => useContext(AppLockContext);

export const AppLockGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const [isPinActive, setIsPinActive] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [attempts, setAttempts] = useState<number>(0);

  // Check PIN enablement state
  const checkPinStatus = useCallback(async () => {
    try {
      const enabled = await AsyncStorage.getItem('techartha_pin_enabled');
      const hasPin = enabled === 'true';
      setIsPinActive(hasPin);
      if (hasPin && status === 'authenticated') {
        setIsLocked(true);
      }
    } catch {
      setIsPinActive(false);
    }
  }, [status]);

  useEffect(() => {
    checkPinStatus();
  }, [checkPinStatus]);

  // Monitor AppState to lock when backgrounded
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState.match(/inactive|background/) && isPinActive && status === 'authenticated') {
        setIsLocked(true);
        setPinInput('');
        setPinError('');
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [isPinActive, status]);

  // Verify entered PIN against SecureStore
  const handleVerifyPin = async (enteredPin: string) => {
    try {
      const storedPin = await SecureStore.getItemAsync('techartha_user_pin');
      if (storedPin && storedPin === enteredPin) {
        setIsLocked(false);
        setPinInput('');
        setPinError('');
        setAttempts(0);
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setPinInput('');
        setPinError(
          nextAttempts >= 3
            ? 'Incorrect PIN. You can reset your session below.'
            : 'Incorrect PIN. Please try again.'
        );
      }
    } catch {
      setPinError('Security check failed. Try again.');
      setPinInput('');
    }
  };

  const handleKeyPress = (digit: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setPinError('');
      if (nextPin.length === 4) {
        setTimeout(() => handleVerifyPin(nextPin), 100);
      }
    }
  };

  const handleDelete = () => {
    if (pinInput.length > 0) {
      setPinInput(pinInput.slice(0, -1));
      setPinError('');
    }
  };

  const handleForgotPin = () => {
    Alert.alert(
      'Forgot Security PIN?',
      'To protect your account, resetting your PIN requires signing out. You can sign back in using OTP or your account password.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out & Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('techartha_pin_enabled');
              await SecureStore.deleteItemAsync('techartha_user_pin').catch(() => {});
              setIsPinActive(false);
              setIsLocked(false);
              await signOut();
            } catch {
              setIsLocked(false);
            }
          }
        }
      ]
    );
  };

  const lockAppNow = () => {
    if (isPinActive && status === 'authenticated') {
      setIsLocked(true);
      setPinInput('');
      setPinError('');
    }
  };

  const setPinActiveState = (active: boolean) => {
    setIsPinActive(active);
  };

  return (
    <AppLockContext.Provider value={{ isPinActive, setPinActive: setPinActiveState, lockAppNow }}>
      {children}

      {/* FULL-SCREEN PIN LOCK OVERLAY */}
      {isLocked && status === 'authenticated' && (
        <SafeAreaView
          style={[styles.lockOverlay, { backgroundColor: colors.canvas }]}
          edges={['top', 'right', 'bottom', 'left']}
        >
          <StatusBar style={colors.statusBar} />
          <View style={styles.lockContainer}>
            {/* Logo & Lock Badge */}
            <View style={styles.iconContainer}>
              <View style={[styles.shieldCircle, { backgroundColor: isDark ? colors.surfaceMuted : '#EEF2FF', borderColor: colors.border }]}>
                <Ionicons name="lock-closed" size={32} color={colors.primary} />
              </View>
            </View>

            <Text style={[styles.appTitle, { color: colors.primary }]}>TechArtha</Text>
            <Text style={[styles.lockTitle, { color: colors.textPrimary }]}>Enter 4-Digit Security PIN</Text>
            <Text style={[styles.lockSubtitle, { color: colors.textSecondary }]}>
              Hardware-secured protection for your mutual fund portfolio & mandates.
            </Text>

            {/* PIN Dots Display */}
            <View style={styles.dotsRow}>
              {[0, 1, 2, 3].map((index) => {
                const filled = pinInput.length > index;
                return (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      { borderColor: colors.border },
                      filled && [styles.dotFilled, { backgroundColor: colors.primary, borderColor: colors.primary }],
                      pinError ? styles.dotError : null
                    ]}
                  />
                );
              })}
            </View>

            {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}

            {/* Custom Keypad */}
            <View style={styles.keypad}>
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['', '0', 'del']
              ].map((row, rIdx) => (
                <View key={rIdx} style={styles.keypadRow}>
                  {row.map((item, cIdx) => {
                    if (item === '') {
                      return <View key={cIdx} style={styles.keyEmpty} />;
                    }
                    if (item === 'del') {
                      return (
                        <Pressable
                          key={cIdx}
                          style={({ pressed }) => [
                            styles.keyBtn,
                            { backgroundColor: colors.surface, borderColor: colors.border },
                            pressed && { backgroundColor: isDark ? colors.surfaceMuted : '#EDE9FE', borderColor: colors.primary }
                          ]}
                          onPress={handleDelete}
                          hitSlop={10}
                        >
                          <Ionicons name="backspace-outline" size={26} color={colors.textSecondary} />
                        </Pressable>
                      );
                    }
                    return (
                      <Pressable
                        key={cIdx}
                        style={({ pressed }) => [
                          styles.keyBtn,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                          pressed && { backgroundColor: isDark ? colors.surfaceMuted : '#EDE9FE', borderColor: colors.primary }
                        ]}
                        onPress={() => handleKeyPress(item)}
                        hitSlop={10}
                      >
                        <Text style={[styles.keyText, { color: colors.textPrimary }]}>{item}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Forgot PIN Recovery */}
            <Pressable style={styles.forgotBtn} onPress={handleForgotPin}>
              <Text style={styles.forgotBtnText}>Forgot PIN? Sign Out</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      )}
    </AppLockContext.Provider>
  );
};

const styles = StyleSheet.create({
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    elevation: 999999
  },
  lockContainer: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconContainer: {
    marginBottom: 16
  },
  shieldCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6
  },
  lockSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 24
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 12,
    height: 28,
    alignItems: 'center'
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: 'transparent'
  },
  dotFilled: {},
  dotError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2'
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center'
  },
  keypad: {
    width: '100%',
    maxWidth: 300,
    gap: 12,
    marginTop: 10
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  keyBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  keyEmpty: {
    width: 72,
    height: 72
  },
  keyText: {
    fontSize: 26,
    fontWeight: '800'
  },
  forgotBtn: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  forgotBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700'
  }
});
