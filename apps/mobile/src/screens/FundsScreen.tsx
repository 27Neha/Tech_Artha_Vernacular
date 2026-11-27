import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SearchIcon, CloseIcon, ChevronIcon } from '../components/Icons';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../services/api/apiClient';
import { api } from '../services/api/client';

interface FundsScreenProps {
  apiUrl?: string;
}

export const COLLECTIONS = [
  { id: 'all', label: 'All Funds', query: 'Index' },
  { id: 'index', label: 'Index', query: 'Index' },
  { id: 'large_cap', label: 'Large Cap', query: 'Large Cap' },
  { id: 'mid_cap', label: 'Mid Cap', query: 'Mid Cap' },
  { id: 'small_cap', label: 'Small Cap', query: 'Small Cap' },
  { id: 'flexi_cap', label: 'Flexi Cap', query: 'Flexi Cap' },
  { id: 'debt', label: 'Debt', query: 'Debt' },
  { id: 'hybrid', label: 'Hybrid', query: 'Hybrid' },
  { id: 'elss', label: 'ELSS', query: 'ELSS' },
];

export const FundsScreen = ({ apiUrl = API_URL }: FundsScreenProps) => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialQuery = route?.params?.query || '';
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedCollection, setSelectedCollection] = useState('all');

  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navCache = useRef<Record<string, string>>({});

  useEffect(() => {
    if (route?.params?.query) {
      setQuery(route.params.query);
      setDebouncedQuery(route.params.query);
    }
  }, [route?.params?.query]);

  useEffect(() => {
    if (!query.trim()) {
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    fetchFunds();
  }, [debouncedQuery, selectedCollection]);

  const fetchFunds = async () => {
    let q = debouncedQuery.trim();
    if (!q) {
      const activeCol = COLLECTIONS.find((c) => c.id === selectedCollection) || COLLECTIONS[0];
      q = activeCol.query;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      let rawList: any[] = [];
      try {
        const res = await api.get<{ items?: any[] }>(
          `/funds/search?q=${encodeURIComponent(q)}`,
          { anonymous: true }
        );
        rawList = res?.items || (Array.isArray(res) ? res : []);
      } catch {
        const response = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(q)}`);
        if (response.ok) {
          const json = await response.json();
          rawList = Array.isArray(json) ? json : [];
        } else {
          throw new Error('Could not fetch fund data');
        }
      }

      // Limit initial display to top 30 funds for fast responsiveness
      const topList = rawList.slice(0, 30);
      setFunds(topList);

      // Asynchronously fetch real live NAV for visible items that do not yet have one
      const needsNav = topList.filter((f) => !f.nav && !f.latestNav && f.schemeCode);
      if (needsNav.length > 0) {
        // Fetch top 10 NAVs in parallel
        Promise.all(
          needsNav.slice(0, 10).map(async (item) => {
            const sc = String(item.schemeCode);
            if (navCache.current[sc]) {
              return { schemeCode: item.schemeCode, nav: navCache.current[sc] };
            }
            try {
              const r = await fetch(`https://api.mfapi.in/mf/${sc}/latest`);
              if (r.ok) {
                const jd = await r.json();
                if (jd?.data?.[0]?.nav) {
                  navCache.current[sc] = jd.data[0].nav;
                  return { schemeCode: item.schemeCode, nav: jd.data[0].nav };
                }
              }
            } catch {}
            return null;
          })
        ).then((resolved) => {
          const map = new Map<number, string>();
          resolved.forEach((res) => {
            if (res) map.set(Number(res.schemeCode), res.nav);
          });
          if (map.size > 0) {
            setFunds((prev) =>
              prev.map((f) => (map.has(Number(f.schemeCode)) ? { ...f, nav: map.get(Number(f.schemeCode)) } : f))
            );
          }
        });
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Unable to load mutual funds. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <Header title="" onBack={() => navigation.goBack()} />

      <View style={styles.headerBlock}>
        <Text style={styles.headerTitle}>Explore Funds</Text>
        <View style={styles.searchBox}>
          <View style={styles.searchIcon}>
            <SearchIcon />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search mutual funds by name, AMC..."
            style={styles.searchInput}
            placeholderTextColor="#9CA3AF"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <View style={styles.clearIcon}>
                <CloseIcon />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {/* Collections Row */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {COLLECTIONS.map((c) => {
            const isSelected = selectedCollection === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  setSelectedCollection(c.id);
                  setQuery('');
                }}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
              >
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Risk profile recommendation suggestion if no active query */}
        {!debouncedQuery && selectedCollection === 'all' && (
          <View style={styles.emptyState}>
            <Text style={styles.sectionTitle}>For Your Risk Profile</Text>
            <Text style={styles.sectionSubtitle}>Tailored mutual funds matching your investment strategy:</Text>
            <View style={styles.actionRow}>
              <Pressable style={styles.actionPill} onPress={() => navigation.navigate('RiskAssessment')}>
                <Text style={styles.actionPillText}>Re - Risk Profiling</Text>
              </Pressable>
              <Pressable style={styles.actionPill} onPress={() => navigation.navigate('GoalSelection')}>
                <Text style={styles.actionPillText}>Set New Goal</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Loading Indicator */}
        {loading && funds.length === 0 && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#36358D" />
            <Text style={styles.loadingText}>Fetching real-time mutual fund NAVs...</Text>
          </View>
        )}

        {/* Error State */}
        {errorMsg && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
            <Text style={styles.errorTitle}>Could not load funds</Text>
            <Text style={styles.errorSubtitle}>{errorMsg}</Text>
            <Pressable style={styles.retryBtn} onPress={fetchFunds}>
              <Text style={styles.retryBtnText}>Tap to Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Empty State */}
        {!loading && !errorMsg && funds.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Mutual Funds Found</Text>
            <Text style={styles.emptySubtitle}>
              We couldn't find any funds matching "{query || selectedCollection}". Try exploring another collection or
              checking spelling.
            </Text>
          </View>
        )}

        {/* Funds List */}
        {!errorMsg &&
          funds.map((f, i) => {
            const rawNav = f.nav || f.latestNav;
            const displayNav = rawNav && rawNav !== '0.00' ? `₹${parseFloat(rawNav).toFixed(2)}` : '₹--.--';
            return (
              <Pressable
                key={f.schemeCode ? `fund-${f.schemeCode}` : `f-${i}`}
                style={styles.card}
                onPress={() => navigation.navigate('FundDetail', { schemeCode: f.schemeCode })}
              >
                <View style={styles.cardMain}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.fundName} numberOfLines={2}>
                      {f.schemeName}
                    </Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {f.schemeCategory || f.schemeType || f.category || 'Direct Growth'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.navLabel}>NAV</Text>
                    <Text style={styles.navText}>{displayNav}</Text>
                    <ChevronIcon />
                  </View>
                </View>
              </Pressable>
            );
          })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  headerBlock: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { color: '#102A54', fontSize: 26, fontWeight: '800', marginBottom: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: { marginRight: 8 },
  clearIcon: { marginLeft: 8 },
  searchInput: { flex: 1, color: '#102A54', paddingVertical: 10, fontSize: 15 },
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterPillActive: {
    backgroundColor: '#36358D',
    borderColor: '#36358D',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  filterTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyState: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#36358D',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
    marginTop: 8,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#B91C1C',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#36358D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
    paddingRight: 14,
  },
  fundName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 8,
    lineHeight: 19,
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 70,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  navText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#36358D',
    marginBottom: 4,
  },
});
