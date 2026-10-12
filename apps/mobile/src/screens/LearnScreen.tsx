import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { BookIcon, WalletIcon, TrendingIcon, FileIcon } from '../components/Icons';

const LEARN_CARDS = [
  { icon: <BookIcon color="#3C3985" size={28} />, title: 'What is a Mutual Fund?', desc: 'Learn how pooled investments work and why they are great for beginners.', time: '5 min read', slug: 'what-is-mutual-fund' },
  { icon: <WalletIcon color="#3C3985" size={28} />, title: 'SIP vs Lump Sum', desc: 'Which investment approach suits your financial situation better?', time: '4 min read', slug: 'sip-vs-lump-sum' },
  { icon: <TrendingIcon color="#3C3985" size={28} />, title: 'Understanding Risk', desc: 'Learn how to assess and manage investment risk for your goals.', time: '6 min read', slug: 'understanding-risk' },
  { icon: <FileIcon color="#3C3985" size={28} />, title: 'Reading Fund Performance', desc: 'Understand NAV, returns, and how to compare mutual funds.', time: '7 min read', slug: 'fund-performance' },
  { icon: <WalletIcon color="#3C3985" size={28} />, title: 'ELSS Tax Saving Funds', desc: 'Save tax while growing wealth with 80C.', time: '5 min read', slug: 'elss-tax-saving' },
  { icon: <TrendingIcon color="#3C3985" size={28} />, title: 'International Funds', desc: 'Invest in global markets from India.', time: '6 min read', slug: 'international-funds' }
];

export const LearnScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title={t('dash.learnAndGrow', { defaultValue: 'Learn & Grow' })} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('dash.learnAndGrow', { defaultValue: 'Learn & Grow' })}</Text>
        <Text style={styles.subtitle}>{t('learn.subtitle', { defaultValue: 'Educational resources to help you make informed financial decisions.' })}</Text>

        <View style={styles.list}>
          {LEARN_CARDS.map(c => (
            <Pressable 
              key={c.slug} 
              style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => navigation.navigate('Article', { slug: c.slug })}
            >
              <View style={styles.iconWrapper}>{c.icon}</View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{t(`learn.${c.slug.replace(/-([a-z])/g, g => g[1].toUpperCase())}.title`, { defaultValue: c.title })}</Text>
                <Text style={styles.cardDesc}>{t(`learn.${c.slug.replace(/-([a-z])/g, g => g[1].toUpperCase())}.desc`, { defaultValue: c.desc })}</Text>
                <Text style={styles.timeLabel}>{c.time.replace(/\d+ min read/, (match) => t('learn.minRead', { defaultValue: match, min: match.split(' ')[0] }))}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FB' },
  container: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#102A54', textTransform: 'capitalize', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#718096', marginBottom: 24, lineHeight: 20 },
  list: { gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', gap: 16, alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardPressed: { backgroundColor: '#F8F9FB', borderColor: '#D1D5DB' },
  iconWrapper: { backgroundColor: '#EBEBFA', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#102A54', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#718096', lineHeight: 20, marginBottom: 12 },
  timeLabel: { fontSize: 11, fontWeight: '700', color: '#3C3985', backgroundColor: '#EBEBFA', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }
});
