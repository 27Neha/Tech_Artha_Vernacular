import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../theme/styles';
import { Header } from '../components/Header';
import { api } from '../services/api/client';

export const FundsScreen = () => {
  const navigation = useNavigation<any>();
  const [fundQuery, setFundQuery] = useState('');
  const [funds, setFunds] = useState<Array<{ schemeCode: number; schemeName: string }>>([]);
  const [loading, setLoading] = useState(false);

  const searchFunds = async () => {
    if (!fundQuery.trim()) return;
    setLoading(true);
    try {
      // /funds/search answers { source, authoritativeForTransactions, items } - the old
      // code assigned that whole object to an array state, so results never rendered.
      const data = await api.get<{ items: Array<{ schemeCode: number; schemeName: string }> }>(
        `/funds/search?q=${encodeURIComponent(fundQuery.trim())}`,
        { anonymous: true },
      );
      setFunds(data?.items ?? []);
    } catch { 
      Alert.alert('Could not load funds', 'Please check your connection and try again.'); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <Header title="Explore funds" onBack={() => navigation.goBack()} />
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
          <Pressable
            key={fund.schemeCode}
            style={styles.fundCard}
            onPress={() => navigation.navigate('FundDetail', { schemeCode: fund.schemeCode })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.fundName}>{fund.schemeName}</Text>
              <Text style={styles.scheme}>Scheme code · {fund.schemeCode}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
};
