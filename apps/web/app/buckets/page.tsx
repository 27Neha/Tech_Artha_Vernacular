'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';

const BUCKETS = [
  { id: 'stable', name: 'Stable Income Bucket', desc: 'Low risk, steady returns. Ideal for short-term goals.', risk: 'Conservative', color: 'bg-green-50 border-green-200 text-green-700' },
  { id: 'balanced', name: 'Balanced Growth Bucket', desc: 'Mix of equity and debt. Balances risk and return.', risk: 'Moderate', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'high', name: 'High Growth Bucket', desc: 'High equity exposure. Best for long-term wealth creation.', risk: 'Aggressive', color: 'bg-orange-50 border-orange-200 text-orange-700' }
];


const autoBalance = (funds: any[]) => {
  if (funds.length === 0) return [];
  const equalShare = Math.floor(100 / funds.length);
  let remainder = 100 % funds.length;
  return funds.map(f => {
    let p = equalShare;
    if (remainder > 0) {
      p += 1;
      remainder -= 1;
    }
    return { ...f, percentage: p };
  });
};

function BucketsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const goal = searchParams.get('goal') ?? 'wealth';
  
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBuckets = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/buckets`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setBuckets(data.buckets || []);
      } catch {
        console.error("Failed to fetch buckets");
      } finally {
        setLoading(false);
      }
    };
    fetchBuckets();
  }, []);

  return (
    <div className="flex flex-col min-h-screen p-6 bg-white">
                  <div className="flex items-center justify-between py-5 mb-4">
        <div 
          onClick={() => router.push('/funds')}
          className="w-full flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-200 transition-all shadow-inner"
        >
          <span className="text-gray-400 text-lg">🔍</span>
          <span className="text-gray-400 font-bold">Search for specific mutual funds...</span>
        </div>
      </div>

      <h1 className="text-3xl font-extrabold text-[var(--dark)] mb-2">Choose your Bucket</h1>
      <p className="text-gray-500 mb-8">Based on your profile, here are the investment buckets available for you.</p>

      {loading ? (
        <div className="flex justify-center mt-12"><div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" /></div>
      ) : (
        <div className="flex flex-col gap-5">
          {Array.isArray(buckets) && buckets.map(b => (
            <div
              key={b.id}
              className={`p-5 rounded-2xl border-2 transition-all text-left relative ${
                b.recommended ? 'border-[var(--primary)] shadow-md' : 'border-gray-100 hover:border-[var(--primary-light)]'
              }`}
            >
              {b.recommended && (
                <span className="absolute -top-3 left-4 bg-[var(--orange)] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  Recommended
                </span>
              )}
                            <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-[var(--dark)]">{b.name}</h3>
                {b.bucketRiskLevel && (
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {b.bucketRiskLevel}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-3">{b.explanation}</p>
              
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                 <p className="text-xs font-bold text-gray-500 uppercase mb-2">Recommended Funds</p>
                 {b.recommendedFunds?.map((f: any) => (
                   <div key={f.schemeCode} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0 cursor-pointer hover:text-[var(--primary)]" onClick={() => router.push(`/funds/${f.schemeCode}`)}>
                      <div className="flex-1 pr-2 min-w-0">
                        <p className="text-sm font-bold truncate">{f.name}</p>
                        <p className="text-xs text-gray-400 truncate">{f.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2">
                        <p className="text-sm font-bold text-[var(--primary)]">₹{f.nav ? parseFloat(f.nav).toFixed(2) : 'N/A'}</p>
                        <p className="text-[10px] text-gray-400">{f.navDate}</p>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    let customFunds = (b.recommendedFunds || []).map((f: any) => ({
                      id: f.schemeCode,
                      name: f.name,
                      category: f.category,
                      percentage: 0
                    }));
                    customFunds = autoBalance(customFunds);
                    localStorage.setItem('customBucketFunds', JSON.stringify(customFunds));
                    router.push('/buckets/custom');
                  }} 
                  className="flex-1 py-3 bg-white border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary-light)] rounded-xl font-bold"
                >
                  Edit Bucket
                </button>
                <button onClick={() => router.push(`/plan?goal=${goal}&bucket=${b.id}`)} className="flex-1 py-3 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl font-bold">
                  Select
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
