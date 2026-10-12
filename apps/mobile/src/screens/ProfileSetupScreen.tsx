import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../theme/styles';
import { api } from '../services/api/client';

export const ProfileSetupScreen = () => {
  const navigation = useNavigation<any>();
  
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('MALE');
  const [age, setAge] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dob && dob.length === 10) {
      const birthDate = new Date(dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge >= 0) {
        setAge(calculatedAge);
      }
    }
  }, [dob]);

  const handleContinue = async () => {
    if (!name || !dob || !gender || age === '') {
      Alert.alert('Missing Fields', 'Please fill in all details.');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/profile', {
        fullName: name,
        dateOfBirth: dob,
        gender: gender,
      });

      if (Number(age) < 18) {
        navigation.navigate('ParentalApproval');
      } else {
        navigation.navigate('RiskAssessment');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F8F9FB' }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#102A54', marginBottom: 8, marginTop: 40 }}>
          Profile Details
        </Text>
        <Text style={{ fontSize: 16, color: '#4A5568', marginBottom: 32 }}>
          We need a few details to personalize your experience.
        </Text>

        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#4A5568', marginBottom: 8 }}>Full Name</Text>
          <TextInput
            style={localStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="E.g. Ramesh Patel"
          />
        </View>

        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#4A5568', marginBottom: 8 }}>Date of Birth (YYYY-MM-DD)</Text>
          <TextInput
            style={localStyles.input}
            value={dob}
            onChangeText={setDob}
            placeholder="2000-12-31"
            maxLength={10}
          />
        </View>

        <View style={{ marginBottom: 40 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#4A5568', marginBottom: 8 }}>Gender</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              style={[localStyles.radio, gender === 'MALE' && localStyles.radioSelected]}
              onPress={() => setGender('MALE')}
            >
              <Text style={[localStyles.radioText, gender === 'MALE' && localStyles.radioTextSelected]}>Male</Text>
            </Pressable>
            <Pressable
              style={[localStyles.radio, gender === 'FEMALE' && localStyles.radioSelected]}
              onPress={() => setGender('FEMALE')}
            >
              <Text style={[localStyles.radioText, gender === 'FEMALE' && localStyles.radioTextSelected]}>Female</Text>
            </Pressable>
          </View>
        </View>

        <Pressable 
          style={[styles.primaryButton, loading && styles.primaryDisabled, { marginTop: 'auto' }]} 
          onPress={handleContinue} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Continue</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#102A54',
  },
  radio: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#3C3985',
    backgroundColor: '#EEF2FF',
  },
  radioText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A5568',
  },
  radioTextSelected: {
    color: '#3C3985',
  }
});
