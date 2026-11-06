import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { registerCustomBackHandler, handleGlobalBack } from '../navigation/navigationService';

export interface GoalCategoryItem {
  id: string;
  icon: string;
  name: string;
  desc: string;
  defaultHorizon: string;
  defaultAmount: string;
}

export const GOALS: GoalCategoryItem[] = [
  {
    id: 'education',
    icon: '🎓',
    name: 'Child Education',
    desc: 'Build an educational corpus for higher studies and university fees.',
    defaultHorizon: '10',
    defaultAmount: '2000000',
  },
  {
    id: 'marriage',
    icon: '💍',
    name: 'Marriage',
    desc: 'Plan systematically for wedding expenses and family celebrations.',
    defaultHorizon: '5',
    defaultAmount: '1500000',
  },
  {
    id: 'home',
    icon: '🏠',
    name: 'Home Purchase',
    desc: 'Accumulate a down payment for your dream house or apartment.',
    defaultHorizon: '7',
    defaultAmount: '2500000',
  },
  {
    id: 'retirement',
    icon: '🌴',
    name: 'Retirement Fund',
    desc: 'Create an inflation-protected nest egg for post-retirement freedom.',
    defaultHorizon: '20',
    defaultAmount: '10000000',
  },
  {
    id: 'vehicle',
    icon: '🚗',
    name: 'Vehicle',
    desc: 'Save for your dream car, bike, or personal vehicle without high debt.',
    defaultHorizon: '3',
    defaultAmount: '800000',
  },
  {
    id: 'emergency',
    icon: '🛡️',
    name: 'Emergency Fund',
    desc: 'Set aside 6–12 months of living expenses for contingencies.',
    defaultHorizon: '2',
    defaultAmount: '500000',
  },
  {
    id: 'wealth',
    icon: '🎯',
    name: 'Wealth Creation',
    desc: 'Compound long-term wealth through disciplined equity investing.',
    defaultHorizon: '10',
    defaultAmount: '5000000',
  },
  {
    id: 'vacation',
    icon: '✈️',
    name: 'Dream Vacation',
    desc: 'Fund domestic and international travel holidays without financial stress.',
    defaultHorizon: '2',
    defaultAmount: '300000',
  },
  {
    id: 'business',
    icon: '🏢',
    name: 'Start a Business',
    desc: 'Seed capital to kickstart your entrepreneurial venture.',
    defaultHorizon: '5',
    defaultAmount: '2000000',
  },
  {
    id: 'renovation',
    icon: '🔨',
    name: 'Home Renovation',
    desc: 'Remodel, furnish, or upgrade your living space.',
    defaultHorizon: '3',
    defaultAmount: '600000',
  },
  {
    id: 'debt',
    icon: '💳',
    name: 'Debt Payoff',
    desc: 'Systematically pay down loans and become debt-free faster.',
    defaultHorizon: '3',
    defaultAmount: '500000',
  },
  {
    id: 'custom',
    icon: '⚙️',
    name: 'Custom Goal',
    desc: 'Define your own personal milestone and financial target.',
    defaultHorizon: '5',
    defaultAmount: '1000000',
  },
];

const QUICK_AMOUNTS = [
  { label: '₹5 Lakh', value: '500000' },
  { label: '₹10 Lakh', value: '1000000' },
  { label: '₹25 Lakh', value: '2500000' },
  { label: '₹50 Lakh', value: '5000000' },
  { label: '₹1 Crore', value: '10000000' },
];

const QUICK_HORIZONS = ['3', '5', '7', '10', '15', '20'];

export const GoalSelectionScreen: React.FC = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // Steps: 'SELECT' (Step 1 - Pick category) | 'CONFIGURE' (Step 2 - Amount & Horizon)
  const [step, setStep] = useState<'SELECT' | 'CONFIGURE'>('SELECT');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [customGoalName, setCustomGoalName] = useState('');

  // Form inputs
  const [targetAmount, setTargetAmount] = useState('');
  const [timePeriod, setTimePeriod] = useState('');
  const [inflationRate, setInflationRate] = useState('6');
  const [customAdjustments, setCustomAdjustments] = useState<{ name: string; percentage: string }[]>([]);

  // Validation & UI states
  const [errors, setErrors] = useState<{
    goal?: string;
    targetAmount?: string;
    timePeriod?: string;
    inflationRate?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scroll ref for auto-positioning
  const scrollRef = useRef<any>(null);
  const targetAmountLayoutY = useRef<number>(0);
  const horizonLayoutY = useRef<number>(0);

  // Check if route passed initialGoal
  useEffect(() => {
    const initial = route.params?.initialGoal || route.params?.goal;
    if (initial) {
      const match = GOALS.find((g) => g.id === initial);
      if (match) {
        setSelectedGoal(match.id);
        if (!targetAmount) setTargetAmount(match.defaultAmount);
        if (!timePeriod) setTimePeriod(match.defaultHorizon);
        setStep('CONFIGURE');
      }
    }
  }, [route.params]);

  // Current active goal object
  const activeGoalObj = GOALS.find((g) => g.id === selectedGoal) || null;

  // Real-time future value calculation
  const calculateFutureValue = () => {
    const p = Number(targetAmount) || 0;
    const tYears = Number(timePeriod) || 0;
    const r = Number(inflationRate) || 0;
    let inflated = p * Math.pow(1 + r / 100, tYears);
    if (customAdjustments.length > 0) {
      const mult = customAdjustments.reduce(
        (sum, adj) => sum + (Number(adj.percentage) || 0) / 100,
        0,
      );
      inflated *= 1 + mult;
    }
    return inflated;
  };

  const handleSelectCategory = (goalId: string) => {
    setSelectedGoal(goalId);
    setErrors({});
    const match = GOALS.find((g) => g.id === goalId);
    if (match && !targetAmount) {
      setTargetAmount(match.defaultAmount);
    }
    if (match && !timePeriod) {
      setTimePeriod(match.defaultHorizon);
    }
    // Immediately advance to Step 2: Goal Configuration
    setStep('CONFIGURE');
    // Scroll directly to top so the configuration inputs are immediately visible
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 50);
  };

  const handleAddAdjustment = () =>
    setCustomAdjustments([...customAdjustments, { name: 'Safety Buffer', percentage: '10' }]);

  const updateAdjustment = (i: number, f: 'name' | 'percentage', v: string) => {
    const a = [...customAdjustments];
    a[i][f] = v;
    setCustomAdjustments(a);
  };

  const handleContinue = () => {
    if (isSubmitting) return;

    const newErrors: typeof errors = {};

    if (!selectedGoal) {
      newErrors.goal = 'Please select a goal category.';
    }

    if (selectedGoal === 'custom' && !customGoalName.trim()) {
      newErrors.goal = 'Please enter a name for your custom goal.';
    }

    const numAmount = Number(targetAmount);
    if (!numAmount || numAmount <= 0) {
      newErrors.targetAmount = 'Please enter a valid target amount greater than ₹0.';
    }

    const numHorizon = Number(timePeriod);
    if (!numHorizon || numHorizon <= 0) {
      newErrors.timePeriod = 'Please specify an investment horizon of at least 1 year.';
    }

    if (inflationRate.trim() === '' || Number(inflationRate) < 0) {
      newErrors.inflationRate = 'Please enter a valid expected inflation rate (e.g. 6%).';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Auto-position user at the first invalid field
      if (newErrors.targetAmount) {
        scrollRef.current?.scrollTo({ y: targetAmountLayoutY.current, animated: true });
      } else if (newErrors.timePeriod) {
        scrollRef.current?.scrollTo({ y: horizonLayoutY.current, animated: true });
      }
      return;
    }

    setIsSubmitting(true);

    try {
      let finalGoal = selectedGoal || 'wealth';
      if (selectedGoal === 'custom' && customGoalName.trim()) {
        const lowerName = customGoalName.toLowerCase();
        if (lowerName.includes('educat') || lowerName.includes('school') || lowerName.includes('college'))
          finalGoal = 'education';
        else if (lowerName.includes('marriag') || lowerName.includes('weddin')) finalGoal = 'marriage';
        else if (lowerName.includes('home') || lowerName.includes('house')) finalGoal = 'home';
        else if (lowerName.includes('retire')) finalGoal = 'retirement';
        else if (lowerName.includes('car') || lowerName.includes('bike') || lowerName.includes('vehic'))
          finalGoal = 'vehicle';
        else if (lowerName.includes('emergenc') || lowerName.includes('medical')) finalGoal = 'emergency';
        else if (lowerName.includes('vacat') || lowerName.includes('trip') || lowerName.includes('travel'))
          finalGoal = 'vacation';
        else if (lowerName.includes('business') || lowerName.includes('startup')) finalGoal = 'business';
        else if (lowerName.includes('renovat') || lowerName.includes('remodel')) finalGoal = 'renovation';
        else if (lowerName.includes('debt') || lowerName.includes('loan')) finalGoal = 'debt';
        else finalGoal = customGoalName.trim();
      }

      navigation.navigate('InvestmentBuckets', {
        goal: finalGoal,
        goalDisplayName: selectedGoal === 'custom' ? customGoalName.trim() : activeGoalObj?.name,
        targetAmount: Number(targetAmount),
        timePeriod: Number(timePeriod),
        inflationRate: Number(inflationRate),
        customAdjustments: customAdjustments.map((a) => ({
          name: a.name,
          percentage: Number(a.percentage) || 0,
        })),
      });
    } finally {
      setTimeout(() => setIsSubmitting(false), 500);
    }
  };

  // Hardware back and Header back synchronization for multi-step flow
  useEffect(() => {
    if (step === 'CONFIGURE') {
      return registerCustomBackHandler('goal_configure_step', () => {
        setStep('SELECT');
        setErrors({});
        return true;
      });
    }
  }, [step]);

  // Header Back handler
  const handleHeaderBack = () => {
    if (step === 'CONFIGURE') {
      // Returning from Step 2 to Step 1 preserves all entered values
      setStep('SELECT');
      setErrors({});
    } else {
      handleGlobalBack();
    }
  };

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <Header
        title={step === 'SELECT' ? '' : 'Configure Goal'}
        onBack={handleHeaderBack}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ========================================================
              STEP 1: GOAL CATEGORY SELECTION
             ======================================================== */}
          {step === 'SELECT' && (
            <View>
              {/* Step Title & Subtitle */}
              <View style={styles.headerTextBox}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>STEP 1 OF 2</Text>
                </View>
                <Text style={styles.title}>
                  {t('goals.whatIsYourGoal', { defaultValue: 'What is your goal?' })}
                </Text>
                <Text style={styles.subtitle}>
                  Select a milestone below. You will configure your target amount and investment timeline in the next step.
                </Text>
              </View>

              {/* 12 Goal Categories Grid */}
              <View style={styles.grid}>
                {GOALS.map((goal) => {
                  const isSelected = selectedGoal === goal.id;
                  return (
                    <Pressable
                      key={goal.id}
                      style={[styles.card, isSelected && styles.cardSelected]}
                      onPress={() => handleSelectCategory(goal.id)}
                      accessibilityLabel={goal.name}
                      accessibilityRole="button"
                    >
                      <View style={styles.iconCircle}>
                        <Text style={styles.icon}>{goal.icon}</Text>
                      </View>
                      <Text style={[styles.name, isSelected && styles.nameSelected]}>
                        {t(`goals.categories.${goal.id}`, { defaultValue: goal.name })}
                      </Text>
                      <Text style={styles.cardDesc} numberOfLines={2}>
                        {goal.desc}
                      </Text>

                      <View style={styles.cardSelectAction}>
                        <Text style={styles.selectText}>Select Goal</Text>
                        <Ionicons name="arrow-forward" size={12} color="#3C3985" />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ========================================================
              STEP 2: GOAL CONFIGURATION & HORIZON SETTING
             ======================================================== */}
          {step === 'CONFIGURE' && (
            <View>
              {/* Step Badge & Selected Goal Banner */}
              <View style={styles.headerTextBox}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>STEP 2 OF 2</Text>
                </View>
                <Text style={styles.title}>Configure Your Milestone</Text>
                <Text style={styles.subtitle}>
                  Specify your target budget and investment horizon to determine your monthly systematic investment plan.
                </Text>
              </View>

              {/* Selected Goal Card */}
              {activeGoalObj && (
                <View style={styles.selectedGoalBanner}>
                  <View style={styles.selectedGoalLeft}>
                    <Text style={styles.selectedGoalEmoji}>{activeGoalObj.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedGoalTitle}>
                        {selectedGoal === 'custom' && customGoalName.trim()
                          ? customGoalName
                          : activeGoalObj.name}
                      </Text>
                      <Text style={styles.selectedGoalSubtitle}>{activeGoalObj.desc}</Text>
                    </View>
                  </View>
                  <Pressable
                    style={styles.changeGoalBtn}
                    onPress={() => setStep('SELECT')}
                    accessibilityLabel="Change Goal Category"
                  >
                    <Text style={styles.changeGoalText}>Change</Text>
                  </Pressable>
                </View>
              )}

              {/* Custom Goal Name Input (if custom) */}
              {selectedGoal === 'custom' && (
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Custom Goal Name</Text>
                  <TextInput
                    value={customGoalName}
                    onChangeText={(v) => {
                      setCustomGoalName(v);
                      if (errors.goal) setErrors({ ...errors, goal: undefined });
                    }}
                    placeholder="e.g. Photography Studio, World Tour, Guitar"
                    placeholderTextColor="#94A3B8"
                    style={[styles.input, errors.goal ? styles.inputError : null]}
                  />
                  {errors.goal && <Text style={styles.errorText}>⚠️ {errors.goal}</Text>}
                </View>
              )}

              {/* 1. Target Amount Input */}
              <View
                style={styles.formGroup}
                onLayout={(e) => {
                  targetAmountLayoutY.current = e.nativeEvent.layout.y;
                }}
              >
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Today's Target Amount (₹)</Text>
                  <Text style={styles.fieldHelper}>At current prices</Text>
                </View>

                <View style={[styles.inputContainer, errors.targetAmount ? styles.inputError : null]}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    value={targetAmount}
                    onChangeText={(v) => {
                      const clean = v.replace(/[^0-9]/g, '');
                      setTargetAmount(clean);
                      if (errors.targetAmount) setErrors({ ...errors, targetAmount: undefined });
                    }}
                    keyboardType="number-pad"
                    placeholder="e.g. 15,00,000"
                    placeholderTextColor="#94A3B8"
                    style={styles.inputInner}
                  />
                </View>

                {errors.targetAmount && (
                  <Text style={styles.errorText}>⚠️ {errors.targetAmount}</Text>
                )}

                {/* Quick Amount Selection Chips */}
                <View style={styles.chipsRow}>
                  {QUICK_AMOUNTS.map((chip) => {
                    const isSelected = targetAmount === chip.value;
                    return (
                      <Pressable
                        key={chip.value}
                        style={[styles.chipPill, isSelected && styles.chipPillActive]}
                        onPress={() => {
                          setTargetAmount(chip.value);
                          if (errors.targetAmount) setErrors({ ...errors, targetAmount: undefined });
                        }}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {chip.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* 2. Investment Horizon Input */}
              <View
                style={styles.formGroup}
                onLayout={(e) => {
                  horizonLayoutY.current = e.nativeEvent.layout.y;
                }}
              >
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Investment Horizon (Years)</Text>
                  <Text style={styles.fieldHelper}>Time until milestone</Text>
                </View>

                <View style={[styles.inputContainer, errors.timePeriod ? styles.inputError : null]}>
                  <Ionicons name="time-outline" size={20} color="#3C3985" style={{ marginRight: 8 }} />
                  <TextInput
                    value={timePeriod}
                    onChangeText={(v) => {
                      const clean = v.replace(/[^0-9]/g, '');
                      setTimePeriod(clean);
                      if (errors.timePeriod) setErrors({ ...errors, timePeriod: undefined });
                    }}
                    keyboardType="number-pad"
                    placeholder="e.g. 5"
                    placeholderTextColor="#94A3B8"
                    style={styles.inputInner}
                  />
                  <Text style={styles.unitSuffix}>Years</Text>
                </View>

                {errors.timePeriod && (
                  <Text style={styles.errorText}>⚠️ {errors.timePeriod}</Text>
                )}

                {/* Quick Horizon Selection Chips */}
                <View style={styles.chipsRow}>
                  {QUICK_HORIZONS.map((yrs) => {
                    const isSelected = timePeriod === yrs;
                    return (
                      <Pressable
                        key={yrs}
                        style={[styles.chipPill, isSelected && styles.chipPillActive]}
                        onPress={() => {
                          setTimePeriod(yrs);
                          if (errors.timePeriod) setErrors({ ...errors, timePeriod: undefined });
                        }}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {yrs} Years
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* 3. Expected Inflation Rate */}
              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Expected Annual Inflation (% p.a.)</Text>
                  <Text style={styles.fieldHelper}>Purchasing power adjustment</Text>
                </View>

                <View style={[styles.inputContainer, errors.inflationRate ? styles.inputError : null]}>
                  <Ionicons name="trending-up-outline" size={20} color="#F7941E" style={{ marginRight: 8 }} />
                  <TextInput
                    value={inflationRate}
                    onChangeText={(v) => {
                      setInflationRate(v);
                      if (errors.inflationRate) setErrors({ ...errors, inflationRate: undefined });
                    }}
                    keyboardType="decimal-pad"
                    placeholder="6.0"
                    placeholderTextColor="#94A3B8"
                    style={styles.inputInner}
                  />
                  <Text style={styles.unitSuffix}>% p.a.</Text>
                </View>

                {errors.inflationRate && (
                  <Text style={styles.errorText}>⚠️ {errors.inflationRate}</Text>
                )}
              </View>

              {/* 4. Real-Time Inflation Adjusted Future Value Card */}
              {Number(targetAmount) > 0 && Number(timePeriod) > 0 && (
                <View style={styles.futureCard}>
                  <View style={styles.futureHeader}>
                    <Ionicons name="calculator-outline" size={18} color="#3C3985" />
                    <Text style={styles.futureHeaderTitle}>INFLATION-ADJUSTED TARGET</Text>
                  </View>
                  <Text style={styles.futureValueAmount}>
                    ₹{Math.round(calculateFutureValue()).toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.futureExplainer}>
                    In {timePeriod} years, your ₹{Number(targetAmount).toLocaleString('en-IN')} goal will require approximately ₹{Math.round(calculateFutureValue()).toLocaleString('en-IN')} assuming {inflationRate}% annual inflation.
                  </Text>
                </View>
              )}

              {/* 5. Custom Adjustments (Optional) */}
              <View style={styles.adjustmentsContainer}>
                <View style={styles.adjustmentsHeader}>
                  <Text style={styles.adjustmentsTitle}>Custom Adjustments (Optional)</Text>
                  <Pressable onPress={handleAddAdjustment} hitSlop={8}>
                    <Text style={styles.addAdjustmentText}>+ Add Buffer</Text>
                  </Pressable>
                </View>

                {customAdjustments.map((adj, idx) => (
                  <View key={idx} style={styles.adjustmentRow}>
                    <TextInput
                      value={adj.name}
                      onChangeText={(v) => updateAdjustment(idx, 'name', v)}
                      placeholder="e.g. Tax Buffer"
                      placeholderTextColor="#94A3B8"
                      style={[styles.input, { flex: 2, marginBottom: 0 }]}
                    />
                    <View style={[styles.inputContainer, { flex: 1, height: 48, marginBottom: 0 }]}>
                      <TextInput
                        value={adj.percentage}
                        onChangeText={(v) => updateAdjustment(idx, 'percentage', v)}
                        keyboardType="decimal-pad"
                        style={styles.inputInner}
                      />
                      <Text style={styles.unitSuffix}>%</Text>
                    </View>
                    <Pressable
                      onPress={() => setCustomAdjustments(customAdjustments.filter((_, i) => i !== idx))}
                      style={styles.deleteAdjBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Action Bar */}
      {step === 'CONFIGURE' && (
        <View style={styles.footer}>
          <Pressable
            style={[styles.continueBtn, isSubmitting && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={isSubmitting}
            accessibilityLabel="Choose Investment Plan"
            accessibilityRole="button"
          >
            <Text style={styles.continueBtnText}>
              {t('goals.chooseInvestmentPlan', { defaultValue: 'Choose Investment Plan' })} →
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerTextBox: {
    marginBottom: 18,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EBEBFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3C3985',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#102A54',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
  },
  cardSelected: {
    borderColor: '#3C3985',
    backgroundColor: '#FAF5FF',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F9FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 24,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 4,
  },
  nameSelected: {
    color: '#3C3985',
  },
  cardDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 12,
  },
  cardSelectAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  selectText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C3985',
  },
  selectedGoalBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  selectedGoalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  selectedGoalEmoji: {
    fontSize: 30,
  },
  selectedGoalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102A54',
  },
  selectedGoalSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  changeGoalBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0EFFB',
  },
  changeGoalText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C3985',
  },
  formGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#102A54',
  },
  fieldHelper: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#102A54',
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3C3985',
    marginRight: 8,
  },
  unitSuffix: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 6,
  },
  inputInner: {
    flex: 1,
    fontSize: 16,
    color: '#102A54',
    fontWeight: '800',
  },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chipPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipPillActive: {
    backgroundColor: '#3C3985',
    borderColor: '#3C3985',
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  futureCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    marginBottom: 18,
  },
  futureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  futureHeaderTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3C3985',
    letterSpacing: 0.8,
  },
  futureValueAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#102A54',
    marginBottom: 6,
  },
  futureExplainer: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 17,
  },
  adjustmentsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  adjustmentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  adjustmentsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  addAdjustmentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C3985',
  },
  adjustmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  deleteAdjBtn: {
    padding: 6,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  continueBtn: {
    backgroundColor: '#3C3985',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    opacity: 0.6,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
