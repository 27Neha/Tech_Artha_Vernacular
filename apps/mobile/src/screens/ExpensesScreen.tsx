import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

export const ExpensesScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="light" />
      <Header title={t('exp.title', { defaultValue: 'Expenses' })} />
      <View style={styles.container}>
        <Text style={styles.title}>{t('exp.title', { defaultValue: 'Expenses' })}</Text>
        <Text style={styles.subtitle}>{t('exp.desc', { defaultValue: 'Track and manage your regular expenses.' })}</Text>

        <View style={styles.card}>
          <View style={styles.iconWrapper}><Text style={styles.icon}>🏦</Text></View>
          <Text style={styles.cardTitle}>{t('exp.noBank', { defaultValue: 'No Bank Account Linked' })}</Text>
          <Text style={styles.cardDesc}>{t('exp.noBankDesc', { defaultValue: 'Link your primary bank account securely to start tracking expenses and automate SIP deductions.' })}</Text>
          <Pressable 
            style={styles.btn} 
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.btnText}>{t('exp.linkBankAccount', { defaultValue: '+ Link Bank Account' })}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  container: { flex: 1, padding: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#102A54', textTransform: 'capitalize', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#718096', marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  iconWrapper: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F8F9FB', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  icon: { fontSize: 32 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#102A54', marginBottom: 8 },
  cardDesc: { fontSize: 12, color: '#718096', textAlign: 'center', lineHeight: 18, marginBottom: 24 },
  btn: { backgroundColor: '#EBEBFA', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#3C3985', borderStyle: 'dashed' },
  btnText: { color: '#3C3985', fontWeight: '800', fontSize: 12 }
});
