'use client';

import React, { useEffect, useState } from 'react';
import { adminApi, TransactionItem } from '@/lib/api';
import {
  ArrowLeftRight,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';

export default function TransactionsOperationsPage() {
  const [orders, setOrders] = useState<TransactionItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getTransactions({
        page,
        limit: 15,
        search,
        status: statusFilter || undefined,
      });
      setOrders(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load transaction ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, [statusFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#102A54] tracking-tight">Orders, SIPs & Mandates Ledger</h1>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-[#F7941E] text-[10px] font-bold border border-amber-200">
              Cybrilla Engine
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Audit and reconcile mutual fund purchase orders, execution states, allotment units, and folio allocations.
          </p>
        </div>

        <button
          onClick={() => fetchOrders(pagination.page)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
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
            onKeyDown={(e) => e.key === 'Enter' && fetchOrders(1)}
            placeholder="Search by Order ID, ISIN, folio number..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:border-[#3C3985] transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#3C3985]"
          >
            <option value="">All Order Statuses</option>
            <option value="SUCCESS">Success / Executed</option>
            <option value="ALLOTTED">Allotted</option>
            <option value="PENDING">Pending Execution</option>
            <option value="FAILED">Failed</option>
          </select>

          <button
            onClick={() => fetchOrders(1)}
            className="px-4 py-2 bg-[#3C3985] text-white rounded-xl text-xs font-bold hover:bg-[#2A2761] transition-colors"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Order Ref / ID</th>
                <th className="py-3.5 px-4">Investor</th>
                <th className="py-3.5 px-4">Scheme ISIN</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Folio Number</th>
                <th className="py-3.5 px-4">Units Allotted</th>
                <th className="py-3.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="w-6 h-6 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading transactions...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <ArrowLeftRight className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-gray-600">No mutual fund orders found.</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Purchase orders executed via Cybrilla will automatically stream into this operations queue.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {o.fpOrderId || o.id.slice(0, 10)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{o.userName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{o.userMobile || o.userEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-700">{o.schemeIsin}</td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">{formatCurrency(o.amount)}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                          o.status === 'SUCCESS' || o.status === 'ALLOTTED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : o.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-700">{o.folioNumber || '—'}</td>
                    <td className="py-3.5 px-4 font-mono text-gray-700">{o.allottedUnits ?? '—'}</td>
                    <td className="py-3.5 px-4 text-right text-[11px] text-gray-400">
                      {new Date(o.createdAt).toLocaleString('en-IN', {
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

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing {orders.length} of {pagination.total} orders
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchOrders(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-gray-800">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchOrders(pagination.page + 1)}
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
