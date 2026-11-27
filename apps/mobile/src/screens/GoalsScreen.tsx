import React, { useState, useCallback, useMemo } from 'react';
import { Header } from '../components/Header';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GoalProgressRing } from '../components/GoalProgressRing';
import { SolidTabs } from '../components/SolidTabs';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { authStore } from '../store/auth';
import { API_URL } from '../services/api/client';
import { useTranslation } from 'react-i18next';

export const GoalsScreen: React.FC<{ showHeader?: boolean }> = ({ showHeader = true }) => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();

  // Tabs: 'active' or 'archived'
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const [activeGoals, setActiveGoals] = useState<any[]>([]);
  const [archivedGoals, setArchivedGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected goal for actions
  const [actionGoal, setActionGoal] = useState<any | null>(null);

  // Modals state
  const [menuVisible, setMenuVisible] = useState(false);
  const [scenarioAModalVisible, setScenarioAModalVisible] = useState(false);
  const [scenarioBModalVisible, setScenarioBModalVisible] = useState(false);
  const [scenarioBConfirmVisible, setScenarioBConfirmVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editPeriod, setEditPeriod] = useState('');
  const [editInflation, setEditInflation] = useState('6');
  const [editError, setEditError] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const fetchGoals = useCallback(async () => {
    try {
      const token = authStore.accessToken;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [resActive, resArchived] = await Promise.all([
        fetch(`${API_URL}/goals?status=active`, { headers }).catch(() => null),
        fetch(`${API_URL}/goals?status=archived`, { headers }).catch(() => null),
      ]);

      if (resActive && resActive.ok) {
        const dataActive = await resActive.json();
        setActiveGoals(Array.isArray(dataActive) ? dataActive : []);
      }
      if (resArchived && resArchived.ok) {
        const dataArchived = await resArchived.json();
        setArchivedGoals(Array.isArray(dataArchived) ? dataArchived : []);
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

  // Calculations for active goals
  const totalTarget = useMemo(
    () => activeGoals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0),
    [activeGoals],
  );
  const totalSaved = useMemo(
    () => activeGoals.reduce((sum, g) => sum + (Number(g.currentSavings || g.currentInvestmentValue) || 0), 0),
    [activeGoals],
  );
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  // Calculations for archived goals
  const archivedTotalTarget = useMemo(
    () => archivedGoals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0),
    [archivedGoals],
  );
  const archivedTotalSaved = useMemo(
    () => archivedGoals.reduce((sum, g) => sum + (Number(g.currentSavings || g.currentInvestmentValue) || 0), 0),
    [archivedGoals],
  );

  // Three-dot menu openers
  const openActionMenu = (goal: any) => {
    setActionGoal(goal);
    setMenuVisible(true);
  };

  const closeActionMenu = () => {
    setMenuVisible(false);
  };

  // 1. View Details
  const handleViewDetails = (goal?: any) => {
    const target = goal || actionGoal;
    closeActionMenu();
    if (target) {
      navigation.navigate('GoalDetails', { goalId: target.id, goalData: target });
    }
  };

  // 2. Edit Goal
  const handleOpenEdit = (goal?: any) => {
    const target = goal || actionGoal;
    closeActionMenu();
    setScenarioBModalVisible(false);
    if (!target) return;
    setActionGoal(target);
    setEditName(target.name || '');
    setEditTarget(target.targetAmount ? String(target.targetAmount) : '');
    setEditPeriod(target.timePeriod ? String(target.timePeriod) : '5');
    setEditInflation(target.inflationRate != null ? String(target.inflationRate) : '6');
    setEditError('');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!actionGoal) return;
    setEditError('');

    const parsedTarget = Number(editTarget);
    const parsedPeriod = Number(editPeriod);
    const parsedInflation = Number(editInflation);

    if (!editName.trim()) {
      setEditError('Please enter a goal milestone name.');
      return;
    }
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setEditError('Please enter a valid target amount greater than zero.');
      return;
    }
    if (isNaN(parsedPeriod) || parsedPeriod <= 0) {
      setEditError('Please enter a valid time horizon in years.');
      return;
    }
    if (isNaN(parsedInflation) || parsedInflation < 0) {
      setEditError('Inflation rate cannot be negative.');
      return;
    }

    setIsActionLoading(true);
    try {
      const token = authStore.accessToken;
      const res = await fetch(`${API_URL}/goals/${actionGoal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: editName.trim(),
          targetAmount: parsedTarget,
          timePeriod: parsedPeriod,
          inflationRate: parsedInflation,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update goal');
      }

      setEditModalVisible(false);
      showToast('Goal updated successfully.');
      fetchGoals();
    } catch (e: any) {
      setEditError(e.message || 'Failed to update goal');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 3. Pause / Resume Goal
  const handleTogglePause = async (goal?: any) => {
    const target = goal || actionGoal;
    closeActionMenu();
    setScenarioBModalVisible(false);
    if (!target) return;

    setIsActionLoading(true);
    const isPaused = target.status === 'PAUSED';
    const endpoint = isPaused ? `/goals/${target.id}/resume` : `/goals/${target.id}/pause`;

    try {
      const token = authStore.accessToken;
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error('Failed to update goal status');
      }

      showToast(
        isPaused
          ? 'Goal resumed successfully.'
          : 'Goal paused. Bank mandates and SIP orders remain safe with your bank.',
      );
      fetchGoals();
    } catch (e) {
      showToast('Unable to update goal status. Please try again.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 4. Delete Goal Entrypoint (Checks for linked investments)
  const handleDeleteTrigger = () => {
    if (!actionGoal) return;
    closeActionMenu();

    const invested = Number(actionGoal.currentSavings || actionGoal.currentInvestmentValue || 0);
    if (invested > 0) {
      // Scenario B: Has linked investments -> show comprehensive warning modal
      setScenarioBModalVisible(true);
    } else {
      // Scenario A: No investments -> show direct confirmation modal
      setScenarioAModalVisible(true);
    }
  };

  // Scenario A Confirm (No investments)
  const handleConfirmScenarioADelete = async () => {
    if (!actionGoal) return;
    setIsActionLoading(true);

    try {
      const token = authStore.accessToken;
      const res = await fetch(`${API_URL}/goals/${actionGoal.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error('Failed to delete goal');
      }

      setScenarioAModalVisible(false);
      showToast('Goal deleted successfully.');
      fetchGoals();
    } catch (e) {
      showToast('Unable to delete goal. Please try again.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Scenario B: Transition from Warning to Secondary Confirmation
  const handleProceedToArchiveConfirm = () => {
    setScenarioBModalVisible(false);
    setScenarioBConfirmVisible(true);
  };

  // Scenario B Confirm (Investments linked -> Safe Archive)
  const handleConfirmScenarioBArchive = async () => {
    if (!actionGoal) return;
    setIsActionLoading(true);

    try {
      const token = authStore.accessToken;
      const res = await fetch(`${API_URL}/goals/${actionGoal.id}/archive`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        // Fallback to DELETE endpoint which handles safe archive internally
        await fetch(`${API_URL}/goals/${actionGoal.id}`, {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
      }

      setScenarioBConfirmVisible(false);
      showToast('Goal removed from active goals. Investments remain preserved in your portfolio.');
      fetchGoals();
    } catch (e) {
      showToast('Unable to archive goal. Please try again.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Restore an Archived Goal
  const handleRestoreGoal = async (goal?: any) => {
    const target = goal || actionGoal;
    closeActionMenu();
    if (!target) return;

    setIsActionLoading(true);
    try {
      const token = authStore.accessToken;
      const res = await fetch(`${API_URL}/goals/${target.id}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error('Failed to restore goal');
      }

      showToast('Goal restored to active goals.');
      fetchGoals();
    } catch (e) {
      showToast('Unable to restore goal. Please try again.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Current list based on active tab
  const displayedGoals = activeTab === 'active' ? activeGoals : archivedGoals;

  return (
    <View style={showHeader ? styles.safe : { flex: 1, width: '100%' }}>
      {showHeader && <StatusBar style="dark" />}
      {showHeader && <Header />}

      {/* Floating Toast Notification */}
      {toast && (
        <View
          style={[
            styles.toastBox,
            toast.type === 'error' ? styles.toastError : styles.toastSuccess,
          ]}
        >
          <Ionicons
            name={
              toast.type === 'error'
                ? 'alert-circle'
                : toast.type === 'info'
                ? 'information-circle'
                : 'checkmark-circle'
            }
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#36358D']} />
        }
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.screenTitle}>My Financial Goals</Text>
            <Text style={styles.screenSubtitle}>Purpose-driven systematic investing</Text>
          </View>
        </View>

        {/* Solid Filled Tabs: Active vs Archived */}
        <View style={styles.tabsWrapper}>
          <SolidTabs
            testID="goals-filter-tabs"
            tabs={[
              { id: 'active', label: 'Active Goals', count: activeGoals.length, icon: 'flag-outline' },
              { id: 'archived', label: 'Archived Goals', count: archivedGoals.length, icon: 'archive-outline' },
            ]}
            activeTab={activeTab}
            onSelect={(id) => setActiveTab(id as 'active' | 'archived')}
          />
        </View>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="small" color="#3C3985" />
            <Text style={styles.loaderText}>Loading your goal milestones...</Text>
          </View>
        ) : activeTab === 'active' && activeGoals.length === 0 ? (
          /* Empty State for Active Goals */
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
        ) : activeTab === 'archived' && archivedGoals.length === 0 ? (
          /* Empty State for Archived Goals */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="archive-outline" size={36} color="#3C3985" />
            </View>
            <Text style={styles.emptyTitle}>No Archived Goals</Text>
            <Text style={styles.emptyDesc}>
              Any goals you archive in the future will be safely kept here with your investment records and original targets. You can restore them anytime.
            </Text>
          </View>
        ) : (
          <>
            {/* Overview Card with 3D Depth */}
            <View style={styles.overviewCard}>
              <Svg
                style={StyleSheet.absoluteFill}
                width="100%"
                height="100%"
                preserveAspectRatio="none"
              >
                <Defs>
                  <LinearGradient id="goalOverviewGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#232262" />
                    <Stop offset="55%" stopColor="#36358D" />
                    <Stop offset="100%" stopColor="#524CB4" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" rx={24} fill="url(#goalOverviewGrad)" />
                <Circle cx="90%" cy="10%" r="90" fill="rgba(255,255,255,0.06)" />
                <Circle cx="12%" cy="95%" r="70" fill="rgba(247,148,29,0.12)" />
              </Svg>
              <View style={styles.heroTopSheen} pointerEvents="none" />

              <View style={styles.overviewTop}>
                <View>
                  <Text style={styles.overviewLabel}>
                    {activeTab === 'active' ? 'TOTAL GOAL TARGETS' : 'ARCHIVED TARGETS'}
                  </Text>
                  <Text style={styles.overviewAmount}>
                    ₹{(activeTab === 'active' ? totalTarget : archivedTotalTarget).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {displayedGoals.length} {activeTab === 'active' ? 'ACTIVE' : 'ARCHIVED'}
                  </Text>
                </View>
              </View>

              <View style={styles.overviewProgressRow}>
                <Text style={styles.overviewProgressLabel}>
                  Accumulated: ₹{(activeTab === 'active' ? totalSaved : archivedTotalSaved).toLocaleString('en-IN')}{' '}
                  {activeTab === 'active' ? `(${overallProgress.toFixed(1)}%)` : ''}
                </Text>
                {activeTab === 'active' && (
                  <Text style={styles.overviewGoalGap}>
                    Gap: ₹{Math.max(0, totalTarget - totalSaved).toLocaleString('en-IN')}
                  </Text>
                )}
              </View>

              {activeTab === 'active' && (
                <View style={styles.overviewProgressBarBg}>
                  <View
                    style={[
                      styles.overviewProgressBarFill,
                      { width: `${Math.min(overallProgress, 100)}%` },
                    ]}
                  />
                </View>
              )}
            </View>

            {/* List of Goal Cards */}
            <View style={styles.goalsList}>
              {displayedGoals.map((g) => {
                const p = g.progressPercentage || (g.targetAmount > 0 ? ((g.currentSavings || 0) / g.targetAmount) * 100 : 0);
                const currentSaved = g.currentSavings || g.currentInvestmentValue || 0;
                const isPaused = g.status === 'PAUSED';
                const isArchived = g.status === 'ARCHIVED';

                return (
                  <Pressable
                    key={g.id}
                    style={[styles.goalCard, isPaused && styles.goalCardPaused]}
                    onPress={() => navigation.navigate('GoalDetails', { goalId: g.id, goalData: g })}
                  >
                    <View style={styles.goalHeader}>
                      <GoalProgressRing
                        percentage={p}
                        size={46}
                        strokeWidth={4.5}
                        color={isPaused ? '#D97706' : '#36358D'}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.titleRow}>
                          <Text style={styles.goalTitle} numberOfLines={1}>
                            {g.name}
                          </Text>
                          {isPaused && (
                            <View style={styles.pausedBadge}>
                              <Ionicons name="pause" size={9} color="#D97706" />
                              <Text style={styles.pausedBadgeText}>PAUSED</Text>
                            </View>
                          )}
                          {isArchived && (
                            <View style={styles.archivedBadge}>
                              <Text style={styles.archivedBadgeText}>ARCHIVED</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.goalMeta}>
                          {g.timePeriod} Years Horizon • {g.bucketName || 'Balanced Bucket'}
                        </Text>
                      </View>

                      {/* Right Section: Target and Three-Dot Menu Trigger */}
                      <View style={styles.targetAndMenuCol}>
                        <Pressable
                          style={styles.threeDotBtn}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          onPress={(e) => {
                            e.stopPropagation();
                            openActionMenu(g);
                          }}
                          accessibilityLabel={`Options for ${g.name}`}
                        >
                          <Ionicons name="ellipsis-vertical" size={18} color="#64748B" />
                        </Pressable>
                        <Text style={styles.goalTarget}>
                          ₹{Number(g.targetAmount).toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.goalTargetLabel}>TARGET</Text>
                      </View>
                    </View>

                    <View style={styles.progressSection}>
                      <View style={styles.progressNumbers}>
                        <Text style={styles.savedAmount}>
                          ₹{currentSaved.toLocaleString('en-IN')} accumulated
                        </Text>
                        <Text style={[styles.percentText, isPaused && { color: '#D97706' }]}>
                          {p.toFixed(1)}%
                        </Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            isPaused && { backgroundColor: '#D97706' },
                            { width: `${Math.min(p, 100)}%` },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.goalFooter}>
                      {g.recommendedSip ? (
                        <Text style={styles.sipText}>
                          {isPaused ? 'Paused SIP: ' : 'Recommended SIP: '}
                          <Text style={{ fontWeight: '800', color: '#102A54' }}>
                            ₹{Math.round(g.recommendedSip).toLocaleString('en-IN')}/mo
                          </Text>
                        </Text>
                      ) : (
                        <Text style={styles.sipText}>
                          {isPaused ? 'SIP Tracking Paused' : 'Systematic investment active'}
                        </Text>
                      )}

                      <View style={styles.detailsLink}>
                        <Text style={styles.detailsText}>View Details</Text>
                        <Ionicons name="chevron-forward" size={13} color="#36358D" />
                      </View>
                    </View>
                  </Pressable>
                );
              })}

              {activeTab === 'active' && (
                <Pressable
                  style={styles.addAnotherGoalBtn}
                  onPress={() => navigation.navigate('GoalSelection')}
                  accessibilityLabel="Plan another goal"
                >
                  <Ionicons name="add-circle-outline" size={18} color="#36358D" />
                  <Text style={styles.addAnotherGoalText}>Plan Another Goal</Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        {/* Educational Tip Box */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb-outline" size={16} color="#3C3985" />
            <Text style={styles.tipTitle}>DISCIPLINED MILESTONE INVESTING</Text>
          </View>
          <Text style={styles.tipBody}>
            When every rupee is linked to a real milestone—such as a child’s degree or retirement—temporary market volatility feels less stressful. Pausing or editing a goal allows you to realign your targets without redeeming or disrupting your invested capital.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ==================================================================== */}
      {/* 1. THREE-DOT CONTEXTUAL ACTION MODAL */}
      {/* ==================================================================== */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeActionMenu}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeActionMenu}>
          <Pressable style={styles.actionSheetCard} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.actionSheetHeader}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.actionSheetTitle} numberOfLines={1}>
                    {actionGoal?.name}
                  </Text>
                  {actionGoal?.status === 'PAUSED' ? (
                    <View style={styles.pausedBadge}>
                      <Text style={styles.pausedBadgeText}>PAUSED</Text>
                    </View>
                  ) : actionGoal?.status === 'ARCHIVED' ? (
                    <View style={styles.archivedBadge}>
                      <Text style={styles.archivedBadgeText}>ARCHIVED</Text>
                    </View>
                  ) : (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionSheetSub}>
                  Target: ₹{Number(actionGoal?.targetAmount || 0).toLocaleString('en-IN')} • {actionGoal?.timePeriod} yrs
                </Text>
              </View>
              <Pressable style={styles.closeRoundBtn} onPress={closeActionMenu}>
                <Ionicons name="close" size={18} color="#64748B" />
              </Pressable>
            </View>

            {/* Actions for Active / Paused Goals */}
            {actionGoal?.status !== 'ARCHIVED' ? (
              <View style={styles.actionList}>
                {/* 1. View Details */}
                <Pressable
                  style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                  onPress={() => handleViewDetails()}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: '#EEEDFA' }]}>
                    <Ionicons name="eye-outline" size={20} color="#36358D" />
                  </View>
                  <View style={styles.actionTextBox}>
                    <Text style={styles.actionLabel}>View Details</Text>
                    <Text style={styles.actionDesc}>Inspect timelines, growth and allocation</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </Pressable>

                {/* 2. Edit Goal */}
                <Pressable
                  style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                  onPress={() => handleOpenEdit()}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: '#EEEDFA' }]}>
                    <Ionicons name="create-outline" size={20} color="#36358D" />
                  </View>
                  <View style={styles.actionTextBox}>
                    <Text style={styles.actionLabel}>Edit Goal</Text>
                    <Text style={styles.actionDesc}>Modify target amount, horizon, or name</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </Pressable>

                {/* 3. Pause / Resume Goal */}
                <Pressable
                  style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                  onPress={() => handleTogglePause()}
                >
                  <View
                    style={[
                      styles.actionIconBox,
                      { backgroundColor: actionGoal?.status === 'PAUSED' ? '#DCFCE7' : '#FEF3C7' },
                    ]}
                  >
                    <Ionicons
                      name={actionGoal?.status === 'PAUSED' ? 'play-circle-outline' : 'pause-circle-outline'}
                      size={20}
                      color={actionGoal?.status === 'PAUSED' ? '#16A34A' : '#D97706'}
                    />
                  </View>
                  <View style={styles.actionTextBox}>
                    <Text
                      style={[
                        styles.actionLabel,
                        { color: actionGoal?.status === 'PAUSED' ? '#16A34A' : '#D97706' },
                      ]}
                    >
                      {actionGoal?.status === 'PAUSED' ? 'Resume Goal' : 'Pause Goal'}
                    </Text>
                    <Text style={styles.actionDesc}>
                      {actionGoal?.status === 'PAUSED'
                        ? 'Reactivate goal tracking and systematic contributions'
                        : 'Pause goal tracking without canceling bank mandates'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </Pressable>

                {/* 4. Delete Goal */}
                <Pressable
                  style={({ pressed }) => [
                    styles.actionItem,
                    styles.actionItemDestructive,
                    pressed && styles.actionItemPressed,
                  ]}
                  onPress={handleDeleteTrigger}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  </View>
                  <View style={styles.actionTextBox}>
                    <Text style={[styles.actionLabel, { color: '#DC2626' }]}>Delete Goal</Text>
                    <Text style={[styles.actionDesc, { color: '#EF4444' }]}>
                      Remove or archive goal with safe investment preservation
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#F87171" />
                </Pressable>
              </View>
            ) : (
              /* Actions for Archived Goals */
              <View style={styles.actionList}>
                {/* 1. View Details */}
                <Pressable
                  style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                  onPress={() => handleViewDetails()}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: '#EEEDFA' }]}>
                    <Ionicons name="eye-outline" size={20} color="#36358D" />
                  </View>
                  <View style={styles.actionTextBox}>
                    <Text style={styles.actionLabel}>View Details</Text>
                    <Text style={styles.actionDesc}>Review original target and historical records</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </Pressable>

                {/* 2. Restore Goal */}
                <Pressable
                  style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                  onPress={() => handleRestoreGoal()}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="refresh-circle-outline" size={20} color="#16A34A" />
                  </View>
                  <View style={styles.actionTextBox}>
                    <Text style={[styles.actionLabel, { color: '#16A34A' }]}>Restore Goal</Text>
                    <Text style={styles.actionDesc}>Reactivate this milestone into your active goals</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ==================================================================== */}
      {/* 2. SCENARIO A MODAL: NO INVESTMENTS LINKED */}
      {/* ==================================================================== */}
      <Modal
        visible={scenarioAModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScenarioAModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setScenarioAModalVisible(false)}>
          <Pressable style={styles.dialogCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dialogIconCircleRed}>
              <Ionicons name="trash-outline" size={28} color="#DC2626" />
            </View>

            <Text style={styles.dialogTitle}>Delete Goal?</Text>
            <Text style={styles.dialogMessage}>
              Are you sure you want to delete this goal? This action will remove the goal from your active goals. You can create a new goal anytime.
            </Text>

            <View style={styles.dialogGoalPill}>
              <Text style={styles.dialogGoalPillName}>{actionGoal?.name}</Text>
              <Text style={styles.dialogGoalPillMeta}>
                Target: ₹{Number(actionGoal?.targetAmount || 0).toLocaleString('en-IN')} • 0 Invested
              </Text>
            </View>

            <View style={styles.dialogButtonsRow}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setScenarioAModalVisible(false)}
                disabled={isActionLoading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.deleteConfirmBtn}
                onPress={handleConfirmScenarioADelete}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteConfirmBtnText}>Delete Goal</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ==================================================================== */}
      {/* 3. SCENARIO B WARNING MODAL: INVESTMENTS ALREADY LINKED */}
      {/* ==================================================================== */}
      <Modal
        visible={scenarioBModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScenarioBModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setScenarioBModalVisible(false)}>
          <Pressable style={styles.scenarioBCard} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.scenarioBHeader}>
                <View style={styles.dialogIconCircleAmber}>
                  <Ionicons name="warning-outline" size={28} color="#D97706" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.scenarioBTitle}>Investments Linked to This Goal</Text>
                  <Text style={styles.scenarioBSubtitle}>Capital Preservation Notice</Text>
                </View>
                <Pressable
                  style={styles.closeRoundBtn}
                  onPress={() => setScenarioBModalVisible(false)}
                >
                  <Ionicons name="close" size={18} color="#64748B" />
                </Pressable>
              </View>

              {/* Warning Notice Box */}
              <View style={styles.warningAlertBox}>
                <Ionicons name="information-circle" size={18} color="#B45309" style={{ marginTop: 2 }} />
                <Text style={styles.warningAlertText}>
                  You have already invested towards this goal. Deleting the goal will not automatically withdraw, redeem or sell your investments. Your existing investments will remain in your portfolio. Any active investment instructions or SIPs linked to this goal may need separate action.
                </Text>
              </View>

              {/* Dynamic Information Breakdown */}
              <View style={styles.metricsBox}>
                <Text style={styles.metricsHeaderTitle}>GOAL INVESTMENT BREAKDOWN</Text>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Goal Name</Text>
                  <Text style={styles.metricValueBold}>{actionGoal?.name}</Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Target Amount</Text>
                  <Text style={styles.metricValue}>
                    ₹{Number(actionGoal?.targetAmount || 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Amount Invested</Text>
                  <Text style={[styles.metricValue, { color: '#36358D', fontWeight: '800' }]}>
                    ₹{Number(actionGoal?.currentSavings || actionGoal?.currentInvestmentValue || 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Current Investment Value</Text>
                  <Text style={[styles.metricValue, { color: '#16A34A', fontWeight: '800' }]}>
                    ₹{Number(actionGoal?.currentSavings || actionGoal?.currentInvestmentValue || 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Remaining Target</Text>
                  <Text style={styles.metricValue}>
                    ₹{Math.max(0, (actionGoal?.targetAmount || 0) - (actionGoal?.currentSavings || 0)).toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Linked Investments</Text>
                  <Text style={styles.metricValue}>1 Holding (Preserved)</Text>
                </View>

                <View style={[styles.metricRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.metricLabel}>Active SIP Status</Text>
                  <Text style={[styles.metricValue, { color: actionGoal?.monthlySip > 0 ? '#102A54' : '#64748B' }]}>
                    {actionGoal?.monthlySip > 0
                      ? actionGoal?.status === 'PAUSED'
                        ? 'SIP Paused'
                        : `Active (₹${Math.round(actionGoal.monthlySip).toLocaleString('en-IN')}/mo)`
                      : 'No Active SIP'}
                  </Text>
                </View>
              </View>

              {/* Linked SIP Warning Banner */}
              {actionGoal?.monthlySip > 0 && (
                <View style={styles.sipNoticeCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="repeat" size={15} color="#36358D" />
                    <Text style={styles.sipNoticeTitle}>Recurring SIP Notice</Text>
                  </View>
                  <Text style={styles.sipNoticeDesc}>
                    Your SIP may continue to deduct until separately cancelled or modified. Deleting a goal does not stop bank mandates or auto-debit.
                  </Text>
                  <Pressable
                    style={styles.manageSipLink}
                    onPress={() => {
                      setScenarioBModalVisible(false);
                      navigation.navigate('ActiveMandates');
                    }}
                  >
                    <Text style={styles.manageSipLinkText}>Manage Bank Mandates & SIPs</Text>
                    <Ionicons name="chevron-forward" size={13} color="#36358D" />
                  </Pressable>
                </View>
              )}

              {/* Statutory Disclaimer */}
              <View style={styles.complianceBox}>
                <Ionicons name="shield-checkmark-outline" size={13} color="#64748B" />
                <Text style={styles.complianceText}>
                  Goal deletion or pausing does not alter your underlying mutual fund holdings, bank mandates, or trigger any redemption or tax liability. Portfolio investments remain subject to market risks.
                </Text>
              </View>

              {/* Choices: Option 1 to Option 4 */}
              <View style={styles.choiceButtonsCol}>
                {/* Option 1: Keep Goal */}
                <Pressable
                  style={styles.primaryChoiceBtn}
                  onPress={() => setScenarioBModalVisible(false)}
                >
                  <Text style={styles.primaryChoiceBtnText}>Keep Goal Active</Text>
                </Pressable>

                {/* Option 2: Edit Goal */}
                <Pressable
                  style={styles.secondaryChoiceBtn}
                  onPress={() => handleOpenEdit()}
                >
                  <Ionicons name="create-outline" size={16} color="#36358D" />
                  <Text style={styles.secondaryChoiceBtnText}>Edit Goal</Text>
                </Pressable>

                {/* Option 3: Pause Goal */}
                <Pressable
                  style={styles.secondaryChoiceBtn}
                  onPress={() => handleTogglePause()}
                >
                  <Ionicons
                    name={actionGoal?.status === 'PAUSED' ? 'play-circle-outline' : 'pause-circle-outline'}
                    size={16}
                    color="#D97706"
                  />
                  <Text style={[styles.secondaryChoiceBtnText, { color: '#D97706' }]}>
                    {actionGoal?.status === 'PAUSED' ? 'Resume Goal Tracking' : 'Pause Goal Tracking'}
                  </Text>
                </Pressable>

                {/* Option 4: Archive / Delete Goal */}
                <Pressable
                  style={styles.archiveChoiceBtn}
                  onPress={handleProceedToArchiveConfirm}
                >
                  <Ionicons name="archive-outline" size={16} color="#DC2626" />
                  <Text style={styles.archiveChoiceBtnText}>Archive / Delete Goal</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ==================================================================== */}
      {/* 4. SCENARIO B SECONDARY CONFIRMATION MODAL */}
      {/* ==================================================================== */}
      <Modal
        visible={scenarioBConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScenarioBConfirmVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setScenarioBConfirmVisible(false)}>
          <Pressable style={styles.dialogCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dialogIconCircleRed}>
              <Ionicons name="shield-outline" size={28} color="#DC2626" />
            </View>

            <Text style={styles.dialogTitle}>Confirm Goal Removal</Text>
            <Text style={styles.dialogMessage}>
              Are you sure you want to remove this goal from your active goals? Your investments will remain in your portfolio. No investment will be redeemed or sold as part of this action.
            </Text>

            <View style={styles.dialogGoalPill}>
              <Text style={styles.dialogGoalPillName}>{actionGoal?.name}</Text>
              <Text style={styles.dialogGoalPillMeta}>
                Accumulated ₹{Number(actionGoal?.currentSavings || actionGoal?.currentInvestmentValue || 0).toLocaleString('en-IN')} stays protected in portfolio
              </Text>
            </View>

            <View style={styles.dialogButtonsRow}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  setScenarioBConfirmVisible(false);
                  setScenarioBModalVisible(true);
                }}
                disabled={isActionLoading}
              >
                <Text style={styles.cancelBtnText}>Go Back</Text>
              </Pressable>
              <Pressable
                style={styles.deleteConfirmBtn}
                onPress={handleConfirmScenarioBArchive}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteConfirmBtnText}>Confirm Archive</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ==================================================================== */}
      {/* 5. QUICK EDIT GOAL MODAL */}
      {/* ==================================================================== */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setEditModalVisible(false)}>
          <Pressable style={styles.editDialogCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.editHeaderRow}>
              <View>
                <Text style={styles.editTitle}>Edit Goal Milestone</Text>
                <Text style={styles.editSubtitle}>Adjust target amount, horizon or name</Text>
              </View>
              <Pressable
                style={styles.closeRoundBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </Pressable>
            </View>

            {editError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={14} color="#DC2626" />
                <Text style={styles.errorBannerText}>{editError}</Text>
              </View>
            ) : null}

            {/* Input 1: Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Goal Name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. Higher Education, Dream Home"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Input 2: Target Amount */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Today's Target Amount (₹)</Text>
              <TextInput
                style={styles.textInput}
                value={editTarget}
                onChangeText={setEditTarget}
                keyboardType="numeric"
                placeholder="e.g. 500000"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Input 3: Horizon */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Time Horizon (Years)</Text>
              <TextInput
                style={styles.textInput}
                value={editPeriod}
                onChangeText={setEditPeriod}
                keyboardType="numeric"
                placeholder="e.g. 5"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Input 4: Expected Inflation */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Expected Inflation Rate (% p.a.)</Text>
              <TextInput
                style={styles.textInput}
                value={editInflation}
                onChangeText={setEditInflation}
                keyboardType="numeric"
                placeholder="e.g. 6"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.editNoticeBox}>
              <Ionicons name="information-circle-outline" size={14} color="#64748B" />
              <Text style={styles.editNoticeText}>
                Updating targets or timeline will automatically re-derive your suggested monthly contribution plan.
              </Text>
            </View>

            <View style={styles.dialogButtonsRow}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
                disabled={isActionLoading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.saveBtn}
                onPress={handleSaveEdit}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7FC' },
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
    backgroundColor: '#36358D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    gap: 4,
    elevation: 2,
    shadowColor: '#36358D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  addGoalText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  addAnotherGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0EFFE',
    borderWidth: 1.5,
    borderColor: '#36358D',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  addAnotherGoalText: {
    color: '#36358D',
    fontWeight: '800',
    fontSize: 14,
  },
  tabsWrapper: {
    marginBottom: 16,
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
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEEDFA',
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
    backgroundColor: '#36358D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  overviewCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTopSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
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
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.8,
  },
  overviewAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  overviewProgressBarFill: {
    height: '100%',
    backgroundColor: '#F7941D',
    borderRadius: 4,
  },
  goalsList: {
    gap: 12,
    marginBottom: 16,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  goalCardPaused: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFEF9',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  goalTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#102A54',
    flexShrink: 1,
  },
  goalMeta: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  targetAndMenuCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  threeDotBtn: {
    padding: 4,
    marginBottom: 2,
  },
  goalTarget: {
    fontSize: 15,
    fontWeight: '900',
    color: '#102A54',
  },
  goalTargetLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  pausedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pausedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.4,
  },
  archivedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  archivedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  activeBadge: {
    backgroundColor: '#EEEDFA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#36358D',
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
    color: '#36358D',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#EEEDFA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#36358D',
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
    color: '#36358D',
  },
  tipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
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
    color: '#36358D',
    letterSpacing: 0.8,
  },
  tipBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },

  /* Modals and Sheets */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 84, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionSheetCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    elevation: 12,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  actionSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionSheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#102A54',
  },
  actionSheetSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 3,
  },
  closeRoundBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionList: {
    gap: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FAFAFD',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  actionItemPressed: {
    backgroundColor: '#F1F5F9',
  },
  actionItemDestructive: {
    backgroundColor: '#FFF8F8',
    borderColor: '#FEE2E2',
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTextBox: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 11,
    color: '#64748B',
  },

  /* Dialogs */
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  dialogIconCircleRed: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  dialogIconCircleAmber: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102A54',
    marginBottom: 8,
    textAlign: 'center',
  },
  dialogMessage: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  dialogGoalPill: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    alignItems: 'center',
  },
  dialogGoalPillName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
  },
  dialogGoalPillMeta: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#475569',
  },
  deleteConfirmBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteConfirmBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Scenario B Warning Modal */
  scenarioBCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    elevation: 14,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
  },
  scenarioBHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  scenarioBTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#102A54',
  },
  scenarioBSubtitle: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '700',
    marginTop: 1,
  },
  warningAlertBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  warningAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
    fontWeight: '600',
  },
  metricsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  metricsHeaderTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#36358D',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#102A54',
  },
  metricValueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#102A54',
  },
  sipNoticeCard: {
    backgroundColor: '#EEEDFA',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D8D6F2',
    marginBottom: 14,
  },
  sipNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#36358D',
  },
  sipNoticeDesc: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 8,
  },
  manageSipLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  manageSipLinkText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#36358D',
    textDecorationLine: 'underline',
  },
  complianceBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  complianceText: {
    flex: 1,
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
  },
  choiceButtonsCol: {
    gap: 8,
    paddingBottom: 6,
  },
  primaryChoiceBtn: {
    backgroundColor: '#36358D',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#36358D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryChoiceBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E8F6',
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryChoiceBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#36358D',
  },
  archiveChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF8F8',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 2,
  },
  archiveChoiceBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },

  /* Quick Edit Dialog */
  editDialogCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    elevation: 14,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  editHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  editTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#102A54',
  },
  editSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#102A54',
  },
  editNoticeBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  editNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#36358D',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Toast Notification */
  toastBox: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    elevation: 10,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  toastSuccess: {
    backgroundColor: '#16A34A',
  },
  toastError: {
    backgroundColor: '#DC2626',
  },
  toastText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
