import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { styles } from '../theme/styles';
import { Header } from '../components/Header';
import { Screen } from '../types';
import { api } from '../services/api/client';
import { useNavigation } from '@react-navigation/native';

/** POST /api/v1/kyc/start. Note there is no `message` field. */
type KycStartResult = {
  transactionId?: string;
  status?: 'VERIFIED' | 'FAILED' | 'IN_PROGRESS' | 'PENDING' | string;
  failureReason?: string | null;
};

/**
 * Keeps the field in YYYY-MM-DD as the user types, inserting the hyphens for them.
 * Typing them by hand on a phone keyboard is the most common reason the date failed
 * validation - the web form sidesteps this entirely with <input type="date">.
 */
const formatDobInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
};

interface KycScreenProps {
  phone: string;
  name: string;
  setName: (name: string) => void;
  pan: string;
  setPan: (pan: string) => void;
  consent: boolean;
  setConsent: (consent: boolean) => void;
}

export const KycScreen = ({ 
  phone, name, setName, pan, setPan, consent, setConsent 
}: KycScreenProps) => {
  const navigation = useNavigation<any>();
  const [kycSubmitting, setKycSubmitting] = useState(false);
  // Required by KycService.startKyc for non-minors. Kept local because nothing else
  // in the navigator needs it, unlike name/pan which are lifted into App.tsx.
  const [dob, setDob] = useState('');

  /**
   * One message per failing field. A single "Complete your details" for four different
   * problems left no way to tell which one was wrong - usually the date, which has to
   * be typed as YYYY-MM-DD.
   */
  const validate = (): string | null => {
    if (!name.trim()) return 'Enter your full name, exactly as it appears on your PAN card.';
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      return 'Enter a valid 10-character PAN, for example ABCDE1234F (5 letters, 4 digits, 1 letter).';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return 'Enter your date of birth as YYYY-MM-DD, for example 1990-04-23.';
    const parsed = new Date(dob);
    if (Number.isNaN(parsed.getTime()) || parsed > new Date()) return 'That date of birth is not valid.';
    if (!consent) return 'Please accept the KYC consent to continue.';
    return null;
  };

  const startKyc = async () => {
    const problem = validate();
    if (problem) return Alert.alert('Check your details', problem);

    setKycSubmitting(true);
    try {
      // KycController is mounted at 'api/v1/kyc'. Most controllers (auth, funds, goals,
      // risk) are bare, so this prefix is easy to miss.
      //
      // The server identifies the user from the bearer token and reads only these three
      // fields. It also upserts the UserProfile from them, which is what /buckets/:id/invest
      // later requires - so this call is what makes investing possible at all.
      const result = await api.post<KycStartResult>('/api/v1/kyc/start', {
        fullName: name.trim(),
        pan,
        dob,
      });

      // startKyc returns { transactionId, status, providerResponse } and no message field.
      // The screen used to hardcode "KYC Verified / Verification complete!", so a
      // PENDING or FAILED verification was reported to the user as success.
      let status = result?.status ?? 'PENDING';

      // Mirrors the web signup flow: a provider check that has not settled is polled
      // once rather than left showing an in-progress state as though it were final.
      if (status === 'IN_PROGRESS' || status === 'PENDING') {
        try {
          const latest = await api.get<{ status?: string } | null>('/api/v1/kyc/status');
          if (latest?.status) status = latest.status;
        } catch {
          // Keep the status from the start call if the poll itself fails.
        }
      }

      if (status === 'VERIFIED') {
        Alert.alert('KYC verified', 'Your identity has been verified.', [
          { text: 'Continue', onPress: () => navigation.navigate('RiskAssessment') },
        ]);
        return;
      }

      if (status === 'FAILED') {
        Alert.alert(
          'Verification failed',
          result?.failureReason
            ? `Your PAN could not be verified: ${result.failureReason}.`
            : 'Your PAN could not be verified. Please check your details and try again.',
        );
        return;
      }

      Alert.alert('Verification in progress', 'Your PAN is still being verified. You can continue and we will update your status.', [
        { text: 'Continue', onPress: () => navigation.navigate('RiskAssessment') },
      ]);
    } catch (error) {
      Alert.alert('KYC could not be started', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setKycSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <Header title="Identity verification" back="login" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>1</Text>
          <Text style={styles.stepText}>Basic details</Text>
          <Text style={styles.stepMuted}>2–3 minutes</Text>
        </View>
        <Text style={styles.title}>A quick KYC, for your safety.</Text>
        <Text style={styles.description}>Your details are encrypted and verified through our regulated KYC partner.</Text>
        
        <Text style={styles.label}>Full name (as on PAN)</Text>
        <TextInput 
          value={name} 
          onChangeText={setName} 
          placeholder="Enter your full name" 
          style={styles.field} 
          autoCapitalize="words" 
        />
        
        <Text style={styles.label}>PAN number</Text>
        <TextInput 
          value={pan} 
          onChangeText={(value) => setPan(value.toUpperCase())} 
          placeholder="ABCDE1234F" 
          style={styles.field} 
          autoCapitalize="characters" 
          maxLength={10}
        />

        <Text style={styles.label}>Date of birth</Text>
        <TextInput
          value={dob}
          onChangeText={(value) => setDob(formatDobInput(value))}
          placeholder="YYYY-MM-DD"
          style={styles.field}
          maxLength={10}
          keyboardType="number-pad"
        />

        <Pressable style={styles.consent} onPress={() => setConsent(!consent)}>
          <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
            {consent && <Text style={styles.check}>✓</Text>}
          </View>
          <Text style={styles.consentText}>I consent to PAN-based KYC verification and secure processing of my data.</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.primaryButton, (!consent || kycSubmitting) && styles.primaryDisabled]} 
          onPress={startKyc} 
          disabled={kycSubmitting}
        >
          <Text style={styles.primaryText}>{kycSubmitting ? 'Starting verification…' : 'Verify securely'}</Text>
          <Text style={styles.primaryText}>→</Text>
        </Pressable>
        <Text style={styles.legal}>We never store your PAN in the app. KYC is completed by the secure verification service.</Text>
      </ScrollView>
    </SafeAreaView>
  );
};
