'use client';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const sections = [
    {
      title: t('termsModal.sec1Title') || '1. Acceptance of Terms',
      text: t('termsModal.sec1Text') || 'By creating an account or using TechArtha, you agree to these Terms & Conditions and our Privacy Policy.',
    },
    {
      title: t('termsModal.sec2Title') || '2. User Eligibility & Account Security',
      text: t('termsModal.sec2Text') || 'You must provide accurate information during registration. Your account is for your personal use, and you are responsible for maintaining the confidentiality of your login credentials.',
    },
    {
      title: t('termsModal.sec3Title') || '3. Minor & Guardian Responsibility',
      text: t('termsModal.sec3Text') || 'If an account or investment is initiated for a minor, the parent or appointed legal guardian must provide valid consent and participate where required. The guardian is responsible for ensuring that all information and documents submitted on behalf of the minor are true, valid, and accurate. All activities remain strictly subject to applicable regulatory guidelines, KYC norms, and mandatory guardian authorization without independent bypass.',
    },
    {
      title: t('termsModal.sec4Title') || '4. KYC & Identity Verification',
      text: t('termsModal.sec4Text') || 'Investment services require mandatory KYC verification. You agree to provide valid and accurate PAN, personal, and identity details as required by regulations.',
    },
    {
      title: t('termsModal.sec5Title') || '5. Investment Transactions',
      text: t('termsModal.sec5Text') || 'All transactions—including investments, purchases, SIPs, and redemptions—are executed only upon your explicit authentication and consent. Please review transaction details carefully before confirming.',
    },
    {
      title: t('termsModal.sec6Title') || '6. Investment Risks & No Guarantees',
      text: t('termsModal.sec6Text') || 'Mutual fund and capital market investments are subject to market risks. Past performance does not guarantee future returns. TechArtha does not make any guaranteed-return or profit claims.',
    },
    {
      title: t('termsModal.sec7Title') || '7. Educational Information & Nudges',
      text: t('termsModal.sec7Text') || 'Informational content, educational resources, and nudges provided in the app are for assistance only and should not be construed as guaranteed returns or financial promises.',
    },
    {
      title: t('termsModal.sec8Title') || '8. Privacy & Data Handling',
      text: t('termsModal.sec8Text') || 'Your personal, KYC, and financial data is processed securely for account creation, regulatory compliance, verification, transactions, and support. Please refer to our Privacy Policy for detailed data handling practices.',
    },
    {
      title: t('termsModal.sec9Title') || '9. Authorized Third-Party Service Providers',
      text: t('termsModal.sec9Text') || 'To facilitate payments, KYC, transaction processing, and communications, data may be shared with authorized third-party partners (such as payment gateways, AMCs, and verification agencies) solely to fulfill requested services.',
    },
    {
      title: t('termsModal.sec10Title') || '10. Electronic Communications',
      text: t('termsModal.sec10Text') || 'You consent to receive authentication OTPs, transaction confirmations, account alerts, and service updates via your registered phone number, WhatsApp, and Email.',
    },
    {
      title: t('termsModal.sec11Title') || '11. Accuracy of Information & Consequences of False Information',
      text: t('termsModal.sec11Text') || 'By accepting these Terms, you confirm that all information, documents, and declarations provided are true, accurate, complete, and up to date. You remain responsible for the information submitted through the platform. If TechArtha discovers that information or documents provided are false, misleading, fraudulent, materially inaccurate, or intentionally withheld, TechArtha may take appropriate action, including restricting, suspending, or terminating the account where permitted by applicable law and regulatory requirements. Any resulting consequences shall be the responsibility of the user to the extent permitted by law.',
    },
    {
      title: t('termsModal.sec12Title') || '12. Regulatory Compliance',
      text: t('termsModal.sec12Text') || 'All investment facilities, transactions, and user onboarding are provided in strict compliance with applicable laws, guidelines, and regulatory standards.',
    },
    {
      title: t('termsModal.sec13Title') || '13. Contact & Support',
      text: t('termsModal.sec13Text') || 'If you have questions regarding these terms, privacy practices, or your account, please reach out to TechArtha customer support.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3C3985" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <h3 className="text-base font-bold text-gray-900">
              {t('termsModal.title') || 'Terms & Conditions'}
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-3.5 text-sm text-gray-600 leading-relaxed">
          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl text-xs sm:text-sm text-slate-700 font-medium">
            {t('termsModal.intro') || 'Please review this summary of the Terms of Service & Privacy Policy consent required before proceeding on TechArtha.'}
          </div>

          {sections.map((sec, idx) => (
            <div key={idx} className="border border-gray-100 bg-gray-50/50 rounded-xl p-3.5">
              <h4 className="font-bold text-gray-900 mb-1 text-sm">
                {sec.title}
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {sec.text}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#3C3985] hover:bg-[#322f70] text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
          >
            {t('termsModal.close') || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
