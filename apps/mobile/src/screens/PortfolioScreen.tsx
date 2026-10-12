import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View, Pressable, StyleSheet, Alert } from 'react-native';
import { api } from '../services/api/client';
import { styles } from '../theme/styles';
import { StatusBar } from 'expo-status-bar';

type Holding = {
  id?: string;
  schemeName?: string;
  units?: number;
  nav?: string | number;
  navDate?: string;
  currentValue?: number;
  investedValue?: number;
};

type PortfolioResponse = {
  data: {
    totalInvested: number;
    currentValue: number;
    totalReturns?: number;
    holdings: Holding[];
  };
  source: string;
  status: string;
  message?: string;
};

export const PortfolioScreen = () => {
  const [tab, setTab] = useState<'overview' | 'holdings' | 'transactions' | 'sips' | 'statements'>('overview');
  const [investorProfile, setInvestorProfile] = useState('Moderate');
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await api.get<PortfolioResponse>('/portfolio');
      setPortfolio(p);
      const prof = await api.get<any>('/auth/profile');
      if (prof?.riskProfile?.category) {
        setInvestorProfile(prof.riskProfile.category);
      }
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

  const downloadStatement = (type: string) => {
    Alert.alert('Generating PDF', `Initiating download for ${type}...`);
  };

  const data = portfolio?.data;
  const isConnected = portfolio?.source !== 'NOT_CONNECTED';
  const holdings = data?.holdings || [];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
      <StatusBar style="light" />
      
      {/* Header Matching Web */}
      <View style={{ backgroundColor: '#1653B0', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, elevation: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 24 }}>My Portfolio</Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 8, borderColor: '#34d399', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>₹ {data?.currentValue || '0'}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>CURRENT</Text>
          </View>

          <View style={{ flex: 1, marginLeft: 24 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 'bold' }}>AMOUNT INVESTED</Text>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>₹ {data?.totalInvested?.toLocaleString('en-IN') || '0'}</Text>
            
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 'bold' }}>TOTAL RETURNS</Text>
            <View style={{ backgroundColor: 'rgba(52, 211, 153, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' }}>
              <Text style={{ color: '#34d399', fontSize: 12, fontWeight: 'bold' }}>₹ {data?.totalReturns?.toLocaleString('en-IN') || '0'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs matching web */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E2E8F0', elevation: 2 }}>
        {['overview', 'holdings', 'transactions', 'sips', 'statements'].map(t => (
          <Pressable 
            key={t} 
            onPress={() => setTab(t as any)}
            style={{ flex: 1, paddingVertical: 16, borderBottomWidth: 2, borderColor: tab === t ? '#1653B0' : 'transparent', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: tab === t ? '#1653B0' : '#A0AEC0', textTransform: 'uppercase' }}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 24, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        {loading ? (
          <ActivityIndicator color="#1653B0" size="large" />
        ) : (
          <>
            {tab === 'overview' && (
              <View>
                {!isConnected ? (
                  <View style={localStyles.emptyCard}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#102A54', marginBottom: 8 }}>No Portfolio History</Text>
                    <Text style={{ fontSize: 12, color: '#718096', textAlign: 'center' }}>Your portfolio overview will appear here once you make your first investment and the provider confirms it.</Text>
                  </View>
                ) : (
                  <View style={localStyles.card}>
                    <Text style={{ fontWeight: 'bold', color: '#102A54', marginBottom: 16 }}>Detailed Risk</Text>
                    <View style={localStyles.row}>
                      <Text style={localStyles.label}>Investor Risk Profile</Text>
                      <Text style={[localStyles.value, { color: '#102A54' }]}>{investorProfile}</Text>
                    </View>
                    <View style={localStyles.row}>
                      <Text style={localStyles.label}>Portfolio Risk</Text>
                      <Text style={[localStyles.value, { color: '#DD6B20' }]}>{investorProfile}</Text>
                    </View>
                    <View style={[localStyles.row, { borderBottomWidth: 0 }]}>
                      <Text style={localStyles.label}>Risk Alignment</Text>
                      <Text style={[localStyles.value, { color: '#38A169' }]}>Optimal</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {tab === 'holdings' && (
              <View>
                {holdings.length === 0 ? (
                  <View style={localStyles.emptyCard}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#102A54', marginBottom: 8 }}>No Holdings Yet</Text>
                    <Text style={{ fontSize: 12, color: '#718096', textAlign: 'center' }}>Your active investments will appear here.</Text>
                  </View>
                ) : (
                  holdings.map((h, i) => (
                    <View key={i} style={localStyles.card}>
                      <Text style={{ fontWeight: 'bold', color: '#102A54', marginBottom: 12, fontSize: 16 }}>{h.schemeName}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                        <View style={{ width: '45%' }}>
                          <Text style={{ fontSize: 10, color: '#718096' }}>Invested</Text>
                          <Text style={{ fontWeight: 'bold', color: '#102A54' }}>₹ {h.investedValue || 0}</Text>
                        </View>
                        <View style={{ width: '45%' }}>
                          <Text style={{ fontSize: 10, color: '#718096' }}>Current</Text>
                          <Text style={{ fontWeight: 'bold', color: '#38A169' }}>₹ {h.currentValue || 0}</Text>
                        </View>
                        <View style={{ width: '45%' }}>
                          <Text style={{ fontSize: 10, color: '#718096' }}>Units</Text>
                          <Text style={{ fontWeight: 'bold', color: '#102A54' }}>{h.units}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {tab === 'transactions' && (
              <View style={localStyles.emptyCard}>
                <Text style={{ fontSize: 12, color: '#718096' }}>No recent transactions.</Text>
              </View>
            )}

            {tab === 'sips' && (
              <View style={localStyles.emptyCard}>
                <Text style={{ fontSize: 12, color: '#718096' }}>No active SIPs.</Text>
              </View>
            )}

            {tab === 'statements' && (
              <View style={localStyles.card}>
                <Text style={{ fontWeight: 'bold', color: '#102A54', marginBottom: 16 }}>Generate Statements</Text>
                
                <Pressable onPress={() => downloadStatement('Account Statement')} style={localStyles.btnOutline}>
                  <Text style={localStyles.btnText}>Account Statement</Text>
                </Pressable>
                <Pressable onPress={() => downloadStatement('Capital Gains')} style={localStyles.btnOutline}>
                  <Text style={localStyles.btnText}>Capital Gains Statement</Text>
                </Pressable>
                <Pressable onPress={() => downloadStatement('Tax Proof')} style={localStyles.btnOutline}>
                  <Text style={localStyles.btnText}>ELSS Tax Proof (80C)</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const localStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F7FAFC'
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#718096'
  },
  value: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#1653B0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: {
    color: '#1653B0',
    fontWeight: 'bold',
  }
});
