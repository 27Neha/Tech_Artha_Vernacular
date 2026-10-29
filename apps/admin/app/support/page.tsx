'use client';

import React, { useEffect, useState } from 'react';
import { adminApi, SupportItem } from '@/lib/api';
import { useAdminAuth } from '@/lib/auth-context';
import {
  Headphones,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function SupportOperationsPage() {
  const { user: currentAdmin } = useAdminAuth();
  const [tickets, setTickets] = useState<SupportItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportItem | null>(null);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getSupportTickets({
        page,
        limit: 15,
        search,
        status: statusFilter || undefined,
      });
      setTickets(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(1);
  }, [statusFilter]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicket) return;
    setUpdating(true);
    try {
      await adminApi.updateSupportTicket(selectedTicket.id, {
        status: newStatus,
        notes: notes || `Status changed to ${newStatus} by ${currentAdmin?.email}`,
      });
      setSelectedTicket(null);
      setNotes('');
      fetchTickets(pagination.page);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#102A54] tracking-tight">Support Desk & User Queries</h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Omnichannel Support
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage customer inquiries submitted via mobile app, vernacular voice assistant, or email.
          </p>
        </div>

        <button
          onClick={() => fetchTickets(pagination.page)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Tickets</span>
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
            onKeyDown={(e) => e.key === 'Enter' && fetchTickets(1)}
            placeholder="Search by subject, message, mobile, email..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:border-[#3C3985] transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#3C3985]"
          >
            <option value="">All Ticket Statuses</option>
            <option value="OPEN">Open Only</option>
            <option value="IN_REVIEW">Under Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <button
            onClick={() => fetchTickets(1)}
            className="px-4 py-2 bg-[#3C3985] text-white rounded-xl text-xs font-bold hover:bg-[#2A2761] transition-colors"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Ticket ID</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Message Snippet</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <div className="w-6 h-6 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading inquiries...</span>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No support tickets matching selected criteria.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {t.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{t.userName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{t.userMobile || t.userEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-800">{t.subject}</td>
                    <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate">{t.message}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                          t.status === 'RESOLVED' || t.status === 'CLOSED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : t.status === 'IN_REVIEW'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-gray-400">
                      {new Date(t.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedTicket(t)}
                        className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-[#3C3985] hover:text-white text-gray-700 border border-gray-200 text-xs font-bold transition-all"
                      >
                        View & Reply
                      </button>
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
            Showing {tickets.length} of {pagination.total} tickets
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTickets(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-gray-800">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchTickets(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#102A54]">Support Ticket Details</h3>
                <p className="text-xs text-gray-400">Ref: {selectedTicket.id}</p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-gray-700 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl text-xs space-y-2 border border-gray-100">
              <div>
                <span className="text-gray-400 block text-[10px]">Client</span>
                <span className="font-bold text-gray-900">{selectedTicket.userName}</span>
                <span className="text-gray-500 font-mono ml-2">({selectedTicket.userEmail || selectedTicket.userMobile})</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Subject</span>
                <span className="font-bold text-gray-800">{selectedTicket.subject}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Query Message</span>
                <p className="text-gray-700 mt-1 whitespace-pre-wrap bg-white p-3 rounded-lg border border-gray-200">
                  {selectedTicket.message}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Operational Resolution Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log internal action taken or resolution summary..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={updating}
                onClick={() => handleUpdateStatus('IN_REVIEW')}
                className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-xl transition-colors border border-blue-200"
              >
                Mark In Review
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={() => handleUpdateStatus('RESOLVED')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
