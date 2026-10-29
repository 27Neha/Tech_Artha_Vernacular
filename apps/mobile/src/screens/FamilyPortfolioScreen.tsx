import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../components/Header';

/**
 * Family portfolios are not built yet. This screen used to show a sample family
 * ("Sharma Family Wealth" with two named members) to every investor and to report
 * invitations as sent, against /family endpoints that do not exist. Until the feature
 * is built it says so, rather than presenting other people's holdings that are invented.
 */
export const FamilyPortfolioScreen = () => {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="Family portfolio" onBack={() => navigation.goBack()} />
      <View style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.title}>Not available yet</Text>
          <Text style={styles.text}>
            Viewing your family&apos;s investments together is not available yet. Your own holdings are on the
            Portfolio tab.
          </Text>
          <Pressable style={styles.button} onPress={() => navigation.navigate('MainTabs')}>
            <Text style={styles.buttonText}>Go to my portfolio</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  page: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, gap: 8 },
  title: { color: '#102A54', fontSize: 17, fontWeight: '800' },
  text: { color: '#4A5568', fontSize: 14, lineHeight: 21 },
  button: { backgroundColor: '#3C3985', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
