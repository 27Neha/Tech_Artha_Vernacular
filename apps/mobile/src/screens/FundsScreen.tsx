import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { SearchIcon, CloseIcon, ChevronIcon } from '../components/Icons';

interface FundsScreenProps {
  apiUrl: string;
}

const FILTERS = ['All', 'Conservative', 'Moderate', 'Aggressive'];

export const FundsScreen = ({ apiUrl }: FundsScreenProps) => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState('All');
  
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    fetchFunds();
  }, [debouncedQuery, filter]);

  const fetchFunds = async () => {
    let q = debouncedQuery.trim();
    if (!q) {
      if (filter === 'All') q = 'Index';
      if (filter === 'Conservative') q = 'Debt';
      if (filter === 'Moderate') q = 'Hybrid';
      if (filter === 'Aggressive') q = 'Equity';
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/funds/search?q=${encodeURIComponent(q)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setFunds(data?.items || data || []);
    } catch {
      setFunds([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="" onBack={() => navigation.goBack()} />
      
      <View style={styles.headerBlock}>
        <Text style={styles.headerTitle}>Fund Discovery</Text>
        <View style={styles.searchBox}>
          <View style={styles.searchIcon}><SearchIcon /></View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search mutual funds..."
            style={styles.searchInput}
            placeholderTextColor="#9CA3AF"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <View style={styles.clearIcon}><CloseIcon /></View>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {FILTERS.map(f => (
            <Pressable 
              key={f} 
              onPress={() => setFilter(f)}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {!debouncedQuery && filter === 'All' && (
          <View style={styles.emptyState}>
            <Text style={styles.sectionTitle}>For Your Risk Profile</Text>
            <Text style={styles.sectionSubtitle}>Based on your current profile and goals:</Text>
            <View style={styles.actionRow}>
              <Pressable style={styles.actionPill} onPress={() => navigation.navigate('RiskAssessment')}>
                <Text style={styles.actionPillText}>Re - Risk profiling</Text>
              </Pressable>
              <Pressable style={styles.actionPill} onPress={() => navigation.navigate('GoalSelection')}>
                <Text style={styles.actionPillText}>Set New Goal</Text>
              </Pressable>
            </View>
            <Text style={styles.instruction}>Select a risk category or search above to discover funds.</Text>
          </View>
        )}

        {loading && <Text style={styles.loadingText}>Loading funds...</Text>}
        
        {!loading && funds.map((f, i) => (
          <Pressable key={f.schemeCode || i} style={styles.card} onPress={() => navigation.navigate('FundDetails', { schemeCode: f.schemeCode })}>
            <View style={styles.cardMain}>
              <View style={styles.cardLeft}>
                <Text style={styles.fundName} numberOfLines={2}>{f.schemeName}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{f.schemeCategory || f.schemeType || 'Mutual Fund'}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.navText}>{f.nav ? `₹${f.nav}` : '₹--.--'}</Text>
                <ChevronIcon />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  headerBlock: {
      backgroundColor: '#fff',
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0'
    },
  headerTitle: { color: '#102A54', fontSize: 28, fontWeight: '800', marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  searchIcon: { marginRight: 8 },
  clearIcon: { marginLeft: 8 },
  searchInput: { flex: 1, color: '#102A54', paddingVertical: 12, fontSize: 16 },
  filtersWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filtersScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#3C3985',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  filterTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  emptyState: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#102A54',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  instruction: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  loadingText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 20,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
    paddingRight: 16,
  },
  fundName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 12,
    lineHeight: 20,
  },
  badge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  navText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3C3985',
    marginBottom: 12,
  }
});
