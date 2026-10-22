'use client';

import React, { useEffect, useState } from 'react';
import { adminApi, UserItem } from '@/lib/api';
import { UserDetailDrawer } from '@/components/users/UserDetailDrawer';
import {
  Users,
  Search,
  Filter,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Phone,
  Mail,
  Copy,
  Check,
} from 'lucide-react';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unmaskPii, setUnmaskPii] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchUsers = async (page = 1, forceUnmask = unmaskPii) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUsers({
        page,
        limit: 15,
        search,
        status: statusFilter || undefined,
        kycStatus: kycFilter || undefined,
        maskPii: !forceUnmask,
      });
      setUsers(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [statusFilter, kycFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getKycBadge = (status: string, manualReview: boolean) => {
    if (manualReview) {
      return <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">Review Required</span>;
    }
    switch (status) {
      case 'VERIFIED':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">Verified</span>;
      case 'PENDING':
      case 'SUBMITTED':
        return <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">In Progress</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">Rejected</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold text-[10px]">Not Started</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Filter bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-[#102A54] tracking-tight">Clients & Investors Directory</h1>
          <p className="text-xs text-gray-500 mt-1">
            Browse and inspect all registered TechArtha users, onboarding progress, KYC states, and contact information.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => {
              const next = !unmaskPii;
              setUnmaskPii(next);
              fetchUsers(pagination.page, next);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
              unmaskPii
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-2xs'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
            title={unmaskPii ? 'Click to mask sensitive client contact details' : 'Click to reveal unmasked phone numbers & emails for operations'}
          >
            {unmaskPii ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Mask PII</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-gray-500" />
                <span>Reveal Contact Info</span>
              </>
            )}
          </button>

          <button
            onClick={() => fetchUsers(pagination.page)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh List</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, mobile, email, PAN..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:border-[#3C3985] transition-colors"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#3C3985]"
          >
            <option value="">All Account Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#3C3985]"
          >
            <option value="">All KYC Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING">Pending</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="REJECTED">Rejected</option>
            <option value="NOT_STARTED">Not Started</option>
          </select>

          <button
            onClick={() => fetchUsers(1)}
            className="px-4 py-2 bg-[#3C3985] text-white rounded-xl text-xs font-bold hover:bg-[#2A2761] transition-colors"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Client / Investor</th>
                <th className="py-3.5 px-4">Contact / Mobile</th>
                <th className="py-3.5 px-4">Email Address</th>
                <th className="py-3.5 px-4">PAN</th>
                <th className="py-3.5 px-4">KYC Status</th>
                <th className="py-3.5 px-4">Onboarding Step</th>
                <th className="py-3.5 px-4">Risk Tier</th>
                <th className="py-3.5 px-4">Active Goals</th>
                <th className="py-3.5 px-4">Portfolio (₹)</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <div className="w-6 h-6 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading users...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    No users matching the selected filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                    {/* Column 1: Client / Investor */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{u.fullName}</span>
                        {u.hasProfile ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Profile Active
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Setup Pending
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        ID: {u.id.slice(0, 8)}... • Joined {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                    </td>

                    {/* Column 2: Contact / Mobile */}
                    <td className="py-3.5 px-4 font-mono text-gray-700">
                      {u.mobile ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="font-semibold text-gray-900">{u.mobile}</span>
                          <button
                            onClick={() => copyToClipboard(u.mobile!, `mob-${u.id}`)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors"
                            title="Copy mobile number"
                          >
                            {copiedField === `mob-${u.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Column 3: Email Address */}
                    <td className="py-3.5 px-4 text-gray-700">
                      {u.email ? (
                        <div className="flex items-center gap-1.5 max-w-[210px]">
                          <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="font-medium text-gray-800 truncate" title={u.email}>
                            {u.email}
                          </span>
                          <button
                            onClick={() => copyToClipboard(u.email!, `email-${u.id}`)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                            title="Copy email address"
                          >
                            {copiedField === `email-${u.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px] italic">Not verified</span>
                      )}
                    </td>

                    {/* Column 4: PAN */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-gray-700">{u.pan || '—'}</td>

                    {/* Column 5: KYC Status */}
                    <td className="py-3.5 px-4">{getKycBadge(u.kycStatus, u.kycManualReview)}</td>

                    {/* Column 6: Onboarding Step */}
                    <td className="py-3.5 px-4">
                      <div className="text-gray-900 font-semibold">{u.onboardingStep}</div>
                      <div className="w-16 bg-gray-100 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-[#3C3985] h-1.5 rounded-full"
                          style={{ width: `${u.onboardingProgress}%` }}
                        />
                      </div>
                    </td>

                    {/* Column 7: Risk Tier */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-gray-700">{u.riskCategory}</span>
                    </td>

                    {/* Column 8: Active Goals */}
                    <td className="py-3.5 px-4 font-bold text-gray-800">{u.goalsCount}</td>

                    {/* Column 9: Portfolio Value */}
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      ₹{u.portfolioValue ? u.portfolioValue.toLocaleString('en-IN') : '0'}
                    </td>

                    {/* Column 10: Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedUserId(u.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-[#3C3985] hover:text-white text-gray-700 border border-gray-200 text-xs font-bold transition-all shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>360° View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing {users.length} of {pagination.total} users
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchUsers(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-gray-800">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchUsers(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* User 360 Slide-over Drawer */}
      {selectedUserId && (
        <UserDetailDrawer userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  );
}
