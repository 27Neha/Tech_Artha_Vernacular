import React, { useState } from 'react';
import { SafeAreaView, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';

const GOALS = [
  { id: 'education', icon: '🎓', name: 'Child Education' },
  { id: 'marriage', icon: '💍', name: 'Marriage' },
  { id: 'home', icon: '🏠', name: 'Home' },
  { id: 'retirement', icon: '🏖️', name: 'Retirement' },
  { id: 'vehicle', icon: '🚗', name: 'Vehicle' },
  { id: 'emergency', icon: '🛡️', name: 'Emergency Fund' },
  { id: 'wealth', icon: '🎯', name: 'Wealth Creation' },
  { id: 'custom', icon: '⚙️', name: 'Custom Goal' },
];

export const GoalSelectionScreen = () => {
  const navigation = useNavigation<any>();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>What is your main financial goal?</Text>
        <Text style={styles.subtitle}>Choose a goal to personalize your investment plan.</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.grid}>
          {GOALS.map(goal => (
            <Pressable 
              key={goal.id} 
              style={[styles.card, selectedGoal === goal.id && styles.cardSelected]}
              onPress={() => setSelectedGoal(goal.id)}
            >
              <Text style={styles.icon}>{goal.icon}</Text>
              <Text style={[styles.name, selectedGoal === goal.id && styles.nameSelected]}>{goal.name}</Text>
              {selectedGoal === goal.id && <View style={styles.checkBadge}><Text style={styles.checkText}>✓</Text></View>}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable 
          style={[styles.button, !selectedGoal && styles.buttonDisabled]} 
          onPress={() => navigation.navigate('InvestmentBuckets', { goal: selectedGoal })}
          disabled={!selectedGoal}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { backgroundColor: '#3C3985', padding: 24, paddingTop: 60, paddingBottom: 40 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: 'white', fontSize: 16, opacity: 0.9 },
  content: { padding: 20, marginTop: -20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' },
  card: { 
    backgroundColor: 'white', 
    width: '47%', 
    padding: 20, 
    borderRadius: 16, 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 
  },
  cardSelected: { borderColor: '#3C3985', backgroundColor: '#EBEAF8' },
  icon: { fontSize: 32, marginBottom: 12 },
  name: { fontSize: 14, fontWeight: '600', color: '#102A54', textAlign: 'center' },
  nameSelected: { color: '#3C3985' },
  checkBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#3C3985', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  footer: { padding: 24, paddingBottom: 40, backgroundColor: '#F8F9FB' },
  button: { backgroundColor: '#3C3985', padding: 18, borderRadius: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' }
});
