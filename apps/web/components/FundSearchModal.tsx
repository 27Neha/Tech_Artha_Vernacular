'use client';
import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export default function FundSearchModal({
  isOpen,
  onClose,
  onSelectFund
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectFund: (fundDetails: any) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/funds/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (schemeCode: number) => {
    setEvaluating(String(schemeCode));
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/buckets/evaluate-fund?schemeCode=${schemeCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const evaluatedFund = await res.json();
        onSelectFund(evaluatedFund);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEvaluating(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-xl text-gray-500 rounded-full hover:bg-gray-50">
          ←
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search mutual funds..."
            className="w-full bg-gray-100 border-none rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--primary)]"
            autoFocus
          />
        </div>
        <button onClick={handleSearch} className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-bold rounded-xl">
          Search
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {loading ? (
          <div className="flex justify-center mt-12"><div className="w-8 h-8 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" /></div>
        ) : results.length > 0 ? (
          <div className="flex flex-col gap-3">
            {results.map((f: any) => (
              <div key={f.schemeCode} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-900 text-sm leading-tight mb-1"><span>{f.schemeName}</span></h4>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-500">Code: <span>{f.schemeCode}</span></span>
                  <button 
                    onClick={() => handleSelect(f.schemeCode)}
                    disabled={evaluating === String(f.schemeCode)}
                    className="px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 disabled:opacity-50"
                  >
                    {evaluating === String(f.schemeCode) ? 'Analyzing...' : 'Select Fund'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : query && !loading ? (
          <div className="text-center mt-12 text-gray-500 text-sm font-bold">No funds found.</div>
        ) : (
          <div className="text-center mt-12 text-gray-400 text-sm">Enter a fund name to search the universe.</div>
        )}
      </div>
    </div>
  );
}
