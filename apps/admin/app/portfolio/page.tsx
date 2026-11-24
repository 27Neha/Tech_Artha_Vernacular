'use client';

import React, { useState, useEffect } from 'react';
import { adminApi, PortfolioOverviewItem } from '@/lib/api';
import { PieChart, RefreshCw, Search, TrendingUp, TrendingDown, Clock } from 'lucide-react';

export default function PortfolioPage() {
  const [data, setData] = useState<PortfolioOverviewItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchPortfolios = async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getPortfolioOverview({
        page,
        limit: 15,
        search: search.trim() || undefined,
      });
      setData(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load portfolios', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolios(1);
  }, []);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#3C3985] uppercase tracking-wider mb-1">
            <PieChart className="w-4 h-4" />
            <span>Asset Under Management (AUM)</span>
          </div>
          <h1 className="text-2xl font-black text-[#102A54] tracking-tight">
            Investor Portfolios & Valuations
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            CAMS/KFintech CAS synced portfolios, real-time NAV valuations, and unrealized returns across all users.
          </p>
        </div>

        <button
          onClick={() => fetchPortfolios(pagination.page)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Sync Portfolios</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by investor name, mobile, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchPortfolios(1)}
            className="w-full bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl focus:bg-white focus:outline-none focus:border-[#3C3985]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-5">Investor</th>
                <th className="py-3 px-5">Invested Cost</th>
                <th className="py-3 px-5">Current Valuation</th>
                <th className="py-3 px-5">Unrealized Gain / Loss</th>
                <th className="py-3 px-5">Holdings Count</th>
                <th className="py-3 px-5 text-right">Last RTA Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400">
                    <div className="w-5 h-5 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading portfolio valuations...</span>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400">
                    No investor portfolios found.
                  </td>
                </tr>
              ) : (
                data.map((item) => {
                  const isPositive = item.unrealizedGainLoss >= 0;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-5">
                        <p className="font-bold text-gray-900">{item.user?.fullName || 'Investor'}</p>
                        <p className="text-[11px] text-gray-400">{item.user?.mobile || item.user?.email || '—'}</p>
                      </td>

                      <td className="py-3.5 px-5 font-bold font-mono text-gray-800">
                        {formatCurrency(item.totalInvested)}
                      </td>

                      <td className="py-3.5 px-5 font-bold font-mono text-gray-900 text-sm">
                        {formatCurrency(item.currentValue)}
                      </td>

                      <td className="py-3.5 px-5">
                        <div
                          className={`inline-flex items-center gap-1 font-mono font-bold text-xs ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isPositive ? '+' : ''}
                            {formatCurrency(item.unrealizedGainLoss)} ({item.gainLossPercentage}%)
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <span className="font-mono text-gray-700 font-bold px-2 py-0.5 rounded bg-gray-100 text-[11px]">
                          {item.holdingsCount || 0} Schemes
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right text-gray-400 font-mono text-[11px]">
                        {item.lastSyncedAt
                          ? new Date(item.lastSyncedAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Live Synced'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total portfolios)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchPortfolios(pagination.page - 1)}
                className="px-3 py-1 bg-gray-100 rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchPortfolios(pagination.page + 1)}
                className="px-3 py-1 bg-gray-100 rounded-lg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
