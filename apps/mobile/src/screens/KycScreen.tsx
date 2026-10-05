import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { styles } from '../theme/styles';
import { Header } from '../components/Header';
import { Screen } from '../types';
import { authStore } from '../store/auth';
import { useNavigation } from '@react-navigation/native';

interface KycScreenProps {
  phone: string;
  name: string;
  setName: (name: string) => void;
  pan: string;
  setPan: (pan: string) => void;
  consent: boolean;
  setConsent: (consent: boolean) => void;
  apiUrl: string;
}

export const KycScreen = ({ 
  phone, name, setName, pan, setPan, consent, setConsent, apiUrl 
}: KycScreenProps) => {
  const navigation = useNavigation<any>();
  const [kycSubmitting, setKycSubmitting] = useState(false);
  // Required by KycService.startKyc for non-minors. Kept local because nothing else
  // in the navigator needs it, unlike name/pan which are lifted into App.tsx.
  const [dob, setDob] = useState('');

  const startKyc = async () => {
    if (!consent || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan) || !name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return Alert.alert('Complete your details', 'Enter your name, valid PAN, date of birth, and accept the consent to continue.');
    }
    setKycSubmitting(true);
    try {
      // KycController is mounted at 'api/v1/kyc'. Most controllers (auth, funds, goals,
      // risk) are bare, so this prefix is easy to miss - it is the only reason this
      // call used to 404.
      const response = await fetch(`${apiUrl}/api/v1/kyc/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.accessToken}`
        },
        // The server identifies the user from the bearer token and reads only these
        // three fields; userId/mobile/consent in the body were silently ignored.
        body: JSON.stringify({ fullName: name.trim(), pan, dob })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'KYC could not be started.');
      Alert.alert('KYC Verified', result.message || 'Verification complete!', [
        { text: 'OK', onPress: () => navigation.navigate('RiskAssessment') }
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
          onChangeText={setDob}
          placeholder="YYYY-MM-DD"
          style={styles.field}
          maxLength={10}
          keyboardType="numbers-and-punctuation"
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
