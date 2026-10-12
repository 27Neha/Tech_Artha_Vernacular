import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View, Pressable, StyleSheet, Alert } from 'react-native';
import { api } from '../services/api/client';
import { styles } from '../theme/styles';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

export const InvestmentBucketsScreen = () => {
  const navigation = useNavigation<any>();
  const [buckets, setBuckets] = useState<any[]>([]);
  const [investorProfile, setInvestorProfile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>('/buckets');
      setBuckets(data?.buckets || []);
      setInvestorProfile(data?.investorProfile || null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1653B0" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
      <StatusBar style="dark" />
      <ScrollView 
        contentContainerStyle={{ padding: 24, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#102A54', marginBottom: 8, marginTop: 40 }}>
          Choose your Bucket
        </Text>
        <Text style={{ color: '#718096', marginBottom: 32 }}>
          Based on your profile, here are the investment buckets available for you.
        </Text>

        {investorProfile === 'ASSESSMENT_REQUIRED' ? (
          <View style={localStyles.card}>
            <Text style={{ fontWeight: 'bold', color: '#102A54', marginBottom: 8, textAlign: 'center' }}>Complete your risk assessment first</Text>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('RiskAssessment')}>
              <Text style={styles.primaryText}>Take Assessment</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 24 }}>
            {buckets.map((b: any) => (
              <View key={b.id} style={localStyles.card}>
                {b.recommended && (
                  <View style={localStyles.badge}>
                    <Text style={localStyles.badgeText}>⭐ Match</Text>
                  </View>
                )}
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#102A54', marginBottom: 8 }}>{b.name}</Text>
                <Text style={{ color: '#4A5568', fontSize: 12, marginBottom: 16 }}>{b.description}</Text>

                <View style={localStyles.statsRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: '#718096', fontWeight: 'bold' }}>EXPECTED RETURN</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#38A169' }}>{b.expectedReturn}%</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: '#718096', fontWeight: 'bold' }}>RISK LEVEL</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: b.riskLevel === 'HIGH' ? '#E53E3E' : b.riskLevel === 'MEDIUM' ? '#DD6B20' : '#3182CE' }}>
                      {b.riskLevel}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <Pressable 
                    style={[{ borderWidth: 1, borderColor: '#1653B0', borderRadius: 12, padding: 16, alignItems: 'center' }, { flex: 1 }]} 
                    onPress={() => navigation.navigate('CustomBucket')}
                  >
                    <Text style={{ color: '#1653B0', fontWeight: 'bold' }}>Edit Bucket</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.primaryButton, { flex: 1, marginTop: 0 }]} 
                    onPress={() => navigation.navigate('Plan', { bucket: b.id, goal: 'wealth', targetAmount: 1500000, timePeriod: 8 })}
                  >
                    <Text style={styles.primaryText}>Select</Text>
                  </Pressable>
                </View>

                <Pressable 
                  style={{ backgroundColor: '#102A54', padding: 16, borderRadius: 12, marginTop: 12, alignItems: 'center' }} 
                  onPress={() => navigation.navigate('Invest', { bucketId: b.id, bucketName: b.name })}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Invest Now (Start SIP)</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const localStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -12,
    right: 24,
    backgroundColor: '#FBD38D',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F6AD55'
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#9C4221'
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7'
  }
});
