import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { styles } from '../theme/styles';
import { Header } from '../components/Header';
import { api, API_URL } from '../services/api/client';
import { authStore } from '../store/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { exitOnboarding } from '../utils/navigation';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';

type KycStartResult = {
  transactionId?: string;
  status?: 'VERIFIED' | 'FAILED' | 'IN_PROGRESS' | 'PENDING' | string;
  failureReason?: string | null;
};

interface KycScreenProps {
  phone?: string;
  name?: string;
  setName?: (name: string) => void;
  pan?: string;
  setPan?: (pan: string) => void;
  consent?: boolean;
  setConsent?: (consent: boolean) => void;
  apiUrl?: string;
}

export const KycScreen = (props: KycScreenProps) => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const [kycSubmitting, setKycSubmitting] = useState(false);
  
  const [localName, setLocalName] = useState('');
  const [localPan, setLocalPan] = useState('');
  const [localConsent, setLocalConsent] = useState(false);
  const [dobDate, setDobDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setLocalName('');
      setLocalPan('');
      setLocalConsent(false);
    }, [])
  );

  const name = props.name ?? localName;
  const setName = props.setName ?? setLocalName;
  const pan = props.pan ?? localPan;
  const setPan = props.setPan ?? setLocalPan;
  const consent = props.consent ?? localConsent;
  const setConsent = props.setConsent ?? setLocalConsent;
  const apiUrl = props.apiUrl ?? API_URL;

  const formattedDob = dobDate ? dobDate.toISOString().split('T')[0] : '';

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDobDate(selectedDate);
    }
  };

  const validate = (): string | null => {
    if (!name.trim()) return 'Enter your full name, exactly as it appears on your PAN card.';
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      return 'Enter a valid 10-character PAN, for example ABCDE1234F (5 letters, 4 digits, 1 letter).';
    }
    if (!formattedDob) return 'Please select your date of birth.';
    if (!consent) return 'Please accept the KYC consent to continue.';
    return null;
  };

  const startKyc = async () => {
    const problem = validate();
    if (problem) return Alert.alert('Check your details', problem);

    setKycSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/kyc/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.accessToken}`
        },
        body: JSON.stringify({ fullName: name.trim(), pan, dob: formattedDob })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'KYC could not be started.');

      // Pre-verification is asynchronous: the first answer is usually IN_PROGRESS, and
      // a 200 is not a pass. Poll briefly so the investor gets the real outcome, which
      // includes whether their KYC is complete at the KRA - the check that decides
      // whether orders will be accepted.
      let outcome: { status?: string; message?: string | null } = result;
      for (let attempt = 0; outcome.status === 'IN_PROGRESS' && attempt < 6; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const poll = await fetch(`${apiUrl}/api/v1/kyc/status`, {
          headers: { Authorization: `Bearer ${authStore.accessToken}` },
        });
        if (poll.ok) outcome = await poll.json();
      }

      // KYC is persisted server-side, so the investor can stop here rather than being
      // held in the funnel until they have also assessed their risk profile.
      const next = [
        { text: 'Later', style: 'cancel' as const, onPress: () => exitOnboarding(navigation) },
        { text: 'Continue', onPress: () => navigation.navigate('RiskAssessment') },
      ];
      if (outcome.status === 'VERIFIED') {
        Alert.alert('KYC verified', 'Your PAN and KYC are verified. You can invest once your profile is complete.', next);
      } else if (outcome.status === 'FAILED') {
        Alert.alert('KYC not verified', outcome.message ?? 'Your details could not be verified.');
      } else {
        Alert.alert(
          'Verification in progress',
          'We are still verifying your PAN and KYC. You can continue, and check the status again from your profile before investing.',
          next,
        );
      }
    } catch (error) {
      Alert.alert('KYC could not be started', error instanceof Error ? error.message : 'Please try again.'); 
    } finally { 
      setKycSubmitting(false); 
    }
  };

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <Header title="Identity verification" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>1</Text>
          <Text style={styles.stepText}>Basic details</Text>
          <Text style={styles.stepMuted}>2-3 minutes</Text>
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
        <Pressable style={[styles.field, { justifyContent: 'center' }]} onPress={() => setShowDatePicker(true)}>
          <Text style={{ color: formattedDob ? '#102A54' : '#A0AEC0', fontSize: 16 }}>
            {formattedDob || 'Select your date of birth'}
          </Text>
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={dobDate || new Date(2000, 0, 1)}
            mode="date"
            is24Hour={true}
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

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
          <Text style={styles.primaryText}>{kycSubmitting ? 'Starting verification...' : 'Verify securely'}</Text>
          <Text style={styles.primaryText}>→</Text>
        </Pressable>
        <Text style={styles.legal}>We never store your PAN in the app. KYC is completed by the secure verification service.</Text>
      </ScrollView>
    </View>
  );
};

export default KycScreen;
