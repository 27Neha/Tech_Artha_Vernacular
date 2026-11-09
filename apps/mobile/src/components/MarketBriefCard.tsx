import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PersonalMarketBrief } from '../types/market';

interface MarketBriefCardProps {
  brief: PersonalMarketBrief | null;
  onExploreCategory?: (category: string) => void;
}

export const MarketBriefCard: React.FC<MarketBriefCardProps> = ({ brief, onExploreCategory }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [whyVisible, setWhyVisible] = useState(false);
  const [readMoreVisible, setReadMoreVisible] = useState(false);

  if (!brief) return null;

  return (
    <View style={styles.card}>
      {/* Eyebrow & Bookmark Button */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={styles.purpleDot} />
          <Text style={styles.eyebrow}>YOUR MARKET BRIEF</Text>
        </View>

        <Pressable
          onPress={() => setIsSaved(!isSaved)}
          hitSlop={8}
          style={[styles.saveBtn, isSaved && styles.saveBtnActive]}
          accessibilityLabel="Save Brief"
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={16}
            color={isSaved ? '#3C3985' : '#64748B'}
          />
        </Pressable>
      </View>

      {/* Profile Context Pill */}
      <Text style={styles.greetingContext}>{brief.greetingContext}</Text>

      {/* Main Headline */}
      <Text style={styles.title}>{brief.title}</Text>

      {/* Concise Summary */}
      <Text style={styles.summary} numberOfLines={3}>
        {brief.summary}
      </Text>

      {/* Actionable Tags & Actions */}
      <View style={styles.categoryRow}>
        <Pressable
          style={styles.categoryPill}
          onPress={() => onExploreCategory && onExploreCategory(brief.relevantCategory)}
        >
          <Ionicons name="sparkles-outline" size={12} color="#3C3985" />
          <Text style={styles.categoryText}>{brief.relevantCategory}</Text>
        </Pressable>

        <Pressable onPress={() => setWhyVisible(true)} style={styles.whyBtn}>
          <Text style={styles.whyText}>Why am I seeing this?</Text>
        </Pressable>
      </View>

      {/* Footer: Date & Read Analysis CTA */}
      <View style={styles.footerRow}>
        <Text style={styles.dateText}>
          {brief.date} • {brief.source}
        </Text>

        <Pressable onPress={() => setReadMoreVisible(true)} style={styles.readMoreBtn}>
          <Text style={styles.readMoreText}>Read Analysis</Text>
          <Ionicons name="chevron-forward" size={13} color="#3C3985" />
        </Pressable>
      </View>

      {/* "Why am I seeing this?" Explanation Modal */}
      <Modal visible={whyVisible} transparent animationType="fade" onRequestClose={() => setWhyVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setWhyVisible(false)}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="information-circle" size={20} color="#3C3985" />
                <Text style={styles.modalTitle}>Personalization Details</Text>
              </View>
              <Pressable onPress={() => setWhyVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <Text style={styles.modalBody}>{brief.whySeeingThis}</Text>

            <View style={styles.trustNote}>
              <Text style={styles.trustNoteText}>
                🛡️ TechArtha does not share your profile with advertisers. Personal market updates are synthesized strictly to support disciplined long-term investing.
              </Text>
            </View>

            <Pressable style={styles.modalCloseBtn} onPress={() => setWhyVisible(false)}>
              <Text style={styles.modalCloseText}>Understood</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Full Analysis Modal */}
      <Modal visible={readMoreVisible} transparent animationType="slide" onRequestClose={() => setReadMoreVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Market Intelligence</Text>
              <Pressable onPress={() => setReadMoreVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#102A54" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
              <Text style={styles.modalHeadline}>{brief.title}</Text>
              <Text style={styles.modalDate}>{brief.date} • Source: {brief.source}</Text>

              <Text style={styles.modalBodyText}>{brief.detailedAnalysis}</Text>

              <View style={styles.insightBox}>
                <Text style={styles.insightTitle}>💡 KEY ACTIONABLE INSIGHT</Text>
                <Text style={styles.insightText}>{brief.actionableInsight}</Text>
              </View>

              <View style={styles.complianceBox}>
                <Text style={styles.complianceText}>
                  Disclaimer: Educational analysis derived from publicly verified market data. Not a formal recommendation to purchase or redeem specific securities.
                </Text>
              </View>
            </ScrollView>

            <Pressable style={styles.modalCloseBtn} onPress={() => setReadMoreVisible(false)}>
              <Text style={styles.modalCloseText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  purpleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3C3985',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3C3985',
    letterSpacing: 1,
  },
  saveBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8F9FD',
  },
  saveBtnActive: {
    backgroundColor: '#EBEBFA',
  },
  greetingContext: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F7941E',
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#102A54',
    lineHeight: 23,
    marginBottom: 8,
  },
  summary: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 19,
    marginBottom: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EFFB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3C3985',
  },
  whyBtn: {
    paddingVertical: 4,
  },
  whyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textDecorationLine: 'underline',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  readMoreText: {
    fontSize: 12,
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
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#102A54',
  },
  modalHeadline: {
    fontSize: 18,
    fontWeight: '800',
    color: '#102A54',
    lineHeight: 24,
    marginBottom: 6,
  },
  modalDate: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 14,
  },
  modalBody: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
    marginBottom: 16,
  },
  modalBodyText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 16,
  },
  trustNote: {
    backgroundColor: '#F8F9FD',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  trustNoteText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    fontWeight: '500',
  },
  insightBox: {
    backgroundColor: '#EBEBFA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D8D8F6',
  },
  insightTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3C3985',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  insightText: {
    fontSize: 13,
    color: '#3C3985',
    fontWeight: '700',
    lineHeight: 18,
  },
  complianceBox: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginBottom: 16,
  },
  complianceText: {
    fontSize: 10,
    color: '#94A3B8',
    lineHeight: 14,
  },
  modalCloseBtn: {
    backgroundColor: '#3C3985',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
