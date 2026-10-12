
import React, { useState } from 'react';
import { SafeAreaView, View, Text, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../theme/styles';
import { api } from '../services/api/client';

export const MinorConsentScreen = () => {
  const navigation = useNavigation<any>();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConsent = async () => {
    setLoading(true);
    try {
      await api.post('/api/v1/minor/guardian/consent', {});
      navigation.navigate('MinorReview');
    } catch (e: any) {
      Alert.alert('Error', 'Error saving consent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F8F9FB' }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#102A54', marginBottom: 24, marginTop: 40 }}>
          Parent / Guardian Consent
        </Text>
        
        <View style={{ backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <Text style={{ color: '#4A5568', marginBottom: 12 }}>I confirm that I am the parent or legal guardian of the minor named in this application.</Text>
          <Text style={{ color: '#4A5568', marginBottom: 12 }}>I authorize the processing of the minor's investment application and related information for the purpose of opening and operating the applicable investment account...</Text>
          <Text style={{ color: '#4A5568' }}>I confirm that the information and documents submitted are accurate.</Text>
        </View>

        <Pressable onPress={() => setAgreed(!agreed)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 40 }}>
          <View style={{ width: 24, height: 24, borderWidth: 2, borderColor: agreed ? '#1653B0' : '#CBD5E0', borderRadius: 4, marginRight: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: agreed ? '#1653B0' : 'transparent' }}>
            {agreed && <Text style={{ color: '#fff', fontWeight: 'bold' }}>✓</Text>}
          </View>
          <Text style={{ flex: 1, color: '#102A54', fontWeight: '500' }}>I have read and agree to the declaration on behalf of the minor.</Text>
        </Pressable>

        <Pressable style={[styles.primaryButton, (loading || !agreed) && styles.primaryDisabled]} onPress={handleConsent} disabled={loading || !agreed}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Accept & Continue</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};
