
import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../theme/styles';
import { api } from '../services/api/client';

export const MinorReviewScreen = () => {
  const navigation = useNavigation<any>();
  const [status, setStatus] = useState<any>(null);
  const [kycLoading, setKycLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await api.get('/api/v1/minor/onboarding/status');
        setStatus(data);
      } catch (e) {
        Alert.alert('Error', 'Failed to fetch status');
      }
    };
    fetchStatus();
  }, []);

  const handleStartKyc = async () => {
    setKycLoading(true);
    try {
      const data = await api.post<any>('/api/v1/kyc/start', { fullName: 'Minor Flow', pan: 'DEFAULT123', dob: '2000-01-01' });
      Alert.alert('Status', 'Provider KYC state: ' + data.status);
      navigation.navigate('KYC');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setKycLoading(false);
    }
  };

  if (!status) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: '#F8F9FB', justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1653B0" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F8F9FB' }]}>
      <StatusBar style="dark" />
      <View style={{ padding: 24, flex: 1 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#102A54', marginBottom: 24, marginTop: 40 }}>
          Review Application
        </Text>

        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <Text style={{ color: '#718096', marginBottom: 4 }}>Minor Account ID</Text>
          <Text style={{ color: '#102A54', fontWeight: 'bold', fontSize: 16 }}>{status.minorUserId}</Text>
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 40, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <Text style={{ color: '#718096', marginBottom: 4 }}>Guardian ID</Text>
          <Text style={{ color: '#102A54', fontWeight: 'bold', fontSize: 16 }}>{status.guardianId}</Text>
        </View>

        <Pressable style={[styles.primaryButton, kycLoading && styles.primaryDisabled]} onPress={handleStartKyc} disabled={kycLoading}>
          {kycLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Proceed to KYC</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};
