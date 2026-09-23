
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function Review() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);
  const [kycLoading, setKycLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/v1/minor/onboarding/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStatus(data);
    };
    fetchStatus();
  }, []);

  const handleStartKyc = async () => {
    setKycLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      // For minors, KycService will automatically use the Guardian's PAN.
      // We pass dummy values here because they are resolved by the backend.
      const res = await fetch(`${API_URL}/api/v1/kyc/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fullName: 'Minor Flow', pan: 'DEFAULT123', dob: '2000-01-01' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error starting KYC');
      alert("Provider KYC state: " + data.status + (data.failureReason ? " - " + data.failureReason : ""));
      // Next steps would be E-Sign or Bank setup
      router.push('/kyc'); // Route to existing KYC screen which will now poll status
    } catch (e: any) {
      alert(e.message);
    } finally {
      setKycLoading(false);
    }
  };

  if (!status) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="flex flex-col h-full mt-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-[var(--dark)] mb-6">{t('minor.everythingReady')}</h2>
      
      <div className="space-y-4 flex-1">
        <div className="p-4 border border-green-100 bg-green-50 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">👤</span>
            <div>
              <p className="font-semibold text-green-900">{t('minor.minorProfile')}</p>
              <p className="text-xs text-green-700">{t('minor.completedStatus')}</p>
            </div>
          </div>
          <span className="text-green-600">✓</span>
        </div>

        <div className="p-4 border border-green-100 bg-green-50 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">💸</span>
            <div>
              <p className="font-semibold text-green-900">{t('minor.investorProfileReview')}</p>
              <p className="text-xs text-green-700">{status.riskCategory}</p>
            </div>
          </div>
          <span className="text-green-600">✓</span>
        </div>

        <div className="p-4 border border-green-100 bg-green-50 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">👨‍👩‍👧</span>
            <div>
              <p className="font-semibold text-green-900">{t('minor.guardianVerification')}</p>
              <p className="text-xs text-green-700">{t('minor.otpVerified')}</p>
            </div>
          </div>
          <span className="text-green-600">✓</span>
        </div>

        <div className="p-4 border border-green-100 bg-green-50 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">📝</span>
            <div>
              <p className="font-semibold text-green-900">{t('minor.consentText')}</p>
              <p className="text-xs text-green-700">{t('minor.digitallySigned')}</p>
            </div>
          </div>
          <span className="text-green-600">✓</span>
        </div>
      </div>

      <button onClick={handleStartKyc} disabled={kycLoading} className="btn-primary mt-8">
        {kycLoading ? 'Processing with Cybrilla...' : 'Continue to Investment Setup'}
      </button>
    </div>
  );
}
