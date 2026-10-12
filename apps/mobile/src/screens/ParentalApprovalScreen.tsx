import React from 'react';
import { SafeAreaView, View, Text, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../theme/styles';

export const ParentalApprovalScreen = () => {
  const navigation = useNavigation<any>();
  
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F8F9FB' }]}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#102A54', marginBottom: 16, textAlign: 'center' }}>
          Parental Approval Required
        </Text>
        <Text style={{ fontSize: 16, color: '#4A5568', marginBottom: 32, textAlign: 'center' }}>
          Since you are under 18, we need your parent or guardian to approve your account setup and risk assessment.
        </Text>

        <Pressable 
          style={styles.primaryButton} 
          onPress={() => navigation.navigate('MinorGuardian')} 
        >
          <Text style={styles.primaryText}>Proceed to Guardian Setup</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};
