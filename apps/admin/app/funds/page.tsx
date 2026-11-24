'use client';

import React, { useState } from 'react';
import { adminApi } from '@/lib/api';
import { TrendingUp, Search, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';

export default function FundsSchemesPage() {
  const [query, setQuery] = useState('Parag Parikh');
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const results = await adminApi.searchFunds(query.trim());
      setFunds(Array.isArray(results) ? results : []);
    } catch (err: any) {
      setError(err.message || 'Failed to search mutual funds database');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black text-[#102A54] tracking-tight">Mutual Funds & Schemes Directory</h1>
          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-[#3C3985] text-[10px] font-bold border border-purple-200">
            AMFI / MFAPI Integration
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Direct scheme discovery, NAV lookups, and AMC metadata across 40,000+ registered Indian mutual funds.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search scheme name or AMFI code (e.g. 'SBI Small Cap', 'HDFC Balanced', '122639')..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:border-[#3C3985]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-[#3C3985] hover:bg-[#2A2761] text-white text-xs font-bold rounded-xl transition-colors shadow-2xs disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search AMFI Schemes'}
          </button>
        </form>
      </div>

      {/* Results */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#102A54] uppercase tracking-wider">
            Matching Schemes ({funds.length})
          </h3>
          <span className="text-[11px] text-gray-400">Live AMFI Data</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Scheme Code</th>
                <th className="py-3 px-4">Scheme Name</th>
                <th className="py-3 px-4 text-right">Operations Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-gray-400">
                    <div className="w-6 h-6 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
                    <span>Querying AMFI registry...</span>
                  </td>
                </tr>
              ) : funds.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-gray-400">
                    {searched
                      ? 'No mutual fund schemes matched your search query.'
                      : 'Type a scheme name above to search funds.'}
                  </td>
                </tr>
              ) : (
                funds.slice(0, 50).map((f) => (
                  <tr key={f.schemeCode} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-[#3C3985]">{f.schemeCode}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{f.schemeName}</td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`https://api.mfapi.in/mf/${f.schemeCode}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:text-[#3C3985]"
                      >
                        <span>AMFI Raw NAV</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
