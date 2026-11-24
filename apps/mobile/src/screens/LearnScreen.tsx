import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { BookIcon, WalletIcon, TrendingIcon, FileIcon } from '../components/Icons';

const LEARN_CARDS = [
  { icon: <BookIcon color="#36358D" size={26} />, title: 'What is a Mutual Fund?', desc: 'Learn how pooled investments work and why they are great for beginners.', time: '5 min read', slug: 'what-is-mutual-fund' },
  { icon: <WalletIcon color="#36358D" size={26} />, title: 'SIP vs Lump Sum', desc: 'Which investment approach suits your financial situation better?', time: '4 min read', slug: 'sip-vs-lump-sum' },
  { icon: <TrendingIcon color="#36358D" size={26} />, title: 'Understanding Risk', desc: 'Learn how to assess and manage investment risk for your goals.', time: '6 min read', slug: 'understanding-risk' },
  { icon: <FileIcon color="#36358D" size={26} />, title: 'Reading Fund Performance', desc: 'Understand NAV, returns, and how to compare mutual funds.', time: '7 min read', slug: 'fund-performance' },
  { icon: <WalletIcon color="#36358D" size={26} />, title: 'ELSS Tax Saving Funds', desc: 'Save tax while growing wealth with 80C.', time: '5 min read', slug: 'elss-tax-saving' },
  { icon: <TrendingIcon color="#36358D" size={26} />, title: 'International Funds', desc: 'Invest in global markets from India.', time: '6 min read', slug: 'international-funds' },
];

export const LearnScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <Header title={t('dash.learnAndGrow', { defaultValue: 'Learn & Grow' })} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('dash.learnAndGrow', { defaultValue: 'Learn & Grow' })}</Text>
        <Text style={styles.subtitle}>
          {t('learn.subtitle', { defaultValue: 'Educational resources to help you make informed financial decisions.' })}
        </Text>

        <View style={styles.list}>
          {LEARN_CARDS.map((c) => (
            <Pressable 
              key={c.slug} 
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => navigation.navigate('Article', { slug: c.slug })}
            >
              <View style={styles.iconWrapper}>{c.icon}</View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>
                  {t(`learn.${c.slug.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}.title`, { defaultValue: c.title })}
                </Text>
                <Text style={styles.cardDesc}>
                  {t(`learn.${c.slug.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}.desc`, { defaultValue: c.desc })}
                </Text>
                <Text style={styles.timeLabel}>
                  {c.time.replace(/\d+ min read/, (match) =>
                    t('learn.minRead', { defaultValue: match, min: match.split(' ')[0] })
                  )}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7FC' },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '900', color: '#102A54', textTransform: 'capitalize', marginBottom: 6, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 19 },
  list: { gap: 14 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6E8F6',
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: { backgroundColor: '#EEEDFA', borderColor: '#36358D' },
  iconWrapper: { backgroundColor: '#EEEDFA', width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15.5, fontWeight: '800', color: '#102A54', marginBottom: 4 },
  cardDesc: { fontSize: 12.5, color: '#64748B', lineHeight: 18, marginBottom: 10 },
  timeLabel: { fontSize: 11, fontWeight: '800', color: '#36358D', backgroundColor: '#EEEDFA', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }
});

export default LearnScreen;
