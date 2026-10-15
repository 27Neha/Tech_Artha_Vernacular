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
import { formatDobInput } from '../utils/date';
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
  /** Present only once an emailed OTP has been verified. */
  email?: string | null;
  profile?: { fullName?: string | null; pan?: string | null; dateOfBirth?: string | null } | null;
};

const maskPan = (pan?: string | null) => (pan ? `${pan.slice(0, 3)}${'X'.repeat(5)}${pan.slice(-2)}` : '—');

export const EditProfileScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mobile, setMobile] = useState('');
  const [pan, setPan] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Email verification. A non-null email on the profile means it was verified by OTP,
  // so there is no separate "verified" flag to keep in step with it.
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const isEmailVerified = !!verifiedEmail && verifiedEmail === email.trim().toLowerCase();

  useEffect(() => {
    let cancelled = false;
    api
      .get<Profile>('/auth/profile')
      .then((data) => {
        if (cancelled) return;
        setMobile(data?.mobile ?? '');
        setPan(data?.profile?.pan ?? null);
        setFullName(data?.profile?.fullName ?? '');
        setVerifiedEmail(data?.email ?? null);
        setEmail(data?.email ?? '');
        setDateOfBirth((data?.profile?.dateOfBirth ?? '').slice(0, 10));
      })
      .catch((e) => Alert.alert('Could not load your profile', e instanceof Error ? e.message : 'Please try again.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const sendEmailOtp = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      return Alert.alert('Check your email', 'Enter a valid email address.');
    }
    setEmailBusy(true);
    try {
      const result = await api.post<{ devOtp?: string }>('/auth/email/send-otp', { email: email.trim() });
      setOtpSent(true);
      // Mirrors the login screen: in development the server returns the code, so a test
      // does not depend on inbox delivery. __DEV__ is false in any release build.
      if (__DEV__ && result?.devOtp) {
        setEmailOtp(result.devOtp);
        Alert.alert('Dev code', `OTP ${result.devOtp} (prefilled - development only)`);
        return;
      }
      Alert.alert('Code sent', `We have emailed a verification code to ${email.trim()}.`);
    } catch (e) {
      Alert.alert('Could not send the code', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setEmailBusy(false);
    }
  };

  const verifyEmailOtp = async () => {
    setEmailBusy(true);
    try {
      const result = await api.post<{ email?: string }>('/auth/email/verify-otp', {
        email: email.trim(),
        otp: emailOtp.trim(),
      });
      setVerifiedEmail(result?.email ?? email.trim().toLowerCase());
      setOtpSent(false);
      setEmailOtp('');
      Alert.alert('Email verified', 'Your email address has been verified.');
    } catch (e) {
      Alert.alert('Verification failed', e instanceof Error ? e.message : 'Please check the code and try again.');
    } finally {
      setEmailBusy(false);
    }
  };

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

        <Text style={styles.label}>Email address</Text>
        {isEmailVerified ? (
          <View style={styles.verifiedRow}>
            <Text style={styles.verifiedText}>{verifiedEmail}</Text>
            <Text style={styles.verifiedBadge}>Verified</Text>
          </View>
        ) : (
          <>
            <TextInput
              value={email}
              onChangeText={(next) => {
                setEmail(next);
                // Changing the address invalidates a code already in flight for the old one.
                if (otpSent) {
                  setOtpSent(false);
                  setEmailOtp('');
                }
              }}
              placeholder="you@example.com"
              placeholderTextColor="#A0AEC0"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!emailBusy}
              style={styles.input}
            />
            {otpSent ? (
              <>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  value={emailOtp}
                  onChangeText={setEmailOtp}
                  placeholder="4-digit code"
                  placeholderTextColor="#A0AEC0"
                  keyboardType="number-pad"
                  maxLength={4}
                  editable={!emailBusy}
                  style={styles.input}
                />
                <Pressable
                  style={[styles.smallButton, (emailBusy || emailOtp.trim().length < 4) && styles.disabled]}
                  onPress={verifyEmailOtp}
                  disabled={emailBusy || emailOtp.trim().length < 4}
                >
                  <Text style={styles.smallButtonText}>{emailBusy ? 'Verifying…' : 'Verify code'}</Text>
                </Pressable>
                <Pressable onPress={sendEmailOtp} disabled={emailBusy}>
                  <Text style={styles.linkText}>Resend code</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={[styles.smallButton, emailBusy && styles.disabled]}
                onPress={sendEmailOtp}
                disabled={emailBusy}
              >
                <Text style={styles.smallButtonText}>{emailBusy ? 'Sending…' : 'Send verification code'}</Text>
              </Pressable>
            )}
          </>
        )}
        {/* The email is saved by the verify call, not by "Save changes" - an unverified
            address is of no use to the AMC, which emails the statements and order
            confirmations SEBI requires us to deliver. */}
        <Text style={styles.hint}>
          {isEmailVerified
            ? 'Statements and order confirmations are sent to this address. Enter a new address below to change it.'
            : 'We need a verified email address to send your account statements and order confirmations.'}
        </Text>

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
  verifiedRow: { backgroundColor: '#EDF7EE', borderWidth: 1, borderColor: '#BFE3C2', borderRadius: 12, minHeight: 52, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  verifiedText: { color: '#102A54', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  verifiedBadge: { color: '#2F7D32', fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  smallButton: { backgroundColor: '#3C3985', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  smallButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  linkText: { color: '#3C3985', fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 12 },
  button: { backgroundColor: '#3C3985', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 32 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  outlineButton: { padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#3C3985', marginTop: 12, marginBottom: 40 },
  outlineText: { color: '#3C3985', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
