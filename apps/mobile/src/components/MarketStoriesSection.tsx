import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MarketNewsItem } from '../types/market';

interface MarketStoriesSectionProps {
  news: MarketNewsItem[];
}

const CATEGORIES = ['All', 'Mutual Funds', 'Banking & Finance', 'RBI & Policy', 'Economy', 'Technology'];

export const MarketStoriesSection: React.FC<MarketStoriesSectionProps> = ({ news }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedArticle, setSelectedArticle] = useState<MarketNewsItem | null>(null);
  const [viewAllVisible, setViewAllVisible] = useState<boolean>(false);

  const filteredNews = React.useMemo(() => {
    if (selectedCategory === 'All') return news;
    return news.filter((item) => item.category === selectedCategory);
  }, [news, selectedCategory]);

  const handleOpenSourceUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (e) {
      console.log('Cannot open URL', e);
    }
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>What's Moving the Market?</Text>
          <Text style={styles.sectionSubtitle}>Verified Indian financial updates & regulatory shifts</Text>
        </View>

        <Pressable onPress={() => setViewAllVisible(true)} style={styles.viewAllBtn}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="arrow-forward" size={13} color="#3C3985" />
        </Pressable>
      </View>

      {/* Category Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>{cat}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Horizontal Swipeable Story Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyScroll}>
        {filteredNews.map((item) => (
          <Pressable key={item.id} style={styles.storyCard} onPress={() => setSelectedArticle(item)}>
            {/* Category Tag & Read Time */}
            <View style={styles.cardTopRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.category}</Text>
              </View>
              <Text style={styles.readTimeText}>{item.readTime}</Text>
            </View>

            {/* Headline */}
            <Text style={styles.headline} numberOfLines={2}>
              {item.headline}
            </Text>

            {/* Summary */}
            <Text style={styles.summary} numberOfLines={3}>
              {item.summary}
            </Text>

            {/* Why it Matters Pill */}
            <View style={styles.whyBox}>
              <Text style={styles.whyLabel}>WHY IT MATTERS</Text>
              <Text style={styles.whyText} numberOfLines={2}>
                {item.whyItMatters}
              </Text>
            </View>

            {/* Source & Read More */}
            <View style={styles.cardFooter}>
              <Text style={styles.sourceText} numberOfLines={1}>
                {item.originalSource}
              </Text>
              <View style={styles.readMoreLink}>
                <Text style={styles.readMoreLinkText}>Read</Text>
                <Ionicons name="chevron-forward" size={13} color="#3C3985" />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Single Article Reader Modal */}
      <Modal visible={!!selectedArticle} transparent animationType="slide" onRequestClose={() => setSelectedArticle(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.articleModalBox}>
            <View style={styles.modalCloseRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{selectedArticle?.category}</Text>
              </View>
              <Pressable onPress={() => setSelectedArticle(null)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
              <Text style={styles.modalHeadline}>{selectedArticle?.headline}</Text>

              <View style={styles.modalMetaRow}>
                <Text style={styles.modalSource}>{selectedArticle?.originalSource}</Text>
                <Text style={styles.modalDot}>•</Text>
                <Text style={styles.modalDate}>{selectedArticle?.publishedAt}</Text>
              </View>

              <Text style={styles.modalParagraph}>{selectedArticle?.summary}</Text>

              {/* High-Impact Why it Matters Box */}
              <View style={styles.whyDetailedBox}>
                <View style={styles.whyTitleRow}>
                  <Ionicons name="bulb-outline" size={16} color="#3C3985" />
                  <Text style={styles.whyDetailedTitle}>INVESTOR TAKEAWAY</Text>
                </View>
                <Text style={styles.whyDetailedBody}>{selectedArticle?.whyItMatters}</Text>
              </View>

              <View style={styles.complianceNotice}>
                <Text style={styles.complianceNoticeText}>
                  This summary is curated for educational financial context under standard journalistic fair-use principles. You can read the complete article on the publisher's official platform.
                </Text>
              </View>

              {selectedArticle?.url && (
                <Pressable
                  style={styles.externalLinkBtn}
                  onPress={() => handleOpenSourceUrl(selectedArticle.url)}
                >
                  <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.externalLinkText}>Visit {selectedArticle.originalSource.split('/')[0]}</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View All Stories List Modal */}
      <Modal visible={viewAllVisible} animationType="slide" onRequestClose={() => setViewAllVisible(false)}>
        <View style={styles.viewAllContainer}>
          <View style={styles.viewAllHeader}>
            <Text style={styles.viewAllTitle}>Market News & Intelligence</Text>
            <Pressable onPress={() => setViewAllVisible(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color="#102A54" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.allNewsList} showsVerticalScrollIndicator={false}>
            {news.map((item) => (
              <Pressable
                key={item.id}
                style={styles.allNewsItem}
                onPress={() => {
                  setViewAllVisible(false);
                  setSelectedArticle(item);
                }}
              >
                <View style={styles.allNewsItemTop}>
                  <Text style={styles.allNewsCategory}>{item.category}</Text>
                  <Text style={styles.allNewsDate}>{item.publishedAt}</Text>
                </View>
                <Text style={styles.allNewsHeadline}>{item.headline}</Text>
                <Text style={styles.allNewsSummary} numberOfLines={2}>
                  {item.summary}
                </Text>
                <Text style={styles.allNewsSource}>Source: {item.originalSource}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#102A54',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3C3985',
  },
  filterScroll: {
    paddingBottom: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#3C3985',
    borderColor: '#3C3985',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  storyScroll: {
    paddingVertical: 4,
    gap: 14,
  },
  storyCard: {
    width: 270,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#EBEBFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3C3985',
  },
  readTimeText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  headline: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
    lineHeight: 19,
    marginBottom: 6,
  },
  summary: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 16,
    marginBottom: 10,
  },
  whyBox: {
    backgroundColor: '#F8F9FD',
    borderRadius: 10,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F7941E',
    marginBottom: 10,
  },
  whyLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#F7941E',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  whyText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 15,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sourceText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    maxWidth: 160,
  },
  readMoreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  readMoreLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C3985',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 84, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  articleModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '85%',
  },
  modalCloseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeadline: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102A54',
    lineHeight: 25,
    marginBottom: 8,
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  modalSource: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C3985',
  },
  modalDot: {
    fontSize: 11,
    color: '#94A3B8',
  },
  modalDate: {
    fontSize: 11,
    color: '#64748B',
  },
  modalParagraph: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 16,
  },
  whyDetailedBox: {
    backgroundColor: '#EBEBFA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D8D8F6',
  },
  whyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  whyDetailedTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3C3985',
    letterSpacing: 0.8,
  },
  whyDetailedBody: {
    fontSize: 13,
    color: '#3C3985',
    lineHeight: 18,
    fontWeight: '600',
  },
  complianceNotice: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  complianceNoticeText: {
    fontSize: 10,
    color: '#94A3B8',
    lineHeight: 14,
  },
  externalLinkBtn: {
    backgroundColor: '#3C3985',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  externalLinkText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  viewAllContainer: {
    flex: 1,
    backgroundColor: '#F8F9FD',
    paddingTop: 50,
  },
  viewAllHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  viewAllTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102A54',
  },
  allNewsList: {
    padding: 20,
    gap: 12,
  },
  allNewsItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  allNewsItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  allNewsCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3C3985',
  },
  allNewsDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  allNewsHeadline: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 4,
  },
  allNewsSummary: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 6,
  },
  allNewsSource: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
