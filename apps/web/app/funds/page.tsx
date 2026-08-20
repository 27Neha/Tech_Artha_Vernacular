'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function FundsPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recommended, setRecommended] = useState<any[]>([]);

  useEffect(() => {
    // Fetch user's recommended funds from the buckets API to replace hardcoded chips
    const fetchRecs = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/buckets`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        // Extract funds from the recommended bucket
        const recBucket = data.buckets?.find((b: any) => b.recommended);
        if (recBucket?.recommendedFunds) {
          setRecommended(recBucket.recommendedFunds);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchRecs();
  }, []);

  const search = async (q: string) => {
    if (!q.trim()) { setFunds([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/funds/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setFunds(data?.items ?? []);
    } catch {
      setFunds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => search(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB]">
      {/* Search Header - Made extremely visible to ensure it's not hidden */}
      <div className="p-4 bg-[var(--primary)] shadow-md z-10 relative">
        <h2 className="text-white font-extrabold text-lg mb-3">Fund Discovery</h2>
        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 shadow-inner">
          <span className="text-gray-400 text-lg">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search mutual funds..."
            className="flex-1 bg-transparent text-[var(--dark)] placeholder-gray-400 focus:outline-none font-bold"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">✖</button>
          )}
        </div>
      </div>

      {/* Risk Filters */}
      <div className="flex gap-2 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto">
        {['All', 'Conservative', 'Moderate', 'Aggressive'].map((risk) => (
          <button
            key={risk}
            onClick={() => setRiskFilter(risk === 'All' ? '' : risk)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
              (risk === 'All' && !riskFilter) || riskFilter === risk
                ? 'bg-[var(--primary)] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {risk}
          </button>
        ))}
      </div>

      <div className="flex-1 p-5">
        {!query && (
          <div className="mt-4">
            <h3 className="font-extrabold text-[var(--dark)] mb-4 text-lg">Recommended For You</h3>
            {recommended.length > 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-gray-500 mb-2">Based on your risk profile and horizon:</p>
                {recommended.map((f: any, i: number) => (
                  <div key={i} className="card bg-white hover:border-[var(--primary)] cursor-pointer transition-all shadow-sm border border-gray-100 p-4 rounded-xl" onClick={() => router.push(`/funds/${f.schemeCode}`)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4 min-w-0">
                        <p className="font-bold text-[var(--dark)] text-sm leading-tight truncate">{f.name}</p>
                        <p className="text-gray-400 text-xs mt-1 bg-gray-50 inline-block px-2 py-1 rounded-md truncate">{f.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2">
                        <p className="text-[var(--primary)] font-extrabold text-sm">₹{f.nav ? parseFloat(f.nav).toFixed(2) : 'N/A'}</p>
                        <span className="text-[var(--primary)] font-extrabold text-lg block mt-2">→</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center mt-12 opacity-50">
                <span className="text-4xl block mb-3">📊</span>
                <p className="text-sm font-bold">Complete your profile to see recommendations</p>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="flex justify-center mt-12">
            <div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && query && funds.length > 0 && (
          <div className="flex flex-col gap-3 mt-4">
            <h3 className="font-extrabold text-[var(--dark)] mb-2 text-sm text-gray-500 uppercase">Search Results</h3>
            {funds.map((f: any, i: number) => (
              <div key={i} className="card bg-white hover:border-[var(--primary)] cursor-pointer transition-all shadow-sm border border-gray-100 p-4 rounded-xl" onClick={() => router.push(`/funds/${f.schemeCode}`)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4 min-w-0">
                    <p className="font-bold text-[var(--dark)] text-sm leading-tight truncate">{f.schemeName}</p>
                    <p className="text-gray-400 text-xs mt-1">Scheme Code: {f.schemeCode}</p>
                  </div>
                  <div className="text-right flex items-center h-full">
                    <span className="text-[var(--primary)] text-xl font-bold">→</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && query && funds.length === 0 && (
          <div className="text-center mt-16">
            <span className="text-5xl">😕</span>
            <p className="text-[var(--dark)] font-bold mt-4">No funds found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different search term via MFAPI</p>
          </div>
        )}
      </div>
    </div>
  );
}
