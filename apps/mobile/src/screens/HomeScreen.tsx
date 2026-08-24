import React, { useMemo } from 'react';
import { SafeAreaView, View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { styles } from '../theme/styles';
import { Header } from '../components/Header';
import { Screen } from '../types';

interface HomeScreenProps {
  setScreen: (screen: Screen) => void;
  name: string;
}

export const HomeScreen = ({ setScreen, name }: HomeScreenProps) => {
  const greeting = useMemo(() => (name.trim() ? name.trim().split(' ')[0] : 'there'), [name]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <Header title="TechArtha" />
      <ScrollView contentContainerStyle={styles.home}>
        <Text style={styles.eyebrow}>GOOD MORNING</Text>
        <Text style={styles.homeTitle}>Hello, {greeting} 👋</Text>
        <Text style={styles.homeSub}>Small steps today. A stronger tomorrow.</Text>
        
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>YOUR INVESTMENT JOURNEY</Text>
          <Text style={styles.balance}>₹0</Text>
          <Text style={styles.balanceSub}>Start with as little as ₹100</Text>
          <Pressable style={styles.lightButton} onPress={() => setScreen('funds')}>
            <Text style={styles.lightButtonText}>Explore investments</Text>
          </Pressable>
        </View>
        
        <Text style={styles.sectionTitle}>Start with confidence</Text>
        
        <Pressable 
          style={styles.learningCard} 
          onPress={() => Alert.alert('Money basics', 'A simple 3-minute lesson will be available here.')}
        >
          <Text style={styles.cardIcon}>🌱</Text>
          <View>
            <Text style={styles.cardTitle}>Learn before you invest</Text>
            <Text style={styles.cardSub}>3-minute money basics, in simple language</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
        
        <Pressable style={styles.learningCard} onPress={() => setScreen('funds')}>
          <Text style={styles.cardIcon}>📈</Text>
          <View>
            <Text style={styles.cardTitle}>Explore mutual funds</Text>
            <Text style={styles.cardSub}>Search verified fund information</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
        
        <View style={styles.safety}>
          <Text style={styles.safetyTitle}>🔒 Your information is protected</Text>
          <Text style={styles.safetyText}>KYC and account details are handled securely by our verified service partners.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
