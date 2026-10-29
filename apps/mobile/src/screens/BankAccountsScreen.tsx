import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Header } from '../components/Header';
import { api } from '../services/api/client';

/**
 * The bank account registered on the investment account - read from the gateway via
 * GET /buckets/account-status, masked.
 *
 * This screen used to show a sample "HDFC Bank" account to everyone and to "link" new
 * accounts locally while saying they had been verified by penny drop. Nothing was
 * verified or saved. Until adding a second account is built against the gateway, it
 * shows the one real account and says how it was registered.
 */
type BankAccount = { holderName: string | null; maskedNumber: string | null; ifscCode: string | null; type: string | null };
type Status = { hasInvestmentAccount: boolean; bankAccount: BankAccount | null };

export const BankAccountsScreen = () => {
  const navigation = useNavigation<any>();
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      api
        .get<Status>('/buckets/account-status')
        .then((data) => active && setStatus(data))
        .catch((e) => active && setError(e instanceof Error ? e.message : 'Could not load your bank account.'));
      return () => {
        active = false;
      };
    }, []),
  );

  const bank = status?.bankAccount;

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="Bank accounts" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.page}>
        {!status && !error ? <ActivityIndicator color="#3C3985" style={{ marginTop: 32 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {status && !status.hasInvestmentAccount ? (
          <View style={styles.card}>
            <Text style={styles.title}>No bank account registered yet</Text>
            <Text style={styles.text}>
              Your bank account is registered with the fund house when you make your first investment. Payouts from
              withdrawals are sent to it, and SIP mandates debit it.
            </Text>
            <Pressable style={styles.button} onPress={() => navigation.navigate('Funds')}>
              <Text style={styles.buttonText}>Explore funds</Text>
            </Pressable>
          </View>
        ) : null}

        {status?.hasInvestmentAccount ? (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>REGISTERED WITH THE FUND HOUSE</Text>
            {bank ? (
              <>
                <Text style={styles.title}>{bank.holderName ?? 'Your bank account'}</Text>
                <Text style={styles.text}>Account {bank.maskedNumber ?? '—'}</Text>
                <Text style={styles.text}>IFSC {bank.ifscCode ?? '—'}</Text>
                {bank.type ? <Text style={styles.text}>{bank.type.charAt(0).toUpperCase() + bank.type.slice(1)} account</Text> : null}
              </>
            ) : (
              <Text style={styles.text}>Your bank account details could not be read just now. Please try again shortly.</Text>
            )}
            <Text style={styles.hint}>
              Withdrawals are paid to this account and SIP mandates debit it. To change it, please contact support.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  page: { padding: 20, paddingBottom: 48, gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, gap: 6 },
  eyebrow: { color: '#718096', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  title: { color: '#102A54', fontSize: 16, fontWeight: '800' },
  text: { color: '#4A5568', fontSize: 14, lineHeight: 20 },
  hint: { color: '#718096', fontSize: 12, lineHeight: 18, marginTop: 8 },
  error: { color: '#C53030', fontSize: 14 },
  button: { backgroundColor: '#3C3985', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
