import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../services/api/client';

interface RiskDisclosuresModalProps {
  visible: boolean;
  onClose: () => void;
}

export const RiskDisclosuresModal: React.FC<RiskDisclosuresModalProps> = ({ visible, onClose }) => {
  const [remoteNotice, setRemoteNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetch(`${API_URL}/disclosures/market-risk`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.content) setRemoteNotice(data.content);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconBox}>
              <Ionicons name="warning-outline" size={24} color="#C05621" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Statutory Risk Disclosures</Text>
              <Text style={styles.subtitle}>SEBI & AMFI Regulatory Compliance</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color="#718096" />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Primary Statutory Banner */}
            <View style={styles.statutoryBanner}>
              <Text style={styles.statutoryHeading}>MANDATORY SEBI WARNING:</Text>
              <Text style={styles.statutoryText}>
                Mutual fund investments are subject to market risks. Read all scheme-related documents (Scheme Information Document - SID, Key Information Memorandum - KIM) carefully before investing. Past performance is not indicative of future returns.
              </Text>
              {loading ? (
                <ActivityIndicator size="small" color="#C05621" style={{ marginTop: 8 }} />
              ) : remoteNotice ? (
                <Text style={styles.remoteNote}>Official SEBI Master Circular: {remoteNotice}</Text>
              ) : null}
            </View>

            {/* Section 1: Market Risks */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Market Volatility & Capital Risk</Text>
              <Text style={styles.sectionText}>
                The Net Asset Value (NAV) of the units issued under schemes can go up or down depending on the factors and forces affecting the capital markets. Investment in mutual funds involves investment risks such as trading volumes, settlement risk, liquidity risk, and default risk including the possible loss of principal.
              </Text>
            </View>

            {/* Section 2: No Guaranteed Returns */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Absence of Return Guarantees</Text>
              <Text style={styles.sectionText}>
                TechArtha and Asset Management Companies (AMCs) do not guarantee or assure any returns or profits. Past performance of the sponsor, AMC, mutual fund or any associated scheme does not guarantee the future performance of the schemes.
              </Text>
            </View>

            {/* Section 3: Scheme Categorization & Risk-o-Meter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Product Labeling & Scheme Risk-o-Meter</Text>
              <Text style={styles.sectionText}>
                Each scheme features a designated Risk-o-Meter (Low, Low to Moderate, Moderate, Moderately High, High, Very High) evaluated monthly. Investors must ensure their individual risk appetite evaluated through our Risk Assessment aligns with scheme risk parameters.
              </Text>
            </View>

            {/* Section 4: Intermediary Distributor Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Distributor Role & Commissions</Text>
              <Text style={styles.sectionText}>
                TechArtha is an AMFI-registered Mutual Fund Distributor (ARN-284912) facilitating order execution. Investments are processed through regulated exchanges (BSE StAR MF / NSE NMF II). Regular plans incorporate trail commissions payable by AMCs as disclosed under AMFI guidelines. We do not levy direct transaction fees on retail investors.
              </Text>
            </View>

            {/* Section 5: NAV Allotment Cut-Off Timelines */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. NAV Cut-Off Timelines & Fund Realization</Text>
              <Text style={styles.sectionText}>
                Under SEBI guidelines, allotment of NAV is strictly based on the time when investor funds are realized in the AMC's bank account before statutory cut-off times (1:30 PM for liquid/overnight funds; 3:00 PM for other open-ended schemes).
              </Text>
            </View>

            {/* Section 6: Redemptions & Payouts */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Redemptions & Direct Bank Credits</Text>
              <Text style={styles.sectionText}>
                Redemption proceeds are credited directly by the respective fund house or Registrar and Transfer Agent (RTA - CAMS / KFintech) into the investor's verified primary bank account. Redemption settlement timelines range from T+1 to T+3 working days.
              </Text>
            </View>

            {/* Section 7: Grievance Redressal */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. Grievance Redressal Mechanisms</Text>
              <Text style={styles.sectionText}>
                For unresolved grievances, investors have the right to lodge complaints on the SEBI SCORES portal (scores.gov.in) or through the SMART ODR platform (smartodr.in).
              </Text>
            </View>
          </ScrollView>

          {/* Close Action */}
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>I Understand and Acknowledge</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '85%', backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFAF0', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FEEBC8' },
  title: { fontSize: 18, fontWeight: '800', color: '#102A54' },
  subtitle: { fontSize: 12, color: '#718096', marginTop: 2 },
  scrollView: { marginVertical: 14 },
  statutoryBanner: { backgroundColor: '#FFFAF0', borderWidth: 1, borderColor: '#FEEBC8', borderRadius: 14, padding: 14, marginBottom: 14 },
  statutoryHeading: { fontSize: 11, fontWeight: '800', color: '#C05621', letterSpacing: 0.5, marginBottom: 4 },
  statutoryText: { fontSize: 12, fontWeight: '600', color: '#7B341E', lineHeight: 18 },
  remoteNote: { fontSize: 11, color: '#C05621', marginTop: 6, fontStyle: 'italic' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#102A54', marginBottom: 4 },
  sectionText: { fontSize: 12, color: '#4A5568', lineHeight: 18 },
  closeBtn: { backgroundColor: '#3C3985', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  closeBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
