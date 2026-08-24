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

  const startKyc = async () => {
    if (!consent || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan) || !name.trim()) {
      return Alert.alert('Complete your details', 'Enter your name, valid PAN, and accept the consent to continue.');
    }
    setKycSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/kyc/start`, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.accessToken}` 
        }, 
        body: JSON.stringify({ userId: authStore.userId, fullName: name.trim(), pan, mobile: phone, consent }) 
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
