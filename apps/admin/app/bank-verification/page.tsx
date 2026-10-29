'use client';

import React, { useState, useEffect } from 'react';
import { adminApi, BankVerificationItem } from '@/lib/api';
import { CreditCard, RefreshCw, Search, CheckCircle2, AlertCircle, Clock, Building } from 'lucide-react';

export default function BankVerificationPage() {
  const [data, setData] = useState<BankVerificationItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchBankAccounts = async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getBankVerifications({
        page,
        limit: 15,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
      });
      setData(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load bank verifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankAccounts(1);
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#3C3985] uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4" />
            <span>Banking Operations</span>
          </div>
          <h1 className="text-2xl font-black text-[#102A54] tracking-tight">
            Bank Account Verification Queue
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Penny-drop verifications, NPCI name match scores, and automated IFSC validations for BSE mandates.
          </p>
        </div>

        <button
          onClick={() => fetchBankAccounts(pagination.page)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by investor name, mobile, or IFSC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchBankAccounts(1)}
            className="w-full bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl focus:bg-white focus:outline-none focus:border-[#3C3985]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['ALL', 'VERIFIED', 'PENDING', 'FAILED'].map((st) => (
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
                <th className="py-3 px-5">Bank & Branch</th>
                <th className="py-3 px-5">Account Number</th>
                <th className="py-3 px-5">Type</th>
                <th className="py-3 px-5">Penny-Drop Status</th>
                <th className="py-3 px-5">Name Match</th>
                <th className="py-3 px-5 text-right">Added On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <div className="w-5 h-5 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading bank verification records...</span>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    No bank verification records found.
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
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <div>
                          <p className="font-bold text-gray-800">{item.bankName || 'Verified Bank'}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{item.ifscCode}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-5 font-mono text-gray-800">{item.accountNumber}</td>

                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-bold uppercase">
                        {item.accountType || 'SAVINGS'}
                      </span>
                    </td>

                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.verificationStatus === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {item.verificationStatus === 'VERIFIED' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : item.verificationStatus === 'FAILED' ? (
                          <AlertCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{item.verificationStatus}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-5">
                      {item.matchScore ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full"
                              style={{ width: `${item.matchScore}%` }}
                            />
                          </div>
                          <span className="font-bold font-mono text-[11px] text-gray-700">
                            {item.matchScore}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-mono text-[11px]">Pending</span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-right text-gray-400 font-mono text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total accounts)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchBankAccounts(pagination.page - 1)}
                className="px-3 py-1 bg-gray-100 rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchBankAccounts(pagination.page + 1)}
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
