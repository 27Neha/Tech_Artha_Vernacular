'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';

const BUCKETS = [
  { id: 'stable', name: 'Stable Income Bucket', desc: 'Low risk, steady returns. Ideal for short-term goals.', risk: 'Conservative', color: 'bg-green-50 border-green-200 text-green-700' },
  { id: 'balanced', name: 'Balanced Growth Bucket', desc: 'Mix of equity and debt. Balances risk and return.', risk: 'Moderate', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'high', name: 'High Growth Bucket', desc: 'High equity exposure. Best for long-term wealth creation.', risk: 'Aggressive', color: 'bg-orange-50 border-orange-200 text-orange-700' }
];

function BucketsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const goal = searchParams.get('goal') ?? 'wealth';
  const [recommended, setRecommended] = useState('balanced');

  useEffect(() => {
    const riskCat = localStorage.getItem('risk_category') || 'MODERATE';
    if (riskCat === 'CONSERVATIVE') setRecommended('stable');
    else if (riskCat === 'AGGRESSIVE') setRecommended('high');
    else setRecommended('balanced');
  }, []);

  return (
    <div className="flex flex-col min-h-screen p-6 bg-white">
      <div className="flex items-center justify-between py-5 mb-4">
        <button onClick={() => router.back()} className="text-4xl text-[var(--dark)] leading-none">‹</button>
      </div>

      <h1 className="text-3xl font-extrabold text-[var(--dark)] mb-2">Choose your Bucket</h1>
      <p className="text-gray-500 mb-8">Based on your profile, here are the investment buckets available for you.</p>

      <div className="flex flex-col gap-5">
        {BUCKETS.map(b => (
          <button
            key={b.id}
            onClick={() => router.push(`/plan?goal=${goal}&bucket=${b.id}`)}
            className={`p-5 rounded-2xl border-2 transition-all text-left relative ${
              recommended === b.id ? 'border-[var(--primary)] shadow-md' : 'border-gray-100 hover:border-[var(--primary-light)]'
            }`}
          >
            {recommended === b.id && (
              <span className="absolute -top-3 left-4 bg-[var(--orange)] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                Recommended
              </span>
            )}
            <h3 className="font-bold text-lg text-[var(--dark)] mb-1">{b.name}</h3>
            <p className="text-sm text-gray-500 mb-3">{b.desc}</p>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${b.color}`}>
              {b.risk}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BucketsPage() {
  return (
    <Suspense>
      <BucketsContent />
    </Suspense>
  );
}
