'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function KycPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pan, setPan] = useState('');
  const [dob, setDob] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [checkingStatus, setCheckingStatus] = useState(true);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setCheckingStatus(false);
          return;
        }
        const res = await fetch(`${API_URL}/api/v1/kyc/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.status) {
            setExistingStatus(data.status);
            if (data.status === 'VERIFIED' || data.status === 'IN_PROGRESS') {
              router.push('/profile-setup');
              return;
            }
          }
        }
      } catch (e) {
        console.error('Failed to check KYC status', e);
      }
      setCheckingStatus(false);
    };
    checkStatus();
  }, [router]);

  if (checkingStatus) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div></div>;
  }


  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) { setError('Please enter your full name.'); return; }
    if (!dob) { setError('Please enter your date of birth.'); return; }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase())) {
      setError('Please enter a valid PAN number (e.g. ABCDE1234F).'); return;
    }
    if (!consent) { setError('Please accept the consent to proceed.'); return; }

    setLoading(true);
    try {
      const userId = localStorage.getItem('user_id');
      const token = localStorage.getItem('access_token');
      const mobile = localStorage.getItem('mobile');
      const res = await fetch(`${API_URL}/api/v1/kyc/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName: name, pan: pan.toUpperCase(), dob }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'KYC failed');
      router.push('/profile-setup');
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
        
        <span className="font-extrabold text-[var(--dark)]">Identity Verification</span>
        <span className="text-[var(--orange)] text-sm font-bold">English</span>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="page-title">Verify your identity</h1>
        <p className="page-desc">We need a few details to complete your KYC as required by SEBI regulations.</p>

        {/* Steps */}
        <div className="flex gap-4 mt-6 mb-8">
          {['Personal Info', 'PAN Card', 'Consent'].map((step, i) => (
            <div key={i} className="flex-1 text-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 text-sm font-bold ${i < 3 ? 'bg-[var(--orange)] text-white' : 'bg-gray-200 text-gray-400'}`}>
                {i + 1}
              </div>
              <p className="text-xs text-gray-500">{step}</p>
            </div>
          ))}
        </div>

        <label className="label">Full name (as per PAN)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Priya Sharma"
          className="input-field"
        />

        <label className="label mt-4">Date of Birth</label>
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className="input-field font-bold"
        />
        <label className="label mt-4">PAN Number</label>
        <input
          type="text"
          value={pan}
          onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
          placeholder="e.g. ABCDE1234F"
          className="input-field tracking-widest font-bold"
        />
        <p className="text-xs text-gray-400 mt-1">Your PAN is encrypted and never shared with third parties.</p>

        <div className="mt-6 bg-[var(--primary-light)] rounded-2xl p-4 border border-[var(--primary)]/20">
          <p className="text-[var(--primary)] font-bold text-sm mb-2">🔒 Why we need this</p>
          <p className="text-gray-600 text-sm leading-relaxed">
            SEBI mandates KYC for all mutual fund investments. Your data is secured with bank-grade encryption.
          </p>
        </div>

        {/* Consent */}
        <button
          onClick={() => setConsent(!consent)}
          className="flex items-start gap-3 mt-6 text-left w-full"
        >
          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${consent ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-gray-300'}`}>
            {consent && <span className="text-white text-xs font-bold">✓</span>}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            I consent to the verification of my identity and agree to the processing of my personal data for KYC compliance as per SEBI guidelines.
          </p>
        </button>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary mt-8"
        >
          <span>{loading ? 'Verifying...' : 'Verify & Continue'}</span>
          <span>→</span>
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          Powered by Cybrilla · Bank-grade security
        </p>
      </div>
    </div>
  );
}
