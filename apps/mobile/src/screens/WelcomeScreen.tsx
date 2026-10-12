import React from 'react';
import { SafeAreaView, View, Text, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { styles } from '../theme/styles';
import { Screen } from '../types';

interface WelcomeScreenProps {
  setScreen: (screen: Screen) => void;
}

import { useNavigation } from '@react-navigation/native';

export const WelcomeScreen = () => {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.safe}>
    <StatusBar style="dark" />
    <View style={styles.welcome}>
      <View style={styles.logoWrapper}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>T</Text>
          <View style={styles.logoAccent} />
        </View>
        <View style={styles.brandContainer}>
          <View style={styles.brandRow}>
            <Text style={styles.brandBlue}>Tech</Text>
            <Text style={styles.brandOrange}>Artha</Text>
          </View>
          <Text style={styles.brandTagline}>FINANCE SIMPLIFIED</Text>
        </View>
      </View>
      <Text style={styles.hero}>Your money,{"\n"}made simple.</Text>
      <Text style={styles.subhero}>Learn, plan and invest with confidence — in a language that feels like home.</Text>
      <View style={styles.trustRow}>
        <Text>🔒 Safe & secure</Text>
        <Text>•</Text>
        <Text>🇮🇳 Made for India</Text>
      </View>
      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.primaryText}>Start your journey</Text>
        <Text style={styles.primaryText}>→</Text>
      </Pressable>
      <Text style={styles.legal}>Mutual fund investments are subject to market risks.</Text>
    </View>
  </SafeAreaView>
  );
};
