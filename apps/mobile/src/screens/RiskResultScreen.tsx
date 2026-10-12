import React from 'react';
import { SafeAreaView, View, Text, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles } from '../theme/styles';

export const RiskResultScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { category, score } = route.params || {};

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F8F9FB' }]}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, color: '#4A5568', marginBottom: 16 }}>Your Risk Profile</Text>
        <Text style={{ fontSize: 32, fontWeight: '900', color: '#1653B0', marginBottom: 8, textTransform: 'uppercase' }}>
          {category || 'Moderate'}
        </Text>
        <Text style={{ fontSize: 16, color: '#718096', marginBottom: 40 }}>Score: {score || 'N/A'}</Text>
        
        <Pressable style={[styles.primaryButton, { width: '100%' }]} onPress={() => navigation.navigate('KYC')}>
          <Text style={styles.primaryText}>Proceed to KYC</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};
