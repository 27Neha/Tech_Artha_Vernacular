import React from 'react';
import { View, Text, Modal, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MarketOverviewResponse, SectorMovement } from '../types/market';

interface MarketDetailModalProps {
  visible: boolean;
  onClose: () => void;
  data: MarketOverviewResponse | null;
  activeTab?: 'overview' | 'mood';
}

export const MarketDetailModal: React.FC<MarketDetailModalProps> = ({
  visible,
  onClose,
  data,
  activeTab = 'overview',
}) => {
  if (!data) return null;

  const nifty = data.nifty50;
  const sensex = data.sensex;
  const mood = data.marketMood;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Market Intelligence Hub</Text>
            <Text style={styles.headerSubtitle}>Verified Indian Indices & Sector Pulse</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#102A54" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Market Status Banner */}
          <View style={styles.statusBanner}>
            <View style={styles.statusDot} />
            <Text style={styles.statusBannerText}>
              Status: {nifty.marketStatus.toUpperCase()} • As of {nifty.lastUpdated}
            </Text>
          </View>

          {/* 1. Market Mood & Sentiment Methodology */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="speedometer-outline" size={20} color="#3C3985" />
              <Text style={styles.sectionCardTitle}>Market Mood Indicator</Text>
            </View>

            <View style={styles.moodScoreRow}>
              <View style={styles.moodScoreCircle}>
                <Text style={styles.moodScoreNumber}>{mood.score}</Text>
                <Text style={styles.moodScoreScale}>/100</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.moodSentiment}>{mood.sentiment} Sentiment</Text>
                <Text style={styles.moodRatio}>{mood.advanceDeclineRatio}</Text>
              </View>
            </View>

            <Text style={styles.moodRationale}>{mood.rationale}</Text>

            <View style={styles.methodologyBox}>
              <Text style={styles.methodologyTitle}>📐 HOW THIS IS DERIVED</Text>
              <Text style={styles.methodologyText}>{mood.methodology}</Text>
            </View>
          </View>

          {/* 2. Benchmark Index Comparison */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="bar-chart-outline" size={20} color="#3C3985" />
              <Text style={styles.sectionCardTitle}>Indian Benchmark Indices</Text>
            </View>

            {/* NIFTY 50 Detailed Row */}
            <View style={styles.indexDetailBox}>
              <View style={styles.indexTop}>
                <Text style={styles.indexName}>NIFTY 50</Text>
                <Text style={styles.indexCurrent}>₹{nifty.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.indexMeta}>
                <Text style={styles.indexDeltaPositive}>+{nifty.change.toFixed(2)} (+{nifty.changePercent}%) ▲</Text>
                <Text style={styles.indexRange}>Day: ₹{Math.round(nifty.dayLow).toLocaleString('en-IN')} - ₹{Math.round(nifty.dayHigh).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.yearRangeRow}>
                <Text style={styles.yearRangeLabel}>52W Range:</Text>
                <Text style={styles.yearRangeValue}>₹{Math.round(nifty.yearLow).toLocaleString('en-IN')} - ₹{Math.round(nifty.yearHigh).toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* SENSEX Detailed Row */}
            <View style={[styles.indexDetailBox, { marginTop: 10 }]}>
              <View style={styles.indexTop}>
                <Text style={styles.indexName}>BSE SENSEX</Text>
                <Text style={styles.indexCurrent}>₹{sensex.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.indexMeta}>
                <Text style={styles.indexDeltaPositive}>+{sensex.change.toFixed(2)} (+{sensex.changePercent}%) ▲</Text>
                <Text style={styles.indexRange}>Day: ₹{Math.round(sensex.dayLow).toLocaleString('en-IN')} - ₹{Math.round(sensex.dayHigh).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.yearRangeRow}>
                <Text style={styles.yearRangeLabel}>52W Range:</Text>
                <Text style={styles.yearRangeValue}>₹{Math.round(sensex.yearLow).toLocaleString('en-IN')} - ₹{Math.round(sensex.yearHigh).toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>

          {/* 3. Major Sectoral Movements */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="pie-chart-outline" size={20} color="#3C3985" />
              <Text style={styles.sectionCardTitle}>Key Sector Movements</Text>
            </View>

            <View style={styles.sectorGrid}>
              {data.sectors.map((sec: SectorMovement, i: number) => (
                <View key={i} style={styles.sectorItem}>
                  <Text style={styles.sectorName}>{sec.sector}</Text>
                  <Text style={[styles.sectorChange, sec.trend === 'up' ? styles.positiveText : styles.negativeText]}>
                    {sec.changePercent >= 0 ? '+' : ''}{sec.changePercent}% {sec.trend === 'up' ? '▲' : '▼'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 4. Financial Disclosures & SEBI Guidelines */}
          <View style={styles.complianceCard}>
            <Text style={styles.complianceTitle}>REGULATORY & EDUCATIONAL DISCLOSURE</Text>
            <Text style={styles.complianceBody}>
              {data.disclaimer}
            </Text>
            <Text style={[styles.complianceBody, { marginTop: 6 }]}>
              TechArtha is an AMFI-registered mutual fund distributor. Index levels and market quotes are derived from official exchange publications (NSE Indices and BSE India) for informational context only.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102A54',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 12,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#102A54',
  },
  moodScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  moodScoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EBEBFA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3C3985',
  },
  moodScoreNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#3C3985',
  },
  moodScoreScale: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  moodSentiment: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102A54',
  },
  moodRatio: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  moodRationale: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 12,
  },
  methodologyBox: {
    backgroundColor: '#F8F9FD',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  methodologyTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#3C3985',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  methodologyText: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },
  indexDetailBox: {
    backgroundColor: '#F8F9FD',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  indexTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  indexName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#102A54',
  },
  indexCurrent: {
    fontSize: 16,
    fontWeight: '900',
    color: '#102A54',
  },
  indexMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  indexDeltaPositive: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  indexRange: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  yearRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  yearRangeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  yearRangeValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  sectorGrid: {
    gap: 8,
  },
  sectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  sectorChange: {
    fontSize: 13,
    fontWeight: '800',
  },
  positiveText: {
    color: '#10B981',
  },
  negativeText: {
    color: '#EF4444',
  },
  complianceCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  complianceTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  complianceBody: {
    fontSize: 10.5,
    color: '#64748B',
    lineHeight: 15,
  },
});
