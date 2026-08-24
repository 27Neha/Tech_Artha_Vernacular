import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { styles } from '../theme/styles';
import { Header } from '../components/Header';
import { Screen } from '../types';

interface FundsScreenProps {
  setScreen: (screen: Screen) => void;
  apiUrl: string;
}

export const FundsScreen = ({ setScreen, apiUrl }: FundsScreenProps) => {
  const [fundQuery, setFundQuery] = useState('');
  const [funds, setFunds] = useState<Array<{ schemeCode: number; schemeName: string }>>([]);
  const [loading, setLoading] = useState(false);

  const searchFunds = async () => {
    if (!fundQuery.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/funds/search?q=${encodeURIComponent(fundQuery.trim())}`);
      if (!response.ok) throw new Error('Search failed');
      setFunds(await response.json());
    } catch { 
      Alert.alert('Could not load funds', 'Please check your connection and try again.'); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <Header title="Explore funds" back="home" onBack={setScreen} />
      <View style={styles.page}>
        <Text style={styles.title}>Find a fund</Text>
        <Text style={styles.description}>Search mutual funds and view their latest NAV.</Text>
        <View style={styles.searchRow}>
          <TextInput 
            value={fundQuery} 
            onChangeText={setFundQuery} 
            onSubmitEditing={searchFunds} 
            placeholder="Try HDFC or SBI" 
            style={styles.searchInput} 
          />
          <Pressable onPress={searchFunds} style={styles.searchButton}>
            <Text style={styles.searchText}>Search</Text>
          </Pressable>
        </View>
        {loading && <Text style={styles.loading}>Searching funds…</Text>}
        {funds.map((fund) => (
          <View key={fund.schemeCode} style={styles.fundCard}>
            <View>
              <Text style={styles.fundName}>{fund.schemeName}</Text>
              <Text style={styles.scheme}>Scheme code · {fund.schemeCode}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
};
