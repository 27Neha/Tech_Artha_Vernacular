'use client';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const sections = [
    {
      title: t('privacyModal.sec1Title') || '1. Information We Collect',
      text: t('privacyModal.sec1Text') || 'We collect personal identification details (name, email address, mobile number), government identity and KYC documents (such as PAN and proof of address where required), and investment transaction records. Technical and device information (IP address, operating system, device identifiers) may also be logged to protect account security and prevent unauthorized access.',
    },
    {
      title: t('privacyModal.sec2Title') || '2. Purpose and Use of Information',
      text: t('privacyModal.sec2Text') || 'Your information is used strictly to create and administer your account, complete mandatory KYC verification, process authorized mutual fund and investment transactions, generate portfolio analytics and informational Nudges, provide customer support, and fulfill statutory and regulatory obligations.',
    },
    {
      title: t('privacyModal.sec3Title') || '3. Sharing with Authorized Service Providers',
      text: t('privacyModal.sec3Text') || 'TechArtha does not sell or rent your personal information. Information is shared only with authorized third-party partners—including Asset Management Companies (AMCs), RTAs, SEBI-regulated intermediaries, payment gateway partners, and KYC verification agencies—solely to the extent required to execute your requests and meet regulatory requirements.',
    },
    {
      title: t('privacyModal.sec4Title') || '4. Data Security & Storage',
      text: t('privacyModal.sec4Text') || 'We maintain industry-standard administrative, technical, and physical safeguards designed to protect personal and financial data against unauthorized access, loss, or misuse. Transmission of sensitive data is protected using standard encryption protocols.',
    },
    {
      title: t('privacyModal.sec5Title') || '5. Communication & Authentication Data',
      text: t('privacyModal.sec5Text') || 'Authentication OTPs, service alerts, and transaction notifications transmitted via SMS, WhatsApp, or Email are logged to maintain secure audit trails and support verification services.',
    },
    {
      title: t('privacyModal.sec6Title') || '6. Data Retention & Account Closure',
      text: t('privacyModal.sec6Text') || 'Your personal and transaction records are retained for as long as your account remains active or as required by applicable regulatory and legal compliance mandates. Upon account closure, records are maintained or deleted in strict compliance with applicable statutory retention requirements.',
    },
    {
      title: t('privacyModal.sec7Title') || '7. User Privacy Rights',
      text: t('privacyModal.sec7Text') || 'You may review and update your profile details through the app settings. Where permitted by applicable law and regulatory norms, you may submit requests regarding your personal data to our privacy contact team.',
    },
    {
      title: t('privacyModal.sec8Title') || '8. Policy Updates & Privacy Contact',
      text: t('privacyModal.sec8Text') || 'TechArtha may update this Privacy Policy periodically to reflect technological, operational, or regulatory changes. For any privacy queries or data handling concerns, please contact our support desk at support@techartha.com.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3C3985" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <h3 className="text-base font-bold text-gray-900">
              {t('privacyModal.title') || 'Privacy Policy'}
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-3.5 text-sm text-gray-600 leading-relaxed">
          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl text-xs sm:text-sm text-slate-700 font-medium">
            {t('privacyModal.intro') || 'This Privacy Policy explains how TechArtha collects, uses, safeguards, and processes your personal and financial information when using our platform.'}
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
            {t('common.close') || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
