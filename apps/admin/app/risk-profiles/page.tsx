'use client';

import React, { useState, useEffect } from 'react';
import { adminApi, RiskProfileItem } from '@/lib/api';
import { Target, RefreshCw, Search, Shield, User, Clock } from 'lucide-react';

export default function RiskProfilesPage() {
  const [data, setData] = useState<RiskProfileItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchRiskProfiles = async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getRiskProfiles({
        page,
        limit: 15,
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        search: search.trim() || undefined,
      });
      setData(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load risk profiles', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskProfiles(1);
  }, [categoryFilter]);

  const getCategoryBadge = (category: string) => {
    switch (category?.toUpperCase()) {
      case 'CONSERVATIVE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'MODERATE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'AGGRESSIVE':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#3C3985] uppercase tracking-wider mb-1">
            <Target className="w-4 h-4" />
            <span>Suitability & Advisory</span>
          </div>
          <h1 className="text-2xl font-black text-[#102A54] tracking-tight">
            Investor Risk Profiles
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            SEBI suitability assessment scores, risk appetite classifications, and asset allocation buckets.
          </p>
        </div>

        <button
          onClick={() => fetchRiskProfiles(pagination.page)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Profiles</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by investor name, mobile, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchRiskProfiles(1)}
            className="w-full bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl focus:bg-white focus:outline-none focus:border-[#3C3985]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['ALL', 'CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all ${
                categoryFilter === cat
                  ? 'bg-[#3C3985] text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {cat}
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
                <th className="py-3 px-5">Investor</th>
                <th className="py-3 px-5">Risk Category</th>
                <th className="py-3 px-5">Risk Score</th>
                <th className="py-3 px-5">Investment Horizon</th>
                <th className="py-3 px-5">Market Knowledge</th>
                <th className="py-3 px-5 text-right">Assessed On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400">
                    <div className="w-5 h-5 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading risk profile evaluations...</span>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400">
                    No investor risk profiles found matching your criteria.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-gray-900">{item.user?.fullName || 'Investor'}</p>
                      <p className="text-[11px] text-gray-400">{item.user?.mobile || item.user?.email || '—'}</p>
                    </td>

                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase border ${getCategoryBadge(
                          item.category,
                        )}`}
                      >
                        {item.category || 'MODERATE'}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 font-mono">
                      <span className="font-bold text-gray-900 text-sm">{item.score}</span>
                      <span className="text-gray-400 text-xs">/100</span>
                    </td>

                    <td className="py-3.5 px-5 text-gray-700">{item.horizon || '3 - 5 Years'}</td>

                    <td className="py-3.5 px-5 text-gray-600">{item.knowledgeLevel || 'Intermediate'}</td>

                    <td className="py-3.5 px-5 text-right text-gray-400 font-mono text-[11px]">
                      {new Date(item.updatedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total profiles)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchRiskProfiles(pagination.page - 1)}
                className="px-3 py-1 bg-gray-100 rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchRiskProfiles(pagination.page + 1)}
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
