'use client';

import React, { useEffect, useState } from 'react';
import { adminApi, KycQueueItem } from '@/lib/api';
import { useAdminAuth } from '@/lib/auth-context';
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileCheck,
} from 'lucide-react';

export default function OnboardingKycQueuePage() {
  const { user: currentAdmin } = useAdminAuth();
  const [items, setItems] = useState<KycQueueItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [onlyReview, setOnlyReview] = useState(false);
  const [selectedApp, setSelectedApp] = useState<KycQueueItem | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getOnboardingQueue({
        page,
        limit: 15,
        search,
        status: statusFilter || undefined,
        manualReview: onlyReview ? true : undefined,
      });
      setItems(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load KYC queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue(1);
  }, [statusFilter, onlyReview]);

  const handleReviewAction = async (newStatus: string) => {
    if (!selectedApp) return;
    setUpdating(true);
    try {
      await adminApi.updateKycStatus(selectedApp.id, {
        overallStatus: newStatus,
        manualReviewRequired: false,
        note: reviewNote || `Status updated to ${newStatus} by ${currentAdmin?.email}`,
      });
      setSelectedApp(null);
      setReviewNote('');
      fetchQueue(pagination.page);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const canEdit = currentAdmin?.role === 'SUPER_ADMIN' || currentAdmin?.role === 'OPERATIONS';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#102A54] tracking-tight">Cybrilla KYC & Onboarding Queue</h1>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
              Regulatory Pipeline
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time compliance monitoring for PAN verification, face liveness detection, and AML screening.
          </p>
        </div>

        <button
          onClick={() => fetchQueue(pagination.page)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
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
            onKeyDown={(e) => e.key === 'Enter' && fetchQueue(1)}
            placeholder="Search by name, Cybrilla tx ID, mobile..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:border-[#3C3985] transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={onlyReview}
              onChange={(e) => setOnlyReview(e.target.checked)}
              className="rounded text-[#3C3985] focus:ring-[#3C3985]"
            />
            <span>Requires Review Only</span>
          </label>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#3C3985]"
          >
            <option value="">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Applicant</th>
                <th className="py-3.5 px-4">Cybrilla Tx ID</th>
                <th className="py-3.5 px-4">Overall Status</th>
                <th className="py-3.5 px-4">PAN</th>
                <th className="py-3.5 px-4">Face Liveness</th>
                <th className="py-3.5 px-4">AML Screen</th>
                <th className="py-3.5 px-4">Manual Review</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="w-6 h-6 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading compliance pipeline...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No KYC applications in this queue.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{item.applicantName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{item.mobile || item.email || '—'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-700 text-[11px]">
                      {item.providerTransactionId || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                          item.overallStatus === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.overallStatus === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {item.overallStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-semibold ${
                          item.panStatus === 'VERIFIED' ? 'text-emerald-600' : 'text-gray-500'
                        }`}
                      >
                        {item.panStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-semibold ${
                          item.faceLivenessStatus === 'PASSED' ? 'text-emerald-600' : 'text-gray-500'
                        }`}
                      >
                        {item.faceLivenessStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-semibold ${
                          item.amlStatus === 'CLEAR' ? 'text-emerald-600' : 'text-gray-500'
                        }`}
                      >
                        {item.amlStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.manualReviewRequired ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200 flex items-center gap-1 w-max">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Review Flagged</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[11px]">Normal</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedApp(item)}
                        className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-[#3C3985] hover:text-white text-gray-700 border border-gray-200 text-xs font-bold transition-all"
                      >
                        Inspect / Review
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
            Showing {items.length} of {pagination.total} applications
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchQueue(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-gray-800">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchQueue(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#102A54]">Review KYC Application</h3>
                <p className="text-xs text-gray-400">{selectedApp.applicantName}</p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-gray-400 hover:text-gray-700 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl text-xs space-y-2 border border-gray-100">
              <div className="flex justify-between">
                <span className="text-gray-500">Current Status:</span>
                <span className="font-bold text-gray-900">{selectedApp.overallStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cybrilla Tx ID:</span>
                <span className="font-mono text-gray-900">{selectedApp.providerTransactionId || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">PAN Verification:</span>
                <span className="font-semibold text-gray-900">{selectedApp.panStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Face Liveness:</span>
                <span className="font-semibold text-gray-900">{selectedApp.faceLivenessStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">AML Screening:</span>
                <span className="font-semibold text-gray-900">{selectedApp.amlStatus}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Operational Notes / Compliance Audit Reason
              </label>
              <textarea
                rows={3}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Enter rationale for approval, rejection, or verification clearance..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
              />
            </div>

            {canEdit ? (
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleReviewAction('REJECTED')}
                  className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold rounded-xl transition-colors border border-rose-200"
                >
                  Mark Rejected
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleReviewAction('VERIFIED')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                >
                  Approve as Verified
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 text-right">
                Your role ({currentAdmin?.role}) has read-only permission for KYC overrides.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
