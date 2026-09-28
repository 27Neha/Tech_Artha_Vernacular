import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../theme/styles';
import { Header } from '../components/Header';
import { api } from '../services/api/client';

interface HomeScreenProps {
  /** Only present when arriving straight from onboarding; absent for a returning user. */
  name?: string;
}

export const HomeScreen = ({ name }: HomeScreenProps) => {
  const navigation = useNavigation<any>();

  // The name used to come only from MainTabs' route params, but nothing passes them -
  // neither the initial route for a signed-in user nor PlanSummaryScreen's reset. So
  // `name` was undefined and `name.trim()` crashed the screen on launch. The profile is
  // the real source anyway: a returning user never passes through onboarding.
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ profile?: { fullName?: string | null } | null }>('/auth/profile')
      .then((profile) => {
        if (!cancelled) setProfileName(profile?.profile?.fullName ?? null);
      })
      .catch(() => undefined); // A greeting is not worth surfacing an error for.
    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = useMemo(() => {
    const source = (profileName ?? name ?? '').trim();
    return source ? source.split(' ')[0] : 'there';
  }, [profileName, name]);

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
          <Pressable style={styles.lightButton} onPress={() => navigation.navigate('Funds')}>
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
        
        <Pressable style={styles.learningCard} onPress={() => navigation.navigate('Funds')}>
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
