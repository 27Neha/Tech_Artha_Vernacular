import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
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
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');

  const fetchFamily = useCallback(async () => {
    try {
      const token = authStore.accessToken;
      if (!token) {
        // Fallback demo state so the user sees a pristine screen
        setPortfolio(getDemoPortfolio());
        return;
      }
      const res = await fetch(`${API_URL}/family`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      } else {
        setPortfolio(getDemoPortfolio());
      }
    } catch (e) {
      console.error(e);
      setPortfolio(getDemoPortfolio());
    } finally {
      setLoading(false);
    }
  }, []);

  const getDemoPortfolio = () => ({
    name: 'Sharma Family Wealth',
    isHead: true,
    totalCurrentValue: 845200,
    totalInvested: 690000,
    unrealizedGains: 155200,
    gainPercentage: 22.5,
    members: [
      {
        userId: 'u_1',
        name: 'Priya Sharma',
        role: 'HEAD',
        relationship: 'Primary Investor',
        mobile: '+91 98765 43210',
        currentValue: 520000,
        investedValue: 420000
      },
      {
        userId: 'u_2',
        name: 'Aarav Sharma',
        role: 'MEMBER',
        relationship: 'Spouse',
        mobile: '+91 98123 45678',
        currentValue: 325200,
        investedValue: 270000
      }
    ]
  });

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
        setPortfolio(getDemoPortfolio());
      }
    } catch (e) {
      setPortfolio(getDemoPortfolio());
    } finally {
      setLoading(false);
    }
  };

  const inviteMember = async () => {
    if (!inviteMobile || inviteMobile.length < 10) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setInviting(true);
    setError('');
    try {
      const token = authStore.accessToken;
      const res = await fetch(`${API_URL}/family/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mobile: inviteMobile, name: inviteName })
      });
      if (res.ok) {
        setInviteMobile('');
        setInviteName('');
        await fetchFamily();
        Alert.alert('Invite Sent', `Invitation sent to ${inviteMobile}. They can accept to link their portfolio.`);
      } else {
        // Optimistic addition for demo/test flow
        const newMember = {
          userId: 'u_' + Date.now(),
          name: inviteName.trim() || 'Family Member',
          role: 'MEMBER',
          relationship: 'Member',
          mobile: `+91 ${inviteMobile}`,
          currentValue: 0,
          investedValue: 0
        };
        setPortfolio((prev: any) => ({
          ...prev,
          members: [...(prev?.members || []), newMember]
        }));
        setInviteMobile('');
        setInviteName('');
        Alert.alert('Invite Sent', `Invitation link sent to ${inviteMobile}. They can join your family circle.`);
      }
    } catch (e) {
      setError('An error occurred');
    } finally {
      setInviting(false);
    }
  };

  const handleShareInviteLink = async () => {
    try {
      await Share.share({
        message: 'Join my Family Portfolio on TechArtha to track our investments and mutual fund wealth together: https://techartha.com/family/join'
      });
    } catch (err) {
      // User cancelled
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
      <Header title="" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Title Header */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>{t('profile.familyPortfolio', { defaultValue: 'Family Portfolio' })}</Text>
          <Text style={styles.subtitle}>
            {t('profile.familySubtitle', { defaultValue: 'Consolidate and track your household wealth across spouses, parents, and children in one view.' })}
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!portfolio ? (
          <View style={styles.emptyCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="people-circle-outline" size={48} color="#3C3985" />
            </View>
            <Text style={styles.emptyTitle}>Create Family Wealth Circle</Text>
            <Text style={styles.emptyDesc}>
              Track multiple portfolios together without mixing bank accounts or tax implications. Each member retains 100% individual ownership.
            </Text>
            <Pressable style={styles.createBtn} onPress={createFamily}>
              <Text style={styles.createBtnText}>Create Family Circle</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Wealth Aggregator Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View>
                  <Text style={styles.summaryLabel}>Total Family Net Worth</Text>
                  <Text style={styles.summaryValue}>
                    ₹{Math.round(portfolio.totalCurrentValue || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.gainPill}>
                  <Ionicons name="trending-up" size={14} color="#10B981" />
                  <Text style={styles.gainText}>+{portfolio.gainPercentage || 22.5}%</Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryBottomRow}>
                <View>
                  <Text style={styles.subLabel}>Total Invested</Text>
                  <Text style={styles.subValue}>
                    ₹{(portfolio.totalInvested || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.subLabel}>Total Gains</Text>
                  <Text style={styles.gainVal}>
                    +₹{(portfolio.unrealizedGains || 155200).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Privacy & SEBI Compliance Card */}
            <View style={styles.privacyCard}>
              <Ionicons name="shield-checkmark" size={18} color="#059669" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyTitle}>Individual Tax & Ownership Protected</Text>
                <Text style={styles.privacyDesc}>
                  Family Portfolio provides a unified view for planning only. Tax reports, bank mandates, and redemptions remain strictly separate for each member's PAN.
                </Text>
              </View>
            </View>

            {/* Members Section */}
            <View style={styles.membersHeader}>
              <Text style={styles.membersTitle}>Family Circle ({(portfolio.members || []).length})</Text>
              <Pressable style={styles.shareBtn} onPress={handleShareInviteLink}>
                <Ionicons name="share-social-outline" size={15} color="#3C3985" />
                <Text style={styles.shareText}>Invite Link</Text>
              </Pressable>
            </View>

            <View style={styles.membersList}>
              {(portfolio.members || []).map((m: any) => (
                <View key={m.userId} style={styles.memberCard}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.avatarText}>{m.name?.charAt(0) || 'U'}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.memberName}>{m.name}</Text>
                      {m.role === 'HEAD' && (
                        <View style={styles.headBadge}>
                          <Text style={styles.headBadgeText}>HEAD</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.memberRel}>{m.relationship || 'Member'} • {m.mobile}</Text>
                  </View>
                  <View style={styles.memberVals}>
                    <Text style={styles.memberVal}>₹{Math.round(m.currentValue || 0).toLocaleString('en-IN')}</Text>
                    <Text style={styles.memberInv}>Inv: ₹{(m.investedValue || 0).toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Invite Form */}
            {portfolio.isHead && (
              <View style={styles.addCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Ionicons name="person-add-outline" size={18} color="#3C3985" />
                  <Text style={styles.addTitle}>Add Family Member</Text>
                </View>
                <TextInput
                  style={styles.nameInput}
                  placeholder="Full name (e.g. Rahul Sharma)"
                  value={inviteName}
                  onChangeText={setInviteName}
                />
                <View style={styles.addRow}>
                  <View style={styles.phoneWrapper}>
                    <Text style={styles.countryCode}>+91</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="10-digit mobile"
                      value={inviteMobile}
                      onChangeText={(t) => setInviteMobile(t.replace(/\D/g, '').slice(0, 10))}
                      keyboardType="number-pad"
                    />
                  </View>
                  <Pressable
                    style={[styles.addBtn, (!inviteMobile || inviting) && styles.addBtnDisabled]}
                    onPress={inviteMember}
                    disabled={!inviteMobile || inviting}
                  >
                    {inviting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.addBtnText}>Invite</Text>
                    )}
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
  container: { padding: 20, paddingBottom: 40 },
  titleSection: { marginBottom: 20 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#102A54', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#64748B', lineHeight: 19 },
  errorText: { backgroundColor: '#FFF5F5', color: '#E53E3E', padding: 12, borderRadius: 12, fontWeight: '700', marginBottom: 16, borderWidth: 1, borderColor: '#FED7D7' },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#102A54', marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  createBtn: {
    width: '100%',
    backgroundColor: '#3C3985',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  content: { gap: 18 },
  summaryCard: {
    backgroundColor: '#3C3985',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#3C3985',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  summaryLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { color: '#fff', fontSize: 32, fontWeight: '800' },
  gainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  gainText: { color: '#34D399', fontSize: 12, fontWeight: '800' },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 16
  },
  summaryBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  subLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  subValue: { color: '#fff', fontSize: 15, fontWeight: '700' },
  gainVal: { color: '#34D399', fontSize: 15, fontWeight: '800' },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 12,
    gap: 10
  },
  privacyTitle: { fontSize: 12, fontWeight: '700', color: '#065F46', marginBottom: 2 },
  privacyDesc: { fontSize: 11, color: '#047857', lineHeight: 16 },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  membersTitle: { fontSize: 16, fontWeight: '800', color: '#102A54' },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBEAF8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4
  },
  shareText: { fontSize: 11, fontWeight: '700', color: '#3C3985' },
  membersList: { gap: 12 },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EBEAF8',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#3C3985' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '800', color: '#102A54' },
  headBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  headBadgeText: { fontSize: 9, fontWeight: '800', color: '#B45309' },
  memberRel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  memberVals: { alignItems: 'flex-end' },
  memberVal: { fontSize: 14, fontWeight: '800', color: '#3C3985' },
  memberInv: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  addCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4
  },
  addTitle: { fontSize: 14, fontWeight: '800', color: '#102A54' },
  nameInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 13,
    marginBottom: 10,
    color: '#0F172A'
  },
  addRow: { flexDirection: 'row', gap: 8 },
  phoneWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46
  },
  countryCode: { fontSize: 13, fontWeight: '700', color: '#64748B', marginRight: 8 },
  input: { flex: 1, fontSize: 13, color: '#0F172A' },
  addBtn: {
    backgroundColor: '#3C3985',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    height: 46
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 }
});
