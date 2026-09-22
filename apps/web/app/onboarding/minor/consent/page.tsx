
'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function Consent() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConsent = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/api/v1/minor/guardian/consent`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      router.push('/onboarding/minor/review');
    } catch (e) {
      alert("Error saving consent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full mt-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-[var(--dark)] mb-6">{t('minor.consentTitle')}</h2>
      
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 text-sm text-gray-700 leading-relaxed max-h-[40vh] overflow-y-auto shadow-inner">
        <p className="mb-4">{t('minor.consentP1')}</p>
        <p className="mb-4">{t('minor.consentP2')}</p>
        <p className="mb-4">{t('minor.consentP3')}</p>
        <p>{t('minor.consentP4')}</p>
      </div>

      <label className="flex items-start gap-3 p-4 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
        <div className="pt-0.5">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
        </div>
        <span className="text-sm font-medium text-[var(--dark)]">{t('minor.consentP5')}</span>
      </label>

      <button onClick={handleConsent} disabled={loading || !agreed} className="btn-primary mt-auto">
        {loading ? 'Saving...' : 'Accept & Continue'}
      </button>
    </div>
  );
}
