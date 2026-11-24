'use client';

import React, { useState, useEffect } from 'react';
import { adminApi, FinancialGoalItem } from '@/lib/api';
import { Target, RefreshCw, Search, CheckCircle2, TrendingUp, Calendar } from 'lucide-react';

export default function GoalsPage() {
  const [data, setData] = useState<FinancialGoalItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchGoals = async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getFinancialGoals({
        page,
        limit: 15,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
      });
      setData(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load financial goals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals(1);
  }, [statusFilter]);

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
            <Target className="w-4 h-4" />
            <span>Goal-Based Wealth Creation</span>
          </div>
          <h1 className="text-2xl font-black text-[#102A54] tracking-tight">
            Investor Financial Goals
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Live corpus tracking, monthly SIP commitments, and target completion percentages across all investors.
          </p>
        </div>

        <button
          onClick={() => fetchGoals(pagination.page)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Goals</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by goal title, investor name, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchGoals(1)}
            className="w-full bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl focus:bg-white focus:outline-none focus:border-[#3C3985]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['ALL', 'ACTIVE', 'PAUSED', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all ${
                statusFilter === st
                  ? 'bg-[#3C3985] text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-5">Goal Title & Investor</th>
                <th className="py-3 px-5">Target Corpus</th>
                <th className="py-3 px-5">Current Corpus</th>
                <th className="py-3 px-5">Monthly SIP</th>
                <th className="py-3 px-5">Progress</th>
                <th className="py-3 px-5">Horizon</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <div className="w-5 h-5 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading financial goal records...</span>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    No investor goals found.
                  </td>
                </tr>
              ) : (
                data.map((item) => {
                  const pct = Math.min(
                    100,
                    item.targetAmount > 0
                      ? Math.round((item.currentProgress / item.targetAmount) * 100)
                      : 0,
                  );

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-5">
                        <p className="font-bold text-gray-900">{item.name}</p>
                        <p className="text-[11px] text-gray-400">
                          {item.user?.fullName || 'Investor'} ({item.user?.mobile || item.user?.email || '—'})
                        </p>
                      </td>

                      <td className="py-3.5 px-5 font-bold font-mono text-gray-900">
                        {formatCurrency(item.targetAmount)}
                      </td>

                      <td className="py-3.5 px-5 font-bold font-mono text-emerald-700">
                        {formatCurrency(item.currentProgress)}
                      </td>

                      <td className="py-3.5 px-5 font-mono text-gray-700">
                        {formatCurrency(item.monthlySip)}/mo
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[#3C3985] h-1.5 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-bold font-mono text-[11px] text-gray-700">{pct}%</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{item.timePeriod} Yrs</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                            item.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.status === 'COMPLETED'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {item.status}
                        </span>
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
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total goals)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchGoals(pagination.page - 1)}
                className="px-3 py-1 bg-gray-100 rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchGoals(pagination.page + 1)}
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
