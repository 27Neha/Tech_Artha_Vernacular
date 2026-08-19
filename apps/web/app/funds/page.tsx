'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function FundsPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (q: string) => {
    if (!q.trim()) { setFunds([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/funds/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setFunds(data?.data ?? []);
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
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white">
        <button onClick={() => router.back()} className="text-4xl text-[var(--dark)] leading-none">‹</button>
        <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
          <span className="text-gray-400">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search mutual funds..."
            className="flex-1 bg-transparent text-[var(--dark)] placeholder-gray-400 focus:outline-none text-sm"
          />
        </div>
      </div>

      <div className="flex-1 p-5">
        {!query && (
          <div className="text-center mt-16">
            <span className="text-6xl">🔍</span>
            <p className="text-[var(--dark)] font-bold text-lg mt-4">Search Mutual Funds</p>
            <p className="text-gray-400 text-sm mt-2">Type a fund name, AMC, or category</p>
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {['Axis Bluechip', 'HDFC Mid Cap', 'SBI Liquid', 'Parag Parikh'].map((s) => (
                <button key={s} onClick={() => setQuery(s)} className="bg-[var(--primary-light)] text-[var(--primary)] text-sm font-semibold px-3 py-2 rounded-xl">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center mt-12">
            <div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && funds.length > 0 && (
          <div className="flex flex-col gap-3">
            {funds.map((f: any, i: number) => (
              <div key={i} className="card hover:border-[var(--primary)] cursor-pointer transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <p className="font-bold text-[var(--dark)] text-sm leading-tight">{f.schemeName ?? f.name}</p>
                    <p className="text-gray-400 text-xs mt-1">{f.fundHouse ?? f.amc} · {f.schemeType ?? f.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[var(--primary)] font-extrabold text-sm">₹{f.nav ?? '---'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">NAV</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && query && funds.length === 0 && (
          <div className="text-center mt-12">
            <span className="text-5xl">😕</span>
            <p className="text-[var(--dark)] font-bold mt-4">No funds found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
}
