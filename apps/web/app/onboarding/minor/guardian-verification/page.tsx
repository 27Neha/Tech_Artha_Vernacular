
'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function GuardianVerification() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const mobile = typeof window !== 'undefined' ? localStorage.getItem('guardian_mobile') : '';

  const handleVerify = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/v1/minor/guardian/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ mobile, code })
      });
      if(!res.ok) throw new Error('Invalid OTP');
      router.push('/onboarding/minor/consent');
    } catch (e) {
      alert("Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full mt-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-[var(--dark)] mb-2">{t('minor.verifyGuardian')}</h2>
      <p className="text-gray-500 mb-8">We sent a verification code to {mobile}.</p>
      
      <input type="text" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} className="input-field text-center text-2xl tracking-widest font-bold" placeholder="------" />
      
      <button onClick={handleVerify} disabled={loading || code.length !== 6} className="btn-primary mt-auto">
        {loading ? 'Verifying...' : 'Verify'}
      </button>
    </div>
  );
}
