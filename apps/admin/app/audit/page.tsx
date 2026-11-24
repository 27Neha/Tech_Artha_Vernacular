'use client';

import React, { useEffect, useState } from 'react';
import { adminApi, AuditItem } from '@/lib/api';
import {
  FileText,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  User,
} from 'lucide-react';

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getAuditLogs({
        page,
        limit: 20,
        search,
        action: actionFilter || undefined,
      });
      setLogs(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#102A54] tracking-tight">System Audit & Compliance Trail</h1>
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-[#3C3985] text-[10px] font-bold border border-purple-200 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Immutable Ledger
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Tamper-evident record of all administrative overrides, staff logins, compliance actions, and sensitive data views.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(pagination.page)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Trail</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
            placeholder="Search action name or details..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:border-[#3C3985] transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#3C3985]"
          >
            <option value="">All Actions</option>
            <option value="ADMIN_LOGIN">Admin Logins</option>
            <option value="KYC_MANUAL_REVIEW_UPDATED">KYC Status Changes</option>
            <option value="SUPPORT_TICKET_STATUS_UPDATED">Support Actions</option>
            <option value="ADMIN_VIEWED_UNMASKED_PII">PII Unmask Views</option>
          </select>

          <button
            onClick={() => fetchLogs(1)}
            className="px-4 py-2 bg-[#3C3985] text-white rounded-xl text-xs font-bold hover:bg-[#2A2761] transition-colors"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Subject User / Staff</th>
                <th className="py-3.5 px-4">Details & Payload</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="w-6 h-6 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {log.user ? (
                        <div>
                          <div className="font-bold text-gray-800">{log.user.fullName}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{log.user.email || log.user.mobile}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-mono text-[11px]">SYSTEM / STAFF</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-600 max-w-md truncate text-[11px]">
                      {log.details || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-400 text-[11px]">
                      {log.ipAddress || 'Internal'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[11px] text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing {logs.length} of {pagination.total} audit events
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-gray-800">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
