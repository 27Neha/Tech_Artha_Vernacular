import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CategoryItem {
  id: string;
  name: string;
  tagline: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge: string;
  bgTint: string;
  borderColor: string;
  iconColor: string;
  query: string;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'large-cap',
    name: 'Large Cap',
    tagline: 'Top 100 bluechip market leaders',
    icon: 'business-outline',
    badge: 'Low Volatility',
    bgTint: '#F0F9FF',
    borderColor: '#BAE6FD',
    iconColor: '#0284C7',
    query: 'Large Cap',
  },
  {
    id: 'mid-cap',
    name: 'Mid Cap',
    tagline: 'Fast-growing established companies',
    icon: 'rocket-outline',
    badge: 'Growth Potential',
    bgTint: '#FDF4FF',
    borderColor: '#F5D0FE',
    iconColor: '#A855F7',
    query: 'Mid Cap',
  },
  {
    id: 'small-cap',
    name: 'Small Cap',
    tagline: 'Emerging high-potential businesses',
    icon: 'flash-outline',
    badge: 'High Returns/Risk',
    bgTint: '#FFF7ED',
    borderColor: '#FED7AA',
    iconColor: '#EA580C',
    query: 'Small Cap',
  },
  {
    id: 'flexi-cap',
    name: 'Flexi Cap',
    tagline: 'Dynamic allocation across all market caps',
    icon: 'pie-chart-outline',
    badge: 'All-Weather',
    bgTint: '#F0FDF4',
    borderColor: '#BBF7D0',
    iconColor: '#16A34A',
    query: 'Flexi Cap',
  },
  {
    id: 'index-funds',
    name: 'Index Funds',
    tagline: 'Low-cost passive tracking of NIFTY 50',
    icon: 'trending-up-outline',
    badge: 'Lowest Cost',
    bgTint: '#EEF2FF',
    borderColor: '#C7D2FE',
    iconColor: '#4F46E5',
    query: 'Index Fund',
  },
  {
    id: 'hybrid',
    name: 'Hybrid Funds',
    tagline: 'Equity growth cushioned with debt safety',
    icon: 'scale-outline',
    badge: 'Balanced Mix',
    bgTint: '#FAF5FF',
    borderColor: '#E9D5FF',
    iconColor: '#7E22CE',
    query: 'Hybrid',
  },
  {
    id: 'debt',
    name: 'Debt & Liquid',
    tagline: 'Capital preservation & regular income',
    icon: 'shield-checkmark-outline',
    badge: 'High Safety',
    bgTint: '#F8FAFC',
    borderColor: '#E2E8F0',
    iconColor: '#475569',
    query: 'Debt',
  },
  {
    id: 'elss',
    name: 'ELSS Tax Saver',
    tagline: 'Section 80C tax deduction with 3-yr lockin',
    icon: 'wallet-outline',
    badge: 'Save ₹46,800',
    bgTint: '#FEFCE8',
    borderColor: '#FEF08A',
    iconColor: '#CA8A04',
    query: 'ELSS',
  },
];

interface InvestmentExplorerSectionProps {
  onSelectCategory: (categoryQuery: string) => void;
}

export const InvestmentExplorerSection: React.FC<InvestmentExplorerSectionProps> = ({
  onSelectCategory,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Explore Investment Categories</Text>
          <Text style={styles.subtitle}>Discover vetted schemes tailored to your objective</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            style={[styles.catCard, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]}
            onPress={() => onSelectCategory(cat.query)}
          >
            <View style={styles.cardTop}>
              <View style={[styles.iconWrap, { backgroundColor: cat.bgTint, borderColor: cat.borderColor }]}>
                <Ionicons name={cat.icon} size={18} color={cat.iconColor} />
              </View>

              <View style={[styles.badge, { backgroundColor: cat.bgTint }]}>
                <Text style={[styles.badgeText, { color: cat.iconColor }]}>{cat.badge}</Text>
              </View>
            </View>

            <Text style={styles.catName}>{cat.name}</Text>
            <Text style={styles.catTagline} numberOfLines={2}>
              {cat.tagline}
            </Text>

            <View style={styles.exploreLink}>
              <Text style={styles.exploreText}>View Funds</Text>
              <Ionicons name="chevron-forward" size={12} color="#3C3985" />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  header: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#102A54',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  catCard: {
    width: '48%',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  catName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 4,
  },
  catTagline: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 10,
    height: 30,
  },
  exploreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  exploreText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C3985',
  },
});
