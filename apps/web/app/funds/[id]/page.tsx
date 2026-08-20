'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function FundDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [investorProfile, setInvestorProfile] = useState<string>('');

  useEffect(() => {
    setInvestorProfile(localStorage.getItem('investorProfile') || '');
  }, []);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`${API_URL}/funds/${params.id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setDetails(data);
      } catch {
        setError('Fund data is temporarily unavailable.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen p-6 justify-center items-center bg-white">
        <div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
        <p className="mt-4 text-gray-500 font-bold">Loading fund details...</p>
      </div>
    );
  }

  if (error || !details?.data) {
    return (
      <div className="flex flex-col min-h-screen p-6 justify-center items-center bg-white text-center">
        <span className="text-5xl">⚠️</span>
        <p className="mt-4 text-red-500 font-bold">{error || 'Fund not found.'}</p>
        <button onClick={() => router.back()} className="mt-6 btn-outline w-auto px-6 py-2">Go Back</button>
      </div>
    );
  }

  const meta = details.meta;
  const navHistory = details.data;
  const latestNav = navHistory[0] ?? { nav: 'N/A', date: 'N/A' };

  const isModerate = investorProfile.toUpperCase() === 'MODERATE';
  const isHighRiskCategory = meta.scheme_category?.toLowerCase().includes('equity') || meta.scheme_category?.toLowerCase().includes('small cap');
  const showRiskWarning = isModerate && isHighRiskCategory;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {showRiskWarning && (
        <div className="bg-amber-100 border-l-4 border-amber-500 p-4 m-4 rounded-r-md">
          <div className="flex items-center">
            <span className="text-amber-500 text-xl mr-3">⚠</span>
            <p className="text-amber-800 font-bold text-sm">Higher Risk Selection</p>
          </div>
          <p className="text-amber-700 text-xs mt-1">This fund's category is higher risk than your 'Moderate' profile suggests.</p>
        </div>
      )}

      <div className="p-6 pb-4 border-b border-gray-100">
        <h1 className="text-2xl font-extrabold text-[var(--dark)] leading-tight">{meta.scheme_name}</h1>
        <p className="text-sm text-gray-500 mt-2">{meta.fund_house} • {meta.scheme_category}</p>
        <p className="text-xs font-semibold bg-gray-100 text-gray-600 inline-block px-2 py-1 rounded-md mt-3">{meta.scheme_type}</p>
      </div>

      <div className="p-6">
        <div className="card bg-[var(--primary-light)] border-none mb-6">
          <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-wide">Latest NAV</p>
          <div className="flex items-end gap-3 mt-1">
            <span className="text-4xl font-extrabold text-[var(--dark)]">₹{latestNav.nav}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2 font-semibold">As of: {latestNav.date}</p>
        </div>

        <h3 className="font-bold text-[var(--dark)] mb-4">Historical NAV</h3>
        {navHistory.length < 5 ? (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-sm text-amber-800 font-semibold">Insufficient historical data to render chart.</p>
          </div>
        ) : (
          <div className="h-48 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center mb-6 relative overflow-hidden">
             {/* A placeholder for the actual charting library. Since we don't have chart.js installed, we render a CSS mock graph based on the real data array length */}
             <div className="absolute bottom-0 left-0 right-0 flex items-end h-32 px-4 gap-1 opacity-20">
                {navHistory.slice(0, 30).reverse().map((point: any, i: number) => (
                  <div key={i} className="flex-1 bg-[var(--primary)] rounded-t-sm" style={{ height: `${Math.min(100, Math.max(10, parseFloat(point.nav)))}%` }} />
                ))}
             </div>
             <p className="text-sm font-bold text-[var(--primary)] z-10">Chart uses actual {navHistory.length} data points</p>
          </div>
        )}

        <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Important Financial Disclaimer</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Mutual fund investments are subject to market risks. Read all scheme related documents carefully. Past performance is not indicative of future returns. For informational/suitability review only.
          </p>
        </div>
      </div>

      <div className="mt-auto p-6 border-t border-gray-100 bg-white flex gap-3">
        <button onClick={() => {
          const currentBucket = JSON.parse(localStorage.getItem('customBucketFunds') || '[]');
          if (!currentBucket.find((f: any) => f.id === params.id)) {
            currentBucket.push({ id: params.id, name: meta.scheme_name, category: meta.scheme_category, percentage: 0 });
            localStorage.setItem('customBucketFunds', JSON.stringify(currentBucket));
          }
          router.push('/buckets/custom');
        }} className="flex-1 py-3 px-4 bg-white border-2 border-[var(--primary)] text-[var(--primary)] rounded-xl font-bold hover:bg-[var(--primary-light)] transition-colors text-center">
          Add to Bucket
        </button>
        <button onClick={() => router.push('/dashboard/portfolio')} className="flex-1 btn-primary text-center">
          Invest Now →
        </button>
      </div>
    </div>
  );
}
