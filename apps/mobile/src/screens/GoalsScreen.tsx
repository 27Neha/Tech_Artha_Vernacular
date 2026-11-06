import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { authStore } from '../store/auth';
import { API_URL } from '../services/api/client';
import { useTranslation } from 'react-i18next';

export const GoalsScreen: React.FC = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();

  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      const token = authStore.accessToken;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/goals`, { headers });
      if (res.ok) {
        const data = await res.json();
        setGoals(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.log('Error fetching goals', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGoals();
    }, [fetchGoals]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchGoals();
  };

  const totalTarget = goals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
  const totalSaved = goals.reduce(
    (sum, g) => sum + (Number(g.currentSavings || g.currentInvestmentValue) || 0),
    0,
  );
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3C3985']} />
        }
      >
        {/* Section Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.screenTitle}>My Financial Goals</Text>
            <Text style={styles.screenSubtitle}>Purpose-driven systematic investing</Text>
          </View>
          <Pressable
            style={styles.addGoalBtn}
            onPress={() => navigation.navigate('GoalSelection')}
            accessibilityLabel="Create a new goal"
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addGoalText}>Plan Goal</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="small" color="#3C3985" />
            <Text style={styles.loaderText}>Loading your goal milestones...</Text>
          </View>
        ) : goals.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="flag-outline" size={36} color="#3C3985" />
            </View>
            <Text style={styles.emptyTitle}>Your Milestone Journey Starts Here</Text>
            <Text style={styles.emptyDesc}>
              Goal-based investing keeps you disciplined during market ups and downs. Align your monthly SIPs with specific dreams like higher education, a new home, or financial freedom.
            </Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('GoalSelection')}
            >
              <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>Plan Your First Goal</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Goal Overview Card */}
            <View style={styles.overviewCard}>
              <View style={styles.overviewTop}>
                <View>
                  <Text style={styles.overviewLabel}>TOTAL GOAL TARGETS</Text>
                  <Text style={styles.overviewAmount}>
                    ₹{totalTarget.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{goals.length} ACTIVE</Text>
                </View>
              </View>

              <View style={styles.overviewProgressRow}>
                <Text style={styles.overviewProgressLabel}>
                  Accumulated: ₹{totalSaved.toLocaleString('en-IN')} ({overallProgress.toFixed(1)}%)
                </Text>
                <Text style={styles.overviewGoalGap}>
                  Gap: ₹{Math.max(0, totalTarget - totalSaved).toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.overviewProgressBarBg}>
                <View
                  style={[
                    styles.overviewProgressBarFill,
                    { width: `${Math.min(overallProgress, 100)}%` },
                  ]}
                />
              </View>
            </View>

            {/* List of Goals */}
            <View style={styles.goalsList}>
              {goals.map((g) => {
                const p = g.progressPercentage || (g.targetAmount > 0 ? ((g.currentSavings || 0) / g.targetAmount) * 100 : 0);
                const currentSaved = g.currentSavings || g.currentInvestmentValue || 0;
                return (
                  <Pressable
                    key={g.id}
                    style={styles.goalCard}
                    onPress={() => navigation.navigate('GoalDetails', { goalId: g.id, goalData: g })}
                  >
                    <View style={styles.goalHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.goalTitle}>{g.name}</Text>
                        <Text style={styles.goalMeta}>
                          {g.timePeriod} Years Horizon • {g.bucketName || 'Balanced Bucket'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.goalTarget}>₹{Number(g.targetAmount).toLocaleString('en-IN')}</Text>
                        <Text style={styles.goalTargetLabel}>TARGET</Text>
                      </View>
                    </View>

                    <View style={styles.progressSection}>
                      <View style={styles.progressNumbers}>
                        <Text style={styles.savedAmount}>
                          ₹{currentSaved.toLocaleString('en-IN')} accumulated
                        </Text>
                        <Text style={styles.percentText}>{p.toFixed(1)}%</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${Math.min(p, 100)}%` }]} />
                      </View>
                    </View>

                    <View style={styles.goalFooter}>
                      {g.recommendedSip ? (
                        <Text style={styles.sipText}>
                          Recommended SIP: <Text style={{ fontWeight: '800', color: '#102A54' }}>₹{Math.round(g.recommendedSip).toLocaleString('en-IN')}/mo</Text>
                        </Text>
                      ) : (
                        <Text style={styles.sipText}>Systematic investment active</Text>
                      )}
                      <View style={styles.detailsLink}>
                        <Text style={styles.detailsText}>View Details</Text>
                        <Ionicons name="chevron-forward" size={13} color="#3C3985" />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Educational Tip Box */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb-outline" size={16} color="#3C3985" />
            <Text style={styles.tipTitle}>WHY GOAL-BASED INVESTING WORKS</Text>
          </View>
          <Text style={styles.tipBody}>
            When every rupee is linked to a real milestone—such as a child’s degree or retirement—temporary market volatility feels less stressful. You stay focused on your specific timeline rather than daily market noise.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FD' },
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#102A54',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  addGoalBtn: {
    backgroundColor: '#3C3985',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  addGoalText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBEBFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#102A54',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  emptyBtn: {
    backgroundColor: '#3C3985',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  overviewCard: {
    backgroundColor: '#3C3985',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#3C3985',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  overviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  overviewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 0.8,
  },
  overviewAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  overviewProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  overviewProgressLabel: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  overviewGoalGap: {
    fontSize: 11,
    color: '#FDBA74',
    fontWeight: '700',
  },
  overviewProgressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  overviewProgressBarFill: {
    height: '100%',
    backgroundColor: '#F7941E',
    borderRadius: 4,
  },
  goalsList: {
    gap: 12,
    marginBottom: 16,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 2,
  },
  goalMeta: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  goalTarget: {
    fontSize: 16,
    fontWeight: '900',
    color: '#102A54',
  },
  goalTargetLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  savedAmount: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  percentText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#3C3985',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3C3985',
    borderRadius: 3,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sipText: {
    fontSize: 11,
    color: '#64748B',
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C3985',
  },
  tipCard: {
    backgroundColor: '#F8F9FD',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tipTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#3C3985',
    letterSpacing: 0.8,
  },
  tipBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
});
