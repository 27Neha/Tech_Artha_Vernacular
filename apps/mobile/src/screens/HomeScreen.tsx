import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, Pressable, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../theme/styles';
import { api } from '../services/api/client';

const LEARN_CARDS = [
  { icon: '📚', title: 'What is a Mutual Fund?', desc: 'Learn how pooled investments work and why they are great for beginners.', time: '5 min read' },
  { icon: '⚖️', title: 'SIP vs Lump Sum', desc: 'Which investment approach suits your financial situation better?', time: '4 min read' },
];

export const HomeScreen = ({ name }: { name?: string }) => {
  const navigation = useNavigation<any>();

  const [profileName, setProfileName] = useState<string | null>(null);
  const [profile, setProfile] = useState('');
  const [recommendedFunds, setRecommendedFunds] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState({ totalInvested: 0, currentValue: 0, holdings: [] });
  const [fetchingPortfolio, setFetchingPortfolio] = useState(true);
  const [sipPlans, setSipPlans] = useState<any[]>([]);
  const [fetchingSips, setFetchingSips] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      try {
        const [profileRes, portRes, invRes, bucketsRes] = await Promise.all([
          api.get<any>('/auth/profile'),
          api.get<any>('/portfolio'),
          api.get<any>('/buckets/investments'),
          api.get<any>('/buckets')
        ]);

        if (cancelled) return;

        setProfileName(profileRes?.profile?.fullName ?? null);
        if (profileRes?.riskProfile?.category) {
          setProfile(profileRes.riskProfile.category.charAt(0).toUpperCase() + profileRes.riskProfile.category.slice(1).toLowerCase());
        }

        if (portRes?.data) setPortfolio(portRes.data);
        if (invRes?.plans) setSipPlans(invRes.plans);

        const recBucket = bucketsRes?.buckets?.find((b: any) => b.recommended);
        if (recBucket?.funds) setRecommendedFunds(recBucket.funds);

      } catch (err) {
        // ignore
      } finally {
        if (!cancelled) {
          setFetchingPortfolio(false);
          setFetchingSips(false);
        }
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
      <StatusBar style="light" />
      
      {/* Primary Dashboard Card (Purple) */}
      <View style={{ backgroundColor: '#102A54', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 32, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
        <Text style={{ fontSize: 24, color: '#fff', fontWeight: '900', marginBottom: 24 }}>
          Hello, {profileName ? profileName.split(' ')[0] : 'Investor'}! 👋
        </Text>
        
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 }}>TOTAL INVESTED</Text>
        <Text style={{ fontSize: 40, fontWeight: '900', color: '#fff', marginBottom: 8 }}>
          {fetchingPortfolio ? '₹ ...' : `₹ ${portfolio.totalInvested.toLocaleString('en-IN')}`}
        </Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
          {fetchingPortfolio ? 'Calculating returns...' : `Current value: ₹ ${portfolio.currentValue.toLocaleString('en-IN')}`}
        </Text>

        <Pressable 
          style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, marginTop: 24, alignItems: 'center' }}
          onPress={() => navigation.navigate('GoalSelection')}
        >
          <Text style={{ color: '#102A54', fontWeight: '900', fontSize: 16 }}>Set a new goal →</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 80 }}>
        
        {/* SIP Plans / Orders */}
        {!fetchingSips && sipPlans.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#102A54', marginBottom: 12 }}>Your Orders</Text>
            {sipPlans.map(plan => (
              <View key={plan.id} style={localStyles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontWeight: 'bold', color: '#102A54', flex: 1 }}>{plan.fundName || 'Investment'}</Text>
                  <Text style={{ fontWeight: 'bold', color: '#38A169' }}>₹ {plan.amount}</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#718096', textTransform: 'uppercase' }}>{plan.statusLabel || 'PROCESSING'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommended Funds */}
        {recommendedFunds.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#102A54', marginBottom: 4 }}>Recommended for You</Text>
            <Text style={{ fontSize: 12, color: '#718096', marginBottom: 16 }}>Based on your {profile} profile</Text>
            
            {recommendedFunds.map((f, i) => (
              <Pressable 
                key={i} 
                style={localStyles.card}
                onPress={() => navigation.navigate('FundDetails', { schemeCode: f.schemeCode })}
              >
                <Text style={{ fontWeight: 'bold', color: '#102A54', marginBottom: 8 }}>{f.name}</Text>
                <Text style={{ fontSize: 12, color: '#718096' }}>{f.category}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Learn Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#102A54', marginBottom: 16 }}>Learn & Grow</Text>
          {LEARN_CARDS.map((card, i) => (
            <View key={i} style={localStyles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 48, height: 48, backgroundColor: '#EEF2FF', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <Text style={{ fontSize: 24 }}>{card.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', color: '#102A54', marginBottom: 4 }}>{card.title}</Text>
                  <Text style={{ fontSize: 12, color: '#718096', marginBottom: 8 }}>{card.desc}</Text>
                  <Text style={{ fontSize: 10, color: '#A0AEC0', fontWeight: 'bold' }}>{card.time}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
};

const localStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  }
});
