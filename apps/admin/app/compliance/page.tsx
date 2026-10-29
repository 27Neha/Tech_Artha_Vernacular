'use client';

import React, { useState, useEffect } from 'react';
import { adminApi, ComplianceRecordItem } from '@/lib/api';
import { ShieldAlert, RefreshCw, Search, CheckCircle2, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';

export default function CompliancePage() {
  const [data, setData] = useState<ComplianceRecordItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchRecords = async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getComplianceRecords({
        page,
        limit: 15,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
      });
      setData(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load compliance records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(1);
  }, [statusFilter]);

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#3C3985] uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>SEBI & PMLA Surveillance</span>
          </div>
          <h1 className="text-2xl font-black text-[#102A54] tracking-tight">
            Compliance & AML Watchlist Checks
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Politically Exposed Persons (PEP) screenings, SEBI debarred entities matching, and AML threshold vigilance.
          </p>
        </div>

        <button
          onClick={() => fetchRecords(pagination.page)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Surveillance</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by check type, investor, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchRecords(1)}
            className="w-full bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl focus:bg-white focus:outline-none focus:border-[#3C3985]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['ALL', 'PASSED', 'FLAGGED', 'INVESTIGATING'].map((st) => (
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
                <th className="py-3 px-5">Investor</th>
                <th className="py-3 px-5">Check Type</th>
                <th className="py-3 px-5">Severity</th>
                <th className="py-3 px-5">Surveillance Result</th>
                <th className="py-3 px-5">Source & Details</th>
                <th className="py-3 px-5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400">
                    <div className="w-5 h-5 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading surveillance checks...</span>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400">
                    No compliance records or AML flags found.
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
                      <span className="font-mono text-xs font-bold text-gray-800">
                        {item.checkType}
                      </span>
                    </td>

                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityBadge(
                          item.severity,
                        )}`}
                      >
                        {item.severity}
                      </span>
                    </td>

                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                          item.status === 'PASSED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {item.status === 'PASSED' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        <span>{item.status}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-gray-600">
                      <p className="text-xs">{item.details}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">Source: {item.source}</p>
                    </td>

                    <td className="py-3.5 px-5 text-right text-gray-400 font-mono text-[11px]">
                      {new Date(item.timestamp).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
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
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total checks)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchRecords(pagination.page - 1)}
                className="px-3 py-1 bg-gray-100 rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchRecords(pagination.page + 1)}
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
