'use client';

import React, { useState, useEffect } from 'react';
import { adminApi, SipManagementItem } from '@/lib/api';
import { Repeat, RefreshCw, Search, CheckCircle2, AlertCircle, Clock, Calendar } from 'lucide-react';

export default function SipManagementPage() {
  const [data, setData] = useState<SipManagementItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchSips = async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getSipManagement({
        page,
        limit: 15,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
      });
      setData(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load SIPs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSips(1);
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
            <Repeat className="w-4 h-4" />
            <span>Recurring Mandates</span>
          </div>
          <h1 className="text-2xl font-black text-[#102A54] tracking-tight">
            Systematic Investment Plans (SIP)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Scheduled monthly auto-debits, NACH/NPCI mandate approvals, and installment execution telemetry.
          </p>
        </div>

        <button
          onClick={() => fetchSips(pagination.page)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh SIPs</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by scheme name, investor, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchSips(1)}
            className="w-full bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl focus:bg-white focus:outline-none focus:border-[#3C3985]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['ALL', 'ACTIVE', 'PAUSED', 'CANCELLED'].map((st) => (
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
                <th className="py-3 px-5">Target Fund / Scheme</th>
                <th className="py-3 px-5">Installment Amount</th>
                <th className="py-3 px-5">Debit Day</th>
                <th className="py-3 px-5">e-Mandate</th>
                <th className="py-3 px-5">Next Debit</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <div className="w-5 h-5 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading SIP schedules...</span>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    No SIP mandates found matching your criteria.
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
                      <p className="font-bold text-gray-800">{item.schemeName || 'Bluechip Fund Direct Growth'}</p>
                      <p className="text-[10px] text-gray-400">{item.frequency || 'Monthly'}</p>
                    </td>

                    <td className="py-3.5 px-5 font-bold font-mono text-gray-900">
                      {formatCurrency(item.amount)}
                    </td>

                    <td className="py-3.5 px-5 text-gray-700 font-mono">
                      {item.sipDate ? `${item.sipDate}th of month` : '10th of month'}
                    </td>

                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.mandateStatus || 'Approved'}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-gray-600 font-mono text-[11px]">
                      {item.nextDebitDate
                        ? new Date(item.nextDebitDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '05 Nov 2026'}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {item.status}
                      </span>
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
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total mandates)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchSips(pagination.page - 1)}
                className="px-3 py-1 bg-gray-100 rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchSips(pagination.page + 1)}
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
