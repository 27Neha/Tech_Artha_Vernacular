import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation('common');

  const sections = [
    {
      title: t('termsModal.sec1Title', { defaultValue: '1. Acceptance of Terms' }),
      text: t('termsModal.sec1Text', { defaultValue: 'By creating an account or using TechArtha, you agree to these Terms & Conditions and our Privacy Policy.' }),
    },
    {
      title: t('termsModal.sec2Title', { defaultValue: '2. User Eligibility & Account Security' }),
      text: t('termsModal.sec2Text', { defaultValue: 'You must provide accurate information during registration. Your account is for your personal use, and you are responsible for maintaining the confidentiality of your login credentials.' }),
    },
    {
      title: t('termsModal.sec3Title', { defaultValue: '3. Minor & Guardian Responsibility' }),
      text: t('termsModal.sec3Text', { defaultValue: 'If an account or investment is initiated for a minor, the parent or appointed legal guardian must provide valid consent and participate where required. The guardian is responsible for ensuring that all information and documents submitted on behalf of the minor are true, valid, and accurate. All activities remain strictly subject to applicable regulatory guidelines, KYC norms, and mandatory guardian authorization without independent bypass.' }),
    },
    {
      title: t('termsModal.sec4Title', { defaultValue: '4. KYC & Identity Verification' }),
      text: t('termsModal.sec4Text', { defaultValue: 'Investment services require mandatory KYC verification. You agree to provide valid and accurate PAN, personal, and identity details as required by regulations.' }),
    },
    {
      title: t('termsModal.sec5Title', { defaultValue: '5. Investment Transactions' }),
      text: t('termsModal.sec5Text', { defaultValue: 'All transactions—including investments, purchases, SIPs, and redemptions—are executed only upon your explicit authentication and consent. Please review transaction details carefully before confirming.' }),
    },
    {
      title: t('termsModal.sec6Title', { defaultValue: '6. Investment Risks & No Guarantees' }),
      text: t('termsModal.sec6Text', { defaultValue: 'Mutual fund and capital market investments are subject to market risks. Past performance does not guarantee future returns. TechArtha does not make any guaranteed-return or profit claims.' }),
    },
    {
      title: t('termsModal.sec7Title', { defaultValue: '7. Educational Information & Nudges' }),
      text: t('termsModal.sec7Text', { defaultValue: 'Informational content, educational resources, and nudges provided in the app are for assistance only and should not be construed as guaranteed returns or financial promises.' }),
    },
    {
      title: t('termsModal.sec8Title', { defaultValue: '8. Privacy & Data Handling' }),
      text: t('termsModal.sec8Text', { defaultValue: 'Your personal, KYC, and financial data is processed securely for account creation, regulatory compliance, verification, transactions, and support. Please refer to our Privacy Policy for detailed data handling practices.' }),
    },
    {
      title: t('termsModal.sec9Title', { defaultValue: '9. Authorized Third-Party Service Providers' }),
      text: t('termsModal.sec9Text', { defaultValue: 'To facilitate payments, KYC, transaction processing, and communications, data may be shared with authorized third-party partners (such as payment gateways, AMCs, and verification agencies) solely to fulfill requested services.' }),
    },
    {
      title: t('termsModal.sec10Title', { defaultValue: '10. Electronic Communications' }),
      text: t('termsModal.sec10Text', { defaultValue: 'You consent to receive authentication OTPs, transaction confirmations, account alerts, and service updates via your registered phone number, WhatsApp, and Email.' }),
    },
    {
      title: t('termsModal.sec11Title', { defaultValue: '11. Accuracy of Information & Consequences of False Information' }),
      text: t('termsModal.sec11Text', { defaultValue: 'By accepting these Terms, you confirm that all information, documents, and declarations provided are true, accurate, complete, and up to date. You remain responsible for the information submitted through the platform. If TechArtha discovers that information or documents provided are false, misleading, fraudulent, materially inaccurate, or intentionally withheld, TechArtha may take appropriate action, including restricting, suspending, or terminating the account where permitted by applicable law and regulatory requirements. Any resulting consequences shall be the responsibility of the user to the extent permitted by law.' }),
    },
    {
      title: t('termsModal.sec12Title', { defaultValue: '12. Regulatory Compliance' }),
      text: t('termsModal.sec12Text', { defaultValue: 'All investment facilities, transactions, and user onboarding are provided in strict compliance with applicable laws, guidelines, and regulatory standards.' }),
    },
    {
      title: t('termsModal.sec13Title', { defaultValue: '13. Contact & Support' }),
      text: t('termsModal.sec13Text', { defaultValue: 'If you have questions regarding these terms, privacy practices, or your account, please reach out to TechArtha customer support.' }),
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
              <Ionicons name="document-text-outline" size={22} color="#3C3985" style={{ marginRight: 8 }} />
              <Text style={localStyles.title} numberOfLines={1}>
                {t('termsModal.title', { defaultValue: 'Terms & Conditions' })}
              </Text>
            </View>
          </View>

          <ScrollView style={localStyles.scrollBody} showsVerticalScrollIndicator={true}>
            <Text style={localStyles.introText}>
              {t('termsModal.intro', {
                defaultValue: 'Please review this summary of the Terms of Service & Privacy Policy consent required before proceeding on TechArtha.'
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
                {t('termsModal.close', { defaultValue: 'Close' })}
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
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102A54',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
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
