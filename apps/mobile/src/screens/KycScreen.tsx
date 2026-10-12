import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { styles } from '../theme/styles';
import { Header } from '../components/Header';
import { authStore } from '../store/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';

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
  
  // Provide fallback state if props aren't passed via navigator
  const [localName, setLocalName] = useState('');
  const [localPan, setLocalPan] = useState('');
  const [localConsent, setLocalConsent] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setLocalName('');
      setLocalPan('');
      setLocalConsent(false);
    }, [])
  );
  const [dobDate, setDobDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const name = props.name ?? localName;
  const setName = props.setName ?? setLocalName;
  const pan = props.pan ?? localPan;
  const setPan = props.setPan ?? setLocalPan;
  const consent = props.consent ?? localConsent;
  const setConsent = props.setConsent ?? setLocalConsent;
  const apiUrl = props.apiUrl ?? (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000');

  const formattedDob = dobDate ? dobDate.toISOString().split('T')[0] : '';

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDobDate(selectedDate);
    }
  };

  const startKyc = async () => {
    if (!consent || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan) || !name.trim() || !formattedDob) {
      return Alert.alert('Complete your details', 'Enter your name, valid PAN, date of birth, and accept the consent to continue.');
    }
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
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
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
    </SafeAreaView>
  );
};
