import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles } from '../theme/styles';
import { api } from '../services/api/client';

export const FundDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { schemeCode } = route.params || {};

  const [fund, setFund] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schemeCode) return;
    const fetchDetails = async () => {
      try {
        const data = await api.get(`/funds/${schemeCode}`, { anonymous: true });
        setFund(data);
      } catch (err) {
        Alert.alert('Error', 'Failed to load fund details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [schemeCode]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F8F9FB' }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 40, flexGrow: 1 }}>
        <Pressable onPress={() => navigation.goBack()} style={{ marginBottom: 20 }}>
          <Text style={{ color: '#1653B0', fontWeight: 'bold' }}>← Back</Text>
        </Pressable>
        
        {loading ? (
          <ActivityIndicator size="large" color="#1653B0" style={{ marginTop: 50 }} />
        ) : fund ? (
          <View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#102A54', marginBottom: 8 }}>
              {fund.meta?.scheme_name || 'Fund Details'}
            </Text>
            <Text style={{ fontSize: 14, color: '#4A5568', marginBottom: 20 }}>
              {fund.meta?.scheme_category || 'Unknown Category'}
            </Text>

            <View style={localStyles.card}>
              <View style={localStyles.row}>
                <Text style={localStyles.label}>Current NAV</Text>
                <Text style={localStyles.value}>
                  ₹ {fund.data?.[0]?.nav || 'N/A'}
                </Text>
              </View>
              <View style={localStyles.row}>
                <Text style={localStyles.label}>NAV Date</Text>
                <Text style={localStyles.value}>
                  {fund.data?.[0]?.date || 'N/A'}
                </Text>
              </View>
              <View style={[localStyles.row, { borderBottomWidth: 0 }]}>
                <Text style={localStyles.label}>Fund House</Text>
                <Text style={localStyles.value}>
                  {fund.meta?.mutual_fund_family || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={{ textAlign: 'center', marginTop: 50 }}>Fund not found.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  label: {
    fontSize: 14,
    color: '#718096',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#102A54',
  }
});
