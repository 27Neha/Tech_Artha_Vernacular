import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BookIcon, WalletIcon, TrendingIcon, FileIcon } from '../components/Icons';

export const ARTICLES = [
  { slug: 'what-is-mutual-fund', title: 'What is a Mutual Fund?', desc: 'Learn how pooled investments work and why they are great for beginners.', time: '5 min read', tag: 'Beginner' },
  { slug: 'sip-vs-lump-sum', title: 'SIP vs Lump Sum', desc: 'Which investment approach suits your financial situation better?', time: '4 min read', tag: 'Beginner' },
  { slug: 'understanding-risk', title: 'Understanding Risk', desc: 'Learn how to assess and manage investment risk for your goals.', time: '6 min read', tag: 'Intermediate' },
  { slug: 'fund-performance', title: 'Reading Fund Performance', desc: 'Understand NAV, returns, and how to compare mutual funds.', time: '7 min read', tag: 'Intermediate' },
  { slug: 'elss-tax-saving', title: 'ELSS Tax Saving Funds', desc: 'Save tax while growing wealth with 80C.', time: '5 min read', tag: 'Tax' },
  { slug: 'international-funds', title: 'International Funds', desc: 'Invest in global markets from India.', time: '6 min read', tag: 'Advanced' },
];

export const ARTICLE_CONTENT: Record<string, string> = {
  'what-is-mutual-fund': `A Mutual Fund is a trust that collects money from a number of investors who share a common investment objective. 

**How it works**
The money collected is invested by a professional fund manager in equities, bonds, money market instruments, and other securities. The income generated from these investments is distributed proportionately amongst the investors after deducting certain expenses, by calculating a value called Net Asset Value (NAV).

**Key Benefits:**
1. **Professional Management**: You don't need to track the market daily; experts do it for you.
2. **Diversification**: By investing in a basket of stocks/bonds, the risk is spread out.
3. **Liquidity**: Open-ended funds can be bought or sold on any business day.
4. **Affordability**: You can start investing with as little as ₹100 through a Systematic Investment Plan (SIP).

*Conclusion:* Mutual funds are one of the most efficient ways to build wealth over the long term without needing deep financial expertise.`,

  'sip-vs-lump-sum': `When investing in Mutual Funds, you have two primary methods: SIP (Systematic Investment Plan) and Lumpsum.

**What is a SIP?**
A SIP allows you to invest a fixed amount regularly (monthly, weekly, etc.). It automates your investing and enforces financial discipline.

**What is Lumpsum?**
A Lumpsum investment is a one-time bulk investment. This is usually preferred when you receive a large bonus, inheritance, or windfall.

**Which is better?**
1. **Rupee Cost Averaging (SIP)**: SIPs automatically buy more units when markets are down and fewer when markets are up. This averages out your purchase cost, meaning you don't need to "time the market".
2. **Market Timing (Lumpsum)**: Lumpsum works best when the market has crashed and valuations are cheap. However, timing the market is extremely difficult even for professionals.
3. **Discipline**: SIPs remove the emotional aspect of investing. Your money is deducted automatically on a set date.

*Recommendation:* For salaried individuals, SIPs are universally recommended. If you receive a large bonus, consider doing a STP (Systematic Transfer Plan) instead of a pure lumpsum to mitigate timing risk.`,

  'understanding-risk': `All investments carry some degree of risk. In finance, "risk" is simply the probability that your actual return will differ from your expected return, including the possibility of losing some or all of your original investment.

**Types of Risk in Mutual Funds:**
1. **Market Risk (Systematic Risk)**: The risk that the entire market declines due to economic events, natural disasters, or political instability.
2. **Interest Rate Risk**: Primarily affects Debt funds. When interest rates rise, bond prices fall, leading to a drop in NAV.
3. **Credit Risk**: The risk that the issuer of a bond defaults on its payments.
4. **Inflation Risk**: The risk that your investment returns do not beat the inflation rate, reducing your purchasing power.

**How to manage risk?**
The golden rule of risk management is **Diversification**. Do not put all your eggs in one basket. Allocate your capital across Equity (High Risk/High Return), Debt (Low Risk/Stable Return), and Gold (Hedge against inflation). Understand your personal risk tolerance before building a portfolio.`,

  'fund-performance': `When choosing a mutual fund, evaluating its past performance is important, but it should never be the only factor. Remember: *Past performance is not an indicator of future returns.*

**Key Metrics to Look At:**
1. **NAV (Net Asset Value)**: The price of a single unit of the fund. A higher NAV doesn't mean the fund is expensive; it just means it has been running for a long time.
2. **Trailing Returns vs Rolling Returns**: Trailing returns show point-to-point performance (e.g., 1 Year, 3 Year). Rolling returns measure performance over a block of time taken at regular intervals, providing a much more accurate picture of consistency.
3. **Alpha**: Measures how much the fund manager outperformed the benchmark index. A positive Alpha of 2.0 means the fund beat the benchmark by 2%.
4. **Expense Ratio**: The annual fee charged by the AMC to manage your money. A lower expense ratio directly translates to higher returns for you in the long run.

*Actionable Advice:* Always compare a fund's performance against its specific benchmark (e.g., Nifty 50) and its peers in the exact same category.`,

  'elss-tax-saving': `Equity Linked Savings Scheme (ELSS) is a specific type of mutual fund designed to offer tax benefits under Section 80C of the Income Tax Act.

**Why choose ELSS?**
1. **Tax Deduction**: You can claim a deduction of up to ₹1.5 Lakhs from your taxable income, saving up to ₹46,800 in taxes annually (depending on your tax slab).
2. **Shortest Lock-in Period**: ELSS has a mandatory lock-in period of just 3 years. This is the shortest lock-in among all 80C options (PPF is 15 years, Tax-saving FDs are 5 years).
3. **Wealth Creation**: Unlike traditional tax-saving instruments that offer fixed returns (7-8%), ELSS invests predominantly in equities, offering the potential for much higher inflation-beating returns.

*Important Note:* Due to the 3-year lock-in, if you invest via SIP, every individual SIP installment is locked for 3 years from its respective date of investment.`,

  'international-funds': `International or Global Mutual Funds allow Indian investors to buy into companies listed outside of India (like Apple, Amazon, Google, or entire indices like the S&P 500 or Nasdaq 100).

**Why invest globally?**
1. **Geographical Diversification**: If the Indian economy faces a downturn, your global investments can act as a shock absorber.
2. **Access to Megatrends**: Many cutting-edge technology, AI, and healthcare companies are only listed abroad.
3. **Currency Depreciation Benefit**: Historically, the Indian Rupee depreciates against the US Dollar by about 3-4% annually. When you invest in US-focused funds, any depreciation in the Rupee directly adds to your overall returns.

**Taxation Note:**
Under recent tax laws in India, gains from international funds are classified as Debt funds for taxation purposes and are taxed at your applicable income tax slab rate, regardless of the holding period. Keep this in mind when allocating capital.`
};

const renderMarkdown = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>;
    } else if (part.startsWith('*') && part.endsWith('*')) {
      return <Text key={i} style={styles.italic}>{part.slice(1, -1)}</Text>;
    }
    return <Text key={i}>{part}</Text>;
  });
};

export const ArticleScreen = () => {
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const slug = route.params?.slug;

  const article = ARTICLES.find(a => a.slug === slug);
  const content = t(`learn.${slug.replace(/-([a-z])/g, (g: any) => g[1].toUpperCase())}.content`, { defaultValue: ARTICLE_CONTENT[slug] });

  if (!article || !content) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title={t('dash.learnAndGrow', { defaultValue: 'Learn' })} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.notFound}>{t('learn.notFound', { defaultValue: 'Article not found.' })}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <Header title="" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerArea}>
          <View style={styles.tagWrapper}>
            <Text style={styles.tagText}>{t(`learn.${article.tag.toLowerCase()}`, { defaultValue: article.tag })}</Text>
          </View>
          <Text style={styles.title}>{t(`learn.${slug.replace(/-([a-z])/g, (g: any) => g[1].toUpperCase())}.title`, { defaultValue: article.title })}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{article.time.replace(/\d+ min read/, (match) => t('learn.minRead', { defaultValue: match, min: match.split(' ')[0] }))}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{t('learn.expertCurated', { defaultValue: 'Expert Curated' })}</Text>
          </View>
        </View>

        <View style={styles.contentArea}>
          {content.split('\\n\\n').map((paragraph, idx) => (
            <Text key={idx} style={styles.paragraph}>
              {renderMarkdown(paragraph)}
            </Text>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFound: { fontSize: 18, color: '#718096' },
  scrollView: { flex: 1 },
  headerArea: { backgroundColor: '#F8F9FB', padding: 24, paddingBottom: 40, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, marginBottom: 24 },
  tagWrapper: { backgroundColor: '#EBEBFA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start', marginBottom: 16 },
  tagText: { color: '#3C3985', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: '800', color: '#102A54', lineHeight: 40, marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { color: '#3C3985', fontWeight: '700', fontSize: 14 },
  metaDot: { color: '#3C3985', marginHorizontal: 8, fontWeight: '700' },
  contentArea: { padding: 24, paddingBottom: 60 },
  paragraph: { fontSize: 16, lineHeight: 26, color: '#4A5568', marginBottom: 24 },
  bold: { fontWeight: '800', color: '#102A54' },
  italic: { fontStyle: 'italic', color: '#718096' }
});
