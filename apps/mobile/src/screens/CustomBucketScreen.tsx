import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../components/Header';
import { SearchIcon } from '../components/Icons';
import { api } from '../services/api/client';
import { DraftFund, autoBalance, readDraft, writeDraft } from '../store/customBucket';

const CATEGORY_FUNDS: Record<string, any[]> = {
  Conservative: [
    { schemeCode: 146716, schemeName: 'ICICI Pru Retirement Fund Hybrid', category: 'Conservative Hybrid' },
    { schemeCode: 101933, schemeName: 'SBI Magnum Gilt Fund', category: 'Gilt Fund' },
    { schemeCode: 118987, schemeName: 'HDFC Corporate Bond Fund', category: 'Corporate Bond' },
    { schemeCode: 119551, schemeName: 'Aditya Birla Sun Life Liquid Fund', category: 'Liquid Fund' },
    { schemeCode: 119934, schemeName: 'Kotak Bond Short Term Fund', category: 'Short Term Debt' },
    { schemeCode: 119428, schemeName: 'Nippon India Liquid Fund', category: 'Liquid Fund' },
  ],
  Moderate: [
    { schemeCode: 120579, schemeName: "ICICI Prudential Children's Fund", category: 'Solution Oriented' },
    { schemeCode: 100119, schemeName: 'HDFC Balanced Advantage Fund', category: 'Dynamic Asset Allocation' },
    { schemeCode: 118968, schemeName: 'HDFC Balanced Advantage Direct', category: 'Dynamic Asset Allocation' },
    { schemeCode: 118490, schemeName: 'SBI Equity Hybrid Fund', category: 'Aggressive Hybrid' },
    { schemeCode: 112090, schemeName: 'Kotak Flexicap Fund', category: 'Flexi Cap Fund' },
    { schemeCode: 118834, schemeName: 'Mirae Asset Hybrid Equity Fund', category: 'Aggressive Hybrid' },
  ],
  Aggressive: [
    { schemeCode: 152365, schemeName: 'ICICI Pru Nifty50 Value 20 Index', category: 'Index Fund' },
    { schemeCode: 122639, schemeName: 'Parag Parikh Flexi Cap Fund', category: 'Flexi Cap Fund' },
    { schemeCode: 125354, schemeName: 'Axis Small Cap Fund', category: 'Small Cap Fund' },
    { schemeCode: 118778, schemeName: 'Nippon India Small Cap Fund', category: 'Small Cap Fund' },
    { schemeCode: 119335, schemeName: 'SBI Small Cap Fund', category: 'Small Cap Fund' },
    { schemeCode: 118989, schemeName: 'HDFC Mid-Cap Opportunities Fund', category: 'Mid Cap Fund' },
  ],
};

export const CustomBucketScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [name, setName] = useState('My Custom Bucket');
  const [funds, setFunds] = useState<DraftFund[]>([]);
  const [saving, setSaving] = useState(false);

  const [searchModal, setSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('Moderate');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (route.params?.funds && Array.isArray(route.params.funds)) {
        const mapped: DraftFund[] = route.params.funds.map((f: any) => ({
          schemeCode: Number(f.schemeCode || f.id),
          name: f.name || f.schemeName || 'Fund',
          category: f.category || 'Mutual Fund',
          allocation: Number(f.allocation || f.percentage) || 0,
        }));
        setFunds(mapped);
        void writeDraft(mapped);
      } else {
        void readDraft().then((draft) => {
          if (!cancelled && draft.length > 0) setFunds(draft);
        });
      }
      return () => {
        cancelled = true;
      };
    }, [route.params?.funds]),
  );

  const persist = (next: DraftFund[]) => {
    setFunds(next);
    void writeDraft(next);
  };

  const totalAllocation = funds.reduce((sum, fund) => sum + (Number(fund.allocation) || 0), 0);
  const is100 = funds.length > 0 && totalAllocation === 100;

  const updateAllocation = (schemeCode: number, valStr: string) => {
    const val = Math.max(0, Math.min(100, parseInt(valStr.replace(/[^0-9]/g, ''), 10) || 0));
    persist(funds.map((f) => (f.schemeCode === schemeCode ? { ...f, allocation: val } : f)));
  };

  const adjustAllocation = (schemeCode: number, diff: number) => {
    const target = funds.find((f) => f.schemeCode === schemeCode);
    if (!target) return;
    const newVal = Math.max(0, Math.min(100, (Number(target.allocation) || 0) + diff));
    persist(funds.map((f) => (f.schemeCode === schemeCode ? { ...f, allocation: newVal } : f)));
  };

  const removeFund = (schemeCode: number) => {
    persist(autoBalance(funds.filter((f) => f.schemeCode !== schemeCode)));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch {
      Alert.alert('Error', 'Failed to search funds');
    } finally {
      setSearching(false);
    }
  };

  const addFund = (fund: any) => {
    const code = Number(fund.schemeCode || fund.id);
    if (funds.find((f) => f.schemeCode === code)) {
      Alert.alert('Info', 'Fund is already in the bucket');
      return;
    }
    const next = [
      ...funds,
      {
        schemeCode: code,
        name: fund.schemeName || fund.name,
        category: fund.category || 'Mutual Fund',
        allocation: 0,
      },
    ];
    persist(autoBalance(next));
    setSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSave = async () => {
    if (!is100) {
      Alert.alert('Error', 'Total allocation must equal exactly 100%');
      return;
    }
    setSaving(true);
    try {
      await api.post('/buckets/custom', {
        name: name.trim() || undefined,
        funds: funds.map((f) => ({
          schemeCode: f.schemeCode,
          name: f.name,
          category: f.category,
          allocation: f.allocation,
        })),
      });
      await writeDraft([]);
      Alert.alert('Success', 'Custom bucket saved successfully!', [
        {
          text: 'Continue',
          onPress: () => navigation.navigate('InvestmentBuckets'),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save custom bucket');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="Custom Bucket" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Bucket Name</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="My Custom Bucket"
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={styles.label}>Fund Allocation (%)</Text>
            <Text style={{ fontSize: 11, color: '#A0AEC0' }}>Must equal 100%</Text>
          </View>

          {funds.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No funds added yet</Text>
              <Text style={styles.emptyText}>Tap below to search or pick funds for your bucket.</Text>
            </View>
          ) : (
            funds.map((f) => (
              <View key={f.schemeCode} style={styles.fundRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.fundName}>{f.name}</Text>
                  {f.category ? <Text style={styles.fundCat}>{f.category}</Text> : null}
                  <Pressable onPress={() => removeFund(f.schemeCode)} style={{ marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: '#E53E3E', fontWeight: '700' }}>Remove</Text>
                  </Pressable>
                </View>
                <View style={styles.allocControl}>
                  <Pressable style={styles.btn} onPress={() => adjustAllocation(f.schemeCode, -1)}>
                    <Text style={styles.btnTxt}>-</Text>
                  </Pressable>
                  <TextInput
                    style={styles.allocInput}
                    value={f.allocation?.toString()}
                    onChangeText={(val) => updateAllocation(f.schemeCode, val)}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                  <Pressable style={styles.btn} onPress={() => adjustAllocation(f.schemeCode, 1)}>
                    <Text style={styles.btnTxt}>+</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          <Pressable
            style={styles.addMoreBtn}
            onPress={() => setSearchModal(true)}
          >
            <Text style={{ fontSize: 18, color: '#3C3985', marginRight: 8, fontWeight: '700' }}>+</Text>
            <Text style={{ fontSize: 14, color: '#3C3985', fontWeight: '700' }}>Add More Funds</Text>
          </Pressable>

          {funds.length > 1 && (
            <Pressable style={styles.splitBtn} onPress={() => persist(autoBalance(funds))}>
              <Text style={styles.splitBtnTxt}>Split Evenly</Text>
            </Pressable>
          )}

          <View style={[styles.totalRow, !is100 ? { backgroundColor: '#FFF5F5' } : {}]}>
            <Text style={styles.totalLabel}>Total Allocation:</Text>
            <Text style={[styles.totalVal, !is100 ? { color: '#E53E3E' } : {}]}>{totalAllocation}%</Text>
          </View>
          {!is100 && (
            <Text style={styles.error}>
              Allocations must total exactly 100%. Currently {totalAllocation}%.
            </Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.saveBtn, (saving || !is100 || funds.length === 0) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || !is100 || funds.length === 0}
        >
          <Text style={styles.saveBtnTxt}>{saving ? 'Saving...' : 'Save & Continue'}</Text>
        </Pressable>
      </View>

      <Modal visible={searchModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
          <Header title="Add Fund" />

          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Pressable onPress={() => setSearchModal(false)} style={{ padding: 4, marginRight: 8, backgroundColor: '#F1F5F9', borderRadius: 20, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20, color: '#4A5568', lineHeight: 22 }}>×</Text>
              </Pressable>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#102A54' }}>Browse & Add Funds</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 12 }}>
                <SearchIcon size={16} />
                <TextInput
                  style={{ flex: 1, padding: 12, fontSize: 15 }}
                  placeholder="Search AMC, scheme name..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                />
              </View>
              <Pressable style={{ backgroundColor: '#3C3985', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 12 }} onPress={handleSearch}>
                <Text style={{ color: 'white', fontWeight: '700' }}>Search</Text>
              </Pressable>
            </View>
          </View>

          {!searchQuery.trim() && (
            <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12 }}>
                {['Conservative', 'Moderate', 'Aggressive'].map((tab) => (
                  <Pressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: activeTab === tab ? '#3C3985' : '#F1F5F9', marginRight: 12 }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === tab ? '#fff' : '#4A5568' }}>{tab}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {searching ? (
            <ActivityIndicator size="large" color="#3C3985" style={{ marginTop: 40 }} />
          ) : (
            <ScrollView style={{ flex: 1 }}>
              {searchQuery.trim()
                ? searchResults.map((res: any, idx) => (
                    <Pressable key={idx} style={styles.searchResultCard} onPress={() => addFund(res)}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#102A54', marginBottom: 4 }}>{res.schemeName}</Text>
                        <Text style={{ fontSize: 11, color: '#A0AEC0' }}>Scheme Code: {res.schemeCode}</Text>
                      </View>
                      <View style={styles.addBtn}><Text style={styles.addBtnTxt}>+ Add</Text></View>
                    </Pressable>
                  ))
                : CATEGORY_FUNDS[activeTab].map((res: any, idx) => (
                    <Pressable key={idx} style={styles.searchResultCard} onPress={() => addFund(res)}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#102A54', marginBottom: 4 }}>{res.schemeName}</Text>
                        <View style={{ backgroundColor: '#EDF2F7', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, color: '#4A5568', fontWeight: '700' }}>{res.category}</Text>
                        </View>
                      </View>
                      <View style={styles.addBtn}><Text style={styles.addBtnTxt}>+ Add</Text></View>
                    </Pressable>
                  ))}
              {!searchQuery.trim() && (
                <Text style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#A0AEC0' }}>Use the search bar to find more mutual funds.</Text>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  container: { padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  label: { fontSize: 13, fontWeight: '700', color: '#718096', textTransform: 'uppercase' },
  nameInput: { fontSize: 16, fontWeight: '700', color: '#102A54', marginBottom: 20, marginTop: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  emptyContainer: { paddingVertical: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#102A54', marginBottom: 4 },
  emptyText: { fontSize: 13, color: '#718096', textAlign: 'center' },
  fundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 16 },
  fundName: { fontSize: 14, fontWeight: '700', color: '#102A54', marginBottom: 4 },
  fundCat: { fontSize: 12, color: '#A0AEC0' },
  allocControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', borderRadius: 8, padding: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  btn: { width: 32, height: 32, backgroundColor: '#EDF2F7', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontSize: 18, fontWeight: 'bold', color: '#4A5568' },
  allocInput: { width: 50, textAlign: 'center', fontSize: 15, fontWeight: '800', color: '#3C3985', padding: 0 },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 12, marginTop: 8 },
  splitBtn: { paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#3C3985', marginTop: 12 },
  splitBtnTxt: { color: '#3C3985', fontWeight: '700', fontSize: 13 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#F0FFF4', borderRadius: 12, marginTop: 16 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#102A54' },
  totalVal: { fontSize: 16, fontWeight: '900', color: '#38A169' },
  error: { color: '#E53E3E', fontSize: 12, marginTop: 8, textAlign: 'center', fontWeight: '600' },
  footer: { padding: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  saveBtn: { backgroundColor: '#3C3985', padding: 18, borderRadius: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  searchResultCard: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: { backgroundColor: '#EBF4FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnTxt: { color: '#3182CE', fontWeight: '800', fontSize: 12 },
});

export default CustomBucketScreen;
