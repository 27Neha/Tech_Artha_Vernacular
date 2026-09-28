import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { api } from '../services/api/client';
import { useAuth } from '../store/AuthContext';
import { styles } from '../theme/styles';

/** GET /auth/profile - user, KYC-bearing profile, risk profile and onboarding progress. */
type Profile = {
  id: string;
  mobile: string;
  clientType?: string | null;
  profile?: { fullName?: string | null; pan?: string | null; dateOfBirth?: string | null } | null;
  riskProfile?: { category?: string | null; score?: number | null } | null;
  onboardingProgress?: { lastCompletedStep?: string | null } | null;
};

const maskPan = (pan?: string | null) => (pan ? `${pan.slice(0, 3)}${'X'.repeat(5)}${pan.slice(-2)}` : '—');

export const ProfileScreen = () => {
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setProfile(await api.get<Profile>('/auth/profile'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'You will need your mobile number and an OTP to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.page}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Profile</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.learningCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{profile?.profile?.fullName ?? 'Your account'}</Text>
          <Text style={styles.cardSub}>{profile?.mobile ?? user?.mobile ?? ''}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>KYC</Text>
      <View style={styles.learningCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>PAN</Text>
          {/* Masked: the full PAN is never needed for display and the app should not
              put a complete identity number on a screen that could be shoulder-surfed. */}
          <Text style={styles.cardSub}>{maskPan(profile?.profile?.pan)}</Text>
        </View>
      </View>
      <View style={styles.learningCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Date of birth</Text>
          <Text style={styles.cardSub}>{profile?.profile?.dateOfBirth?.slice(0, 10) ?? '—'}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Risk profile</Text>
      <View style={styles.learningCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{profile?.riskProfile?.category ?? 'Not assessed yet'}</Text>
          {profile?.riskProfile?.score != null ? (
            <Text style={styles.cardSub}>Score {profile.riskProfile.score}</Text>
          ) : null}
        </View>
      </View>

      <Pressable style={[styles.primaryButton, { marginTop: 28 }]} onPress={confirmSignOut}>
        <Text style={styles.primaryText}>Sign out</Text>
      </Pressable>

      <Text style={styles.legal}>
        Mutual fund investments are subject to market risks. Read all scheme related documents carefully.
      </Text>
    </ScrollView>
  );
};
