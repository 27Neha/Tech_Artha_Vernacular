'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const SIP_DATES = [1, 5, 10, 15, 20, 25];

const BUCKET_NAMES: Record<string, string> = {
  stable: 'Stable Income Bucket',
  balanced: 'Balanced Growth Bucket',
  high: 'High Growth Bucket',
};

const GOAL_NAMES: Record<string, string> = {
  home: 'Buy a Home', education: "Child's Education", marriage: 'Marriage',
  retirement: 'Retirement', travel: 'Dream Travel', emergency: 'Emergency Fund',
  car: 'Buy a Car', wealth: 'Wealth Creation',
};

function PlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const goal = searchParams.get('goal') ?? 'wealth';
  const bucket = searchParams.get('bucket') ?? 'balanced';
  const [sipDate, setSipDate] = useState(10);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!consent) { setError('Please accept the consent to proceed.'); return; }
    setError('');
    setLoading(true);
    try {
      const userId = localStorage.getItem('user_id');
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/goals/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId, name: goal, targetAmount: 1500000,
          timePeriod: 8, bucketName: bucket, sipDate, consent
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create goal');
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
        <button onClick={() => router.back()} className="text-4xl text-[var(--dark)] leading-none">‹</button>
        <span className="font-extrabold text-[var(--dark)]">Your Investment Plan</span>
        <span className="w-6" />
      </div>

      <div className="flex-1 p-5 overflow-y-auto">
        {/* Summary Card */}
        <div className="card mb-6">
          {[
            { label: 'GOAL', value: GOAL_NAMES[goal] ?? goal },
            { label: 'Target Amount', value: '₹15,00,000' },
            { label: 'Time Period', value: '8 years' },
            { label: 'Investment Bucket', value: BUCKET_NAMES[bucket] },
          ].map((row, i, arr) => (
            <div key={row.label}>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-500 text-sm">{row.label}</span>
                <span className="text-[var(--dark)] font-bold text-sm text-right max-w-[55%]">{row.value}</span>
              </div>
              {i < arr.length - 1 && <div className="h-px bg-gray-100" />}
            </div>
          ))}
          <div className="h-px bg-gray-100" />
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-500 text-sm">Monthly SIP</span>
            <span className="text-[var(--primary)] font-extrabold text-xl">₹9,286 / mo</span>
          </div>
        </div>

        {/* SIP Date */}
        <h3 className="font-bold text-[var(--dark)] mb-3">Choose SIP Date</h3>
        <div className="flex gap-3 mb-6 flex-wrap">
          {SIP_DATES.map((d) => (
            <button
              key={d}
              onClick={() => setSipDate(d)}
              className={`w-12 h-12 rounded-full font-bold text-base transition-all ${
                sipDate === d ? 'bg-[var(--primary)] text-white' : 'bg-white border border-gray-200 text-[var(--dark)]'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <p className="text-amber-700 text-sm leading-relaxed">
            ⚠️ Mutual fund investments are subject to market risks. Returns shown are illustrative only. Please read all scheme-related documents before investing.
          </p>
        </div>

        {/* Consent */}
        <button
          onClick={() => setConsent(!consent)}
          className="flex items-start gap-3 text-left w-full mb-6"
        >
          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${consent ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-gray-300'}`}>
            {consent && <span className="text-white text-xs font-bold">✓</span>}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            I have read and understood the investment plan and confirm my consent to start the SIP.
          </p>
        </button>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button onClick={handleConfirm} disabled={loading} className="btn-primary mb-3">
          <span>{loading ? 'Setting up...' : 'Confirm & Start SIP 🚀'}</span>
          <span>→</span>
        </button>
        <button onClick={() => router.back()} className="btn-outline">
          Modify Plan
        </button>
      </div>
    </div>
  );
}

export default function PlanPage() {
  return <Suspense><PlanContent /></Suspense>;
}
