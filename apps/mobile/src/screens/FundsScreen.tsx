import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { SolidTabs } from '../components/SolidTabs';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SearchIcon, CloseIcon, ChevronIcon } from '../components/Icons';
import { API_URL } from '../services/api/apiClient';
import { api } from '../services/api/client';

interface FundsScreenProps {
  apiUrl?: string;
}

const COLLECTIONS = [
  { label: 'Index', query: 'Index' },
  { label: 'Large Cap', query: 'Large Cap' },
  { label: 'Mid Cap', query: 'Mid Cap' },
  { label: 'Small Cap', query: 'Small Cap' },
  { label: 'Flexi Cap', query: 'Flexi Cap' },
  { label: 'Debt', query: 'Debt' },
  { label: 'Hybrid', query: 'Hybrid' },
  { label: 'ELSS', query: 'ELSS' },
];

export const FundsScreen = ({ apiUrl = API_URL }: FundsScreenProps) => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialQuery = route?.params?.query || '';
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedCollection, setSelectedCollection] = useState(initialQuery || 'Index');

  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (route?.params?.query) {
      setQuery(route.params.query);
      setDebouncedQuery(route.params.query);
      setSelectedCollection(route.params.query);
    }
  }, [route?.params?.query]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    fetchFunds();
  }, [debouncedQuery, selectedCollection]);

  const fetchFunds = async () => {
    const q = debouncedQuery.trim() || selectedCollection || 'Index';
    setLoading(true);
    try {
      const data = await api
        .get<{ items?: any[] }>(`/funds/search?q=${encodeURIComponent(q)}`, { anonymous: true })
        .catch(async () => {
          const response = await fetch(`${apiUrl}/funds/search?q=${encodeURIComponent(q)}`);
          return await response.json();
        });

      setFunds(data?.items || (Array.isArray(data) ? data : []));
    } catch {
      setFunds([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <Header onBack={() => navigation.goBack()} />

      <View style={styles.headerBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>Fund Discovery</Text>
          <Pressable
            style={styles.bucketsChip}
            onPress={() => navigation.navigate('InvestmentBuckets')}
          >
            <Text style={styles.bucketsChipText}>Buckets →</Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <View style={styles.searchIcon}>
            <SearchIcon />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search mutual funds..."
            style={styles.searchInput}
            placeholderTextColor="#94A3B8"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <View style={styles.clearIcon}>
                <CloseIcon />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filtersWrapper}>
        <SolidTabs
          scrollable
          testID="funds-collection-tabs"
          tabs={COLLECTIONS.map((col) => ({
            id: col.query,
            label: col.label,
          }))}
          activeTab={query.trim() ? '' : selectedCollection}
          onSelect={(selected) => {
            setQuery('');
            setDebouncedQuery('');
            setSelectedCollection(selected);
          }}
        />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 48 }}>
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color="#36358D" />
            <Text style={styles.loadingText}>Loading fund collection...</Text>
          </View>
        ) : funds.length === 0 ? (
          <Text style={styles.loadingText}>No matching funds found. Try another collection.</Text>
        ) : (
          funds.map((f, i) => (
            <Pressable
              key={f.schemeCode || i}
              style={styles.card}
              onPress={() => navigation.navigate('FundDetail', { schemeCode: f.schemeCode })}
            >
              <View style={styles.cardMain}>
                <View style={styles.cardLeft}>
                  <Text style={styles.fundName} numberOfLines={2}>
                    {f.schemeName}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {f.schemeCategory || f.schemeType || f.category || 'Mutual Fund'}
                      </Text>
                    </View>
                    {f.navDate ? <Text style={styles.navDateText}>{f.navDate}</Text> : null}
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.navText}>
                    {f.nav ? `₹${Number(f.nav).toFixed(2)}` : f.latestNav ? `₹${f.latestNav}` : '—'}
                  </Text>
                  <ChevronIcon />
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7FC' },
  headerBlock: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E8F6',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: { color: '#102A54', fontSize: 22, fontWeight: '900' },
  bucketsChip: {
    backgroundColor: '#EEEDFA',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bucketsChipText: { fontSize: 11.5, fontWeight: '800', color: '#36358D' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7FC',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E4F5',
  },
  searchIcon: { marginRight: 8 },
  clearIcon: { marginLeft: 8 },
  searchInput: { flex: 1, color: '#102A54', paddingVertical: 10, fontSize: 14.5 },
  filtersWrapper: {
    backgroundColor: '#F6F7FC',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0FA',
    paddingVertical: 6,
  },
  filterPill: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#F4F5FB',
  },
  filterPillActive: {
    backgroundColor: '#36358D',
  },
  filterText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterTextActive: { color: '#FFFFFF', fontWeight: '800' },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 14 },
  loaderWrap: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  loadingText: { textAlign: 'center', color: '#64748B', fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cardLeft: { flex: 1 },
  fundName: { fontSize: 13.5, fontWeight: '800', color: '#102A54', marginBottom: 8, lineHeight: 19 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { backgroundColor: '#F4F5FB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  badgeText: { fontSize: 10.5, color: '#475569', fontWeight: '700' },
  navDateText: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  navText: { fontSize: 15, fontWeight: '900', color: '#36358D' },
});

export default FundsScreen;
