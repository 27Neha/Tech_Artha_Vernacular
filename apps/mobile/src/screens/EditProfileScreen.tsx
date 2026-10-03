import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api/client';

/**
 * GET + PUT /auth/profile.
 *
 * Ported from apps/web/app/dashboard/profile/edit, but not faithfully: that page writes
 * to localStorage, calls no endpoint at all, and still reports "Profile saved
 * successfully". This one actually persists through the API.
 *
 * Only the fields AuthService.updateProfile stores are offered. The web form also asks
 * for an email and a postal address, neither of which the profile holds - those are
 * collected per-order by the invest flow instead.
 */
type Profile = {
  mobile?: string;
  profile?: { fullName?: string | null; pan?: string | null; dateOfBirth?: string | null } | null;
};

const maskPan = (pan?: string | null) => (pan ? `${pan.slice(0, 3)}${'X'.repeat(5)}${pan.slice(-2)}` : '—');

const formatDobInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
};

export const EditProfileScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mobile, setMobile] = useState('');
  const [pan, setPan] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get<Profile>('/auth/profile')
      .then((data) => {
        if (cancelled) return;
        setMobile(data?.mobile ?? '');
        setPan(data?.profile?.pan ?? null);
        setFullName(data?.profile?.fullName ?? '');
        setDateOfBirth((data?.profile?.dateOfBirth ?? '').slice(0, 10));
      })
      .catch((e) => Alert.alert('Could not load your profile', e instanceof Error ? e.message : 'Please try again.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!fullName.trim()) return Alert.alert('Check your details', 'Enter your full name.');
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      return Alert.alert('Check your details', 'Enter your date of birth as YYYY-MM-DD.');
    }
    setSaving(true);
    try {
      await api.put('/auth/profile', {
        fullName: fullName.trim(),
        ...(dateOfBirth ? { dateOfBirth } : {}),
      });
      Alert.alert('Profile updated', 'Your details have been saved.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centre}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit profile</Text>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Full name (as on PAN)</Text>
        <TextInput value={fullName} onChangeText={setFullName} autoCapitalize="words" style={styles.input} />

        <Text style={styles.label}>Date of birth</Text>
        <TextInput
          value={dateOfBirth}
          onChangeText={(value) => setDateOfBirth(formatDobInput(value))}
          placeholder="YYYY-MM-DD"
          keyboardType="number-pad"
          maxLength={10}
          style={styles.input}
        />

        <Text style={styles.label}>Mobile number</Text>
        <View style={styles.readonly}>
          <Text style={styles.readonlyText}>{mobile || '—'}</Text>
        </View>
        <Text style={styles.hint}>Your mobile number identifies your account and cannot be changed here.</Text>

        <Text style={styles.label}>PAN</Text>
        <View style={styles.readonly}>
          <Text style={styles.readonlyText}>{maskPan(pan)}</Text>
        </View>
        {/* Editing a PAN after verification would silently invalidate the KYC that was
            performed against it, so it is shown masked and left read-only. */}
        <Text style={styles.hint}>Your PAN is verified through KYC and cannot be edited.</Text>

        <Pressable style={[styles.button, saving && styles.disabled]} onPress={save} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save changes'}</Text>
        </Pressable>
        <Pressable style={styles.outlineButton} onPress={() => navigation.goBack()}>
          <Text style={styles.outlineText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 12 },
  headerTitle: { color: '#102A54', fontSize: 24, fontWeight: '800' },
  content: { paddingHorizontal: 20 },
  label: { fontSize: 13, color: '#4A5568', fontWeight: '600', marginTop: 18, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 16, color: '#102A54' },
  readonly: { backgroundColor: '#EDF2F7', borderRadius: 12, height: 52, paddingHorizontal: 16, justifyContent: 'center' },
  readonlyText: { color: '#4A5568', fontSize: 16, fontWeight: '600' },
  hint: { color: '#718096', fontSize: 11, marginTop: 6, lineHeight: 16 },
  button: { backgroundColor: '#3C3985', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 32 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  outlineButton: { padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#3C3985', marginTop: 12, marginBottom: 40 },
  outlineText: { color: '#3C3985', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
