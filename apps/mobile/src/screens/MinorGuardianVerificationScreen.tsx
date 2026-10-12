
import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles } from '../theme/styles';
import { api } from '../services/api/client';
import { useAuth } from '../store/AuthContext';

export const MinorGuardianVerificationScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { signIn } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const mobile = route.params?.guardianMobile || '';

  const handleVerify = async () => {
    setLoading(true);
    try {
      const data = await api.post<any>('/api/v1/minor/guardian/verify-otp', { mobile, code });
      
      if (data.hasRiskProfile) {
        navigation.navigate('MinorConsent');
      } else {
        if (data.guardianToken) {
          await signIn({ accessToken: data.guardianToken, refreshToken: '', user: { id: 'guardian', mobile } });
          navigation.navigate('RiskAssessment');
        } else {
          Alert.alert('Error', 'Error generating guardian session');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F8F9FB' }]}>
      <StatusBar style="dark" />
      <View style={{ padding: 24, flex: 1 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#102A54', marginBottom: 8, marginTop: 40 }}>
          Verify Guardian
        </Text>
        <Text style={{ color: '#4A5568', marginBottom: 32 }}>We sent a verification code to {mobile}.</Text>

        <TextInput 
          style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, marginBottom: 40, fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
          value={code} 
          onChangeText={setCode} 
          keyboardType="numeric" 
          maxLength={6} 
          placeholder="000000" 
        />

        <Pressable style={[styles.primaryButton, loading && styles.primaryDisabled]} onPress={handleVerify} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Verify & Continue</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};
