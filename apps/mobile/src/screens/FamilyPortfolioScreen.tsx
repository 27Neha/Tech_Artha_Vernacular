import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { authStore } from '../store/auth';
import { Header } from '../components/Header';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const FamilyPortfolioScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [inviteMobile, setInviteMobile] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');

  const fetchFamily = useCallback(async () => {
    try {
      const token = authStore.accessToken;
      if (!token) return;
      const res = await fetch(`${API_URL}/family`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      } else {
        setPortfolio(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFamily();
    }, [fetchFamily])
  );

  const createFamily = async () => {
    setLoading(true);
    try {
      const token = authStore.accessToken;
      const res = await fetch(`${API_URL}/family`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'My Family Portfolio' })
      });
      if (res.ok) {
        await fetchFamily();
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to create family portfolio');
        setLoading(false);
      }
    } catch (e) {
      setError('An error occurred');
      setLoading(false);
    }
  };

  const inviteMember = async () => {
    if (!inviteMobile) return;
    setInviting(true);
    setError('');
    try {
      const token = authStore.accessToken;
      const res = await fetch(`${API_URL}/family/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mobile: inviteMobile })
      });
      if (res.ok) {
        setInviteMobile('');
        await fetchFamily();
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to add member');
      }
    } catch (e) {
      setError('An error occurred');
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title={t('profile.familyPortfolio', { defaultValue: 'Family Portfolio' })} onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3C3985" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title={t('profile.familyPortfolio', { defaultValue: 'Family Portfolio' })} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!portfolio ? (
          <View style={styles.emptyCard}>
            <View style={styles.iconCircle}><Text style={styles.iconText}>dY`"??</Text></View>
            <Text style={styles.emptyTitle}>Create Family Portfolio</Text>
            <Text style={styles.emptyDesc}>Manage and track your entire family's wealth in one place. You will be designated as the Family Head.</Text>
            <Pressable style={styles.createBtn} onPress={createFamily}>
              <Text style={styles.createBtnText}>Create Now</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Family Wealth</Text>
              <Text style={styles.summaryValue}>,1{Math.round(portfolio.totalCurrentValue || 0).toLocaleString('en-IN')}</Text>
              <Text style={styles.summarySub}>,1{(portfolio.totalInvested || 0).toLocaleString('en-IN')} Invested</Text>
            </View>

            <View style={styles.membersHeader}>
              <Text style={styles.membersTitle}>Family Members</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{(portfolio.members || []).length} Members</Text></View>
            </View>

            <View style={styles.membersList}>
              {(portfolio.members || []).map((m: any) => (
                <View key={m.userId} style={styles.memberCard}>
                  <View style={styles.memberAvatar}><Text style={styles.avatarText}>{m.name?.charAt(0) || 'U'}</Text></View>
                  <View style={styles.memberInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={styles.memberName}>{m.name}</Text>
                      {m.role === 'HEAD' && <View style={styles.headBadge}><Text style={styles.headBadgeText}>Head</Text></View>}
                    </View>
                    <Text style={styles.memberMobile}>{m.mobile}</Text>
                  </View>
                  <View style={styles.memberVals}>
                    <Text style={styles.memberVal}>,1{Math.round(m.currentValue || 0).toLocaleString('en-IN')}</Text>
                    <Text style={styles.memberInv}>Inv: ,1{(m.investedValue || 0).toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              ))}
            </View>

            {portfolio.isHead && (
              <View style={styles.addCard}>
                <Text style={styles.addTitle}>Add Family Member</Text>
                <View style={styles.addRow}>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Enter mobile number" 
                    value={inviteMobile} 
                    onChangeText={setInviteMobile} 
                    keyboardType="phone-pad"
                  />
                  <Pressable style={[styles.addBtn, (!inviteMobile || inviting) && styles.addBtnDisabled]} onPress={inviteMember} disabled={!inviteMobile || inviting}>
                    <Text style={styles.addBtnText}>{inviting ? '...' : 'Add'}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  container: { padding: 24, paddingBottom: 40 },
  errorText: { backgroundColor: '#FFF5F5', color: '#E53E3E', padding: 12, borderRadius: 12, fontWeight: '700', marginBottom: 16, borderWidth: 1, borderColor: '#FED7D7' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginTop: 40, borderWidth: 1, borderColor: '#E2E8F0' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EBEBFA', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  iconText: { fontSize: 36 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#102A54', marginBottom: 12 },
  emptyDesc: { fontSize: 14, color: '#718096', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  createBtn: { width: '100%', backgroundColor: '#3C3985', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  content: { gap: 24 },
  summaryCard: { backgroundColor: '#3C3985', borderRadius: 24, padding: 24, shadowColor: '#3C3985', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  summaryValue: { color: '#fff', fontSize: 36, fontWeight: '800', marginBottom: 4 },
  summarySub: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  membersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  membersTitle: { fontSize: 18, fontWeight: '800', color: '#102A54' },
  badge: { backgroundColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#4A5568', textTransform: 'uppercase' },
  membersList: { gap: 12 },
  memberCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  memberAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F7FAFC', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#102A54' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '700', color: '#102A54' },
  headBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  headBadgeText: { fontSize: 9, fontWeight: '800', color: '#B45309', textTransform: 'uppercase' },
  memberMobile: { fontSize: 12, color: '#A0AEC0', marginTop: 2 },
  memberVals: { alignItems: 'flex-end' },
  memberVal: { fontSize: 15, fontWeight: '800', color: '#3C3985' },
  memberInv: { fontSize: 10, color: '#A0AEC0', marginTop: 2 },
  addCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 16 },
  addTitle: { fontSize: 14, fontWeight: '700', color: '#102A54', marginBottom: 12 },
  addRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, fontWeight: '700' },
  addBtn: { backgroundColor: '#102A54', paddingHorizontal: 24, justifyContent: 'center', borderRadius: 12 },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 }
});
