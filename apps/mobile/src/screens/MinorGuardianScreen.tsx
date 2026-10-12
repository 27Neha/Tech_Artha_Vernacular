
import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../theme/styles';
import { api } from '../services/api/client';

export const MinorGuardianScreen = () => {
  const navigation = useNavigation<any>();
  const [fullName, setFullName] = useState('');
  const [relationship, setRel] = useState('FATHER');
  const [mobile, setMobile] = useState('');
  const [pan, setPan] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.post('/api/v1/minor/guardian', { fullName, relationship, mobile: '+91' + mobile, pan });
      await api.post('/api/v1/minor/guardian/send-otp', { mobile: '+91' + mobile });
      navigation.navigate('MinorGuardianVerification', { guardianMobile: '+91' + mobile });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error saving guardian details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F8F9FB' }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#102A54', marginBottom: 24, marginTop: 40 }}>
          Who's joining you on your investment journey?
        </Text>
        
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 }}>Relationship</Text>
        <TextInput 
          style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, marginBottom: 24 }}
          value={relationship} 
          onChangeText={setRel} 
          placeholder="FATHER / MOTHER / LEGAL_GUARDIAN" 
        />
        
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 }}>Guardian's Full Name</Text>
        <TextInput 
          style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, marginBottom: 24 }}
          value={fullName} 
          onChangeText={setFullName} 
          placeholder="As per PAN" 
        />

        <Text style={{ fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 }}>Guardian's PAN</Text>
        <TextInput 
          style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, marginBottom: 24 }}
          value={pan} 
          onChangeText={(val) => setPan(val.toUpperCase())} 
          maxLength={10} 
          placeholder="ABCDE1234F" 
          autoCapitalize="characters"
        />

        <Text style={{ fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 }}>Guardian's Mobile</Text>
        <TextInput 
          style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, marginBottom: 40 }}
          value={mobile} 
          onChangeText={setMobile} 
          keyboardType="numeric" 
          maxLength={10} 
          placeholder="10 digit number" 
        />

        <Pressable style={[styles.primaryButton, loading && styles.primaryDisabled]} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Send OTP</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};
