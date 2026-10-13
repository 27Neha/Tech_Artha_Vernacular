import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation('common');

  const sections = [
    {
      title: t('privacyModal.sec1Title', { defaultValue: '1. Information We Collect' }),
      text: t('privacyModal.sec1Text', { defaultValue: 'We collect personal identification details (name, email address, mobile number), government identity and KYC documents (such as PAN and proof of address where required), and investment transaction records. Technical and device information (IP address, operating system, device identifiers) may also be logged to protect account security and prevent unauthorized access.' }),
    },
    {
      title: t('privacyModal.sec2Title', { defaultValue: '2. Purpose and Use of Information' }),
      text: t('privacyModal.sec2Text', { defaultValue: 'Your information is used strictly to create and administer your account, complete mandatory KYC verification, process authorized mutual fund and investment transactions, generate portfolio analytics and informational Nudges, provide customer support, and fulfill statutory and regulatory obligations.' }),
    },
    {
      title: t('privacyModal.sec3Title', { defaultValue: '3. Sharing with Authorized Service Providers' }),
      text: t('privacyModal.sec3Text', { defaultValue: 'TechArtha does not sell or rent your personal information. Information is shared only with authorized third-party partners—including Asset Management Companies (AMCs), RTAs, SEBI-regulated intermediaries, payment gateway partners, and KYC verification agencies—solely to the extent required to execute your requests and meet regulatory requirements.' }),
    },
    {
      title: t('privacyModal.sec4Title', { defaultValue: '4. Data Security & Storage' }),
      text: t('privacyModal.sec4Text', { defaultValue: 'We maintain industry-standard administrative, technical, and physical safeguards designed to protect personal and financial data against unauthorized access, loss, or misuse. Transmission of sensitive data is protected using standard encryption protocols.' }),
    },
    {
      title: t('privacyModal.sec5Title', { defaultValue: '5. Communication & Authentication Data' }),
      text: t('privacyModal.sec5Text', { defaultValue: 'Authentication OTPs, service alerts, and transaction notifications transmitted via SMS, WhatsApp, or Email are logged to maintain secure audit trails and support verification services.' }),
    },
    {
      title: t('privacyModal.sec6Title', { defaultValue: '6. Data Retention & Account Closure' }),
      text: t('privacyModal.sec6Text', { defaultValue: 'Your personal and transaction records are retained for as long as your account remains active or as required by applicable regulatory and legal compliance mandates. Upon account closure, records are maintained or deleted in strict compliance with applicable statutory retention requirements.' }),
    },
    {
      title: t('privacyModal.sec7Title', { defaultValue: '7. User Privacy Rights' }),
      text: t('privacyModal.sec7Text', { defaultValue: 'You may review and update your profile details through the app settings. Where permitted by applicable law and regulatory norms, you may submit requests regarding your personal data to our privacy contact team.' }),
    },
    {
      title: t('privacyModal.sec8Title', { defaultValue: '8. Policy Updates & Privacy Contact' }),
      text: t('privacyModal.sec8Text', { defaultValue: 'TechArtha may update this Privacy Policy periodically to reflect technological, operational, or regulatory changes. For any privacy queries or data handling concerns, please contact our support desk at support@techartha.com.' }),
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={localStyles.overlay}>
        <View style={localStyles.modalCard}>
          <View style={localStyles.header}>
            <View style={localStyles.titleRow}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#3C3985" style={{ marginRight: 8 }} />
              <Text style={localStyles.title} numberOfLines={1}>
                {t('privacyModal.title', { defaultValue: 'Privacy Policy' })}
              </Text>
            </View>
          </View>

          <ScrollView style={localStyles.scrollBody} showsVerticalScrollIndicator={true}>
            <Text style={localStyles.introText}>
              {t('privacyModal.intro', {
                defaultValue: 'This Privacy Policy explains how TechArtha collects, uses, safeguards, and processes your personal and financial information when using our platform.'
              })}
            </Text>

            {sections.map((sec, idx) => (
              <View key={idx} style={localStyles.section}>
                <Text style={localStyles.sectionHeading}>{sec.title}</Text>
                <Text style={localStyles.sectionContent}>{sec.text}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={localStyles.footer}>
            <Pressable style={localStyles.actionBtn} onPress={onClose}>
              <Text style={localStyles.actionBtnText}>
                {t('common.close', { defaultValue: 'Close' })}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const localStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 84, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#102A54',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102A54',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  introText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4A5568',
    marginBottom: 16,
    fontWeight: '500',
  },
  section: {
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#102A54',
    marginBottom: 6,
  },
  sectionContent: {
    fontSize: 13,
    lineHeight: 19,
    color: '#4A5568',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  actionBtn: {
    backgroundColor: '#3C3985',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
