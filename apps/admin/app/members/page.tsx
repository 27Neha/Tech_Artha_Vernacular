'use client';

import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/lib/auth-context';
import { adminApi, AdminMember } from '@/lib/api';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  AlertTriangle,
  Mail,
  Phone,
  RefreshCw,
} from 'lucide-react';

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  SUPER_ADMIN: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  OPERATIONS: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  COMPLIANCE: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  FINANCE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  SUPPORT: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  ANALYST: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrator',
  OPERATIONS: 'Operations Manager',
  COMPLIANCE: 'Compliance & AML Officer',
  FINANCE: 'Finance & Settlements',
  SUPPORT: 'Client Support Ops',
  ANALYST: 'Data & Growth Analyst',
};

export default function MembersPage() {
  const { user } = useAdminAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState<AdminMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Invite Form
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'OPERATIONS',
    position: 'Operations Associate',
    department: 'Operations',
  });

  // Role Edit Form
  const [roleForm, setRoleForm] = useState({
    role: 'OPERATIONS',
    position: '',
    department: '',
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getMembers({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });
      setMembers(res.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load team members', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [search, roleFilter, statusFilter]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await adminApi.inviteMember(inviteForm);
      showToast(`Invitation created for ${inviteForm.email}`);
      setShowInviteModal(false);
      setInviteForm({
        name: '',
        email: '',
        phone: '',
        role: 'OPERATIONS',
        position: 'Operations Associate',
        department: 'Operations',
      });
      fetchMembers();
      if (res.activationUrl) {
        navigator.clipboard.writeText(res.activationUrl);
        showToast('Activation link copied to clipboard!');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to invite member', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRoleModal) return;
    setSubmitting(true);
    try {
      await adminApi.updateMemberRole(showRoleModal.id, roleForm);
      showToast(`Updated role for ${showRoleModal.name}`);
      setShowRoleModal(null);
      fetchMembers();
    } catch (err: any) {
      showToast(err.message || 'Failed to update member role', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (member: AdminMember) => {
    if (!confirm(`Are you sure you want to ${member.status === 'ACTIVE' ? 'deactivate' : 'reactivate'} ${member.name}?`)) {
      return;
    }
    try {
      if (member.status === 'ACTIVE') {
        await adminApi.deactivateMember(member.id);
        showToast(`${member.name} has been deactivated`);
      } else {
        await adminApi.reactivateMember(member.id);
        showToast(`${member.name} has been reactivated`);
      }
      fetchMembers();
    } catch (err: any) {
      showToast(err.message || 'Failed to change member status', 'error');
    }
  };

  const handleResendInvite = async (member: AdminMember) => {
    try {
      const res = await adminApi.resendMemberInvite(member.id);
      if (res.activationUrl) {
        navigator.clipboard.writeText(res.activationUrl);
        showToast('New activation link copied to clipboard!');
      } else {
        showToast(`Invitation resent to ${member.email}`);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to resend invitation', 'error');
    }
  };

  // Metrics
  const totalCount = members.length;
  const activeCount = members.filter((m) => m.status === 'ACTIVE').length;
  const invitedCount = members.filter((m) => m.status === 'INVITED').length;
  const superAdminCount = members.filter((m) => m.role === 'SUPER_ADMIN').length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-[#102A54] tracking-tight">Staff Team & Access Control</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#3C3985]/10 text-[#3C3985] border border-[#3C3985]/20">
              RBAC v2.4
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage administrative personnel, department roles, and granular data access boundaries.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#3C3985] hover:bg-[#2F2C6F] text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Team Member</span>
          </button>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-xs text-amber-800">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Read-Only Mode:</span> You are signed in as{' '}
            <span className="font-semibold text-gray-900">{user?.role}</span>. Only Super Administrators can invite
            staff members or modify access permissions.
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold">Total Personnel</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-gray-900">{totalCount}</div>
          <p className="text-[10px] text-gray-400 mt-1">Across all branches</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold">Active Members</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{activeCount}</div>
          <p className="text-[10px] text-emerald-600/70 mt-1">Authorized access</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold">Pending Invitations</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{invitedCount}</div>
          <p className="text-[10px] text-amber-600/70 mt-1">Awaiting setup</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold">Super Administrators</span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600">{superAdminCount}</div>
          <p className="text-[10px] text-purple-600/70 mt-1">Full root privilege</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#3C3985] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#3C3985]"
          >
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">Super Administrator</option>
            <option value="OPERATIONS">Operations</option>
            <option value="COMPLIANCE">Compliance</option>
            <option value="FINANCE">Finance</option>
            <option value="SUPPORT">Support</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#3C3985]"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INVITED">Invited</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>

          <button
            onClick={fetchMembers}
            className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-600 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Staff Member</th>
                <th className="px-4 py-3.5">Role & Department</th>
                <th className="px-4 py-3.5">Account Status</th>
                <th className="px-4 py-3.5">Last Login</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#3C3985]" />
                      <span>Loading team roster...</span>
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    No staff members match the selected criteria.
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const roleStyle = ROLE_COLORS[member.role] || ROLE_COLORS.OPERATIONS;
                  const isCurrent = member.id === user?.id;

                  return (
                    <tr key={member.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3C3985] to-[#102A54] text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs shrink-0">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-1.5">
                              <span>{member.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-gray-400" />
                                {member.email}
                              </span>
                              {member.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-gray-400" />
                                  {member.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                          >
                            {ROLE_LABELS[member.role] || member.role}
                          </span>
                          <div className="text-[11px] text-gray-500 font-medium">
                            {member.position || 'Staff Member'} &bull; {member.department || 'Operations'}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {member.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        )}
                        {member.status === 'INVITED' && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Invited
                            </span>
                            <div className="text-[10px] text-gray-400">Awaiting password setup</div>
                          </div>
                        )}
                        {member.status === 'DEACTIVATED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                            Deactivated
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {member.lastLoginAt ? (
                          <div className="space-y-0.5">
                            <div className="text-gray-900 font-medium">
                              {new Date(member.lastLoginAt).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </div>
                            {member.lastLoginIp && (
                              <div className="text-[10px] text-gray-400 font-mono">{member.lastLoginIp}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Never signed in</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {isSuperAdmin && (
                          <div className="flex items-center justify-end gap-1.5">
                            {member.status === 'INVITED' && (
                              <button
                                onClick={() => handleResendInvite(member)}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold transition-colors"
                                title="Resend Invitation & Copy Link"
                              >
                                Resend
                              </button>
                            )}

                            {!isCurrent && (
                              <>
                                <button
                                  onClick={() => {
                                    setShowRoleModal(member);
                                    setRoleForm({
                                      role: member.role,
                                      position: member.position,
                                      department: member.department,
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold transition-colors"
                                >
                                  Edit Role
                                </button>

                                <button
                                  onClick={() => handleToggleStatus(member)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors border ${
                                    member.status === 'ACTIVE'
                                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  {member.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#3C3985]/10 text-[#3C3985] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Invite New Staff Member</h3>
                  <p className="text-[11px] text-gray-400">Generate a secure activation link</p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aditi Sharma"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Company Email</label>
                  <input
                    type="email"
                    required
                    placeholder="aditi@techartha.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Assigned Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] font-semibold text-gray-800"
                >
                  <option value="OPERATIONS">Operations Manager (KYC & User Approvals)</option>
                  <option value="COMPLIANCE">Compliance Officer (AML, KYC Audits & Overrides)</option>
                  <option value="FINANCE">Finance Lead (Transactions, Mandates, Reconciliations)</option>
                  <option value="SUPPORT">Client Support (Tickets, Read-Only User Context)</option>
                  <option value="SUPER_ADMIN">Super Administrator (Full System Authority)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Official Position Title</label>
                  <input
                    type="text"
                    value={inviteForm.position}
                    onChange={(e) => setInviteForm({ ...inviteForm, position: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={inviteForm.department}
                    onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#3C3985] hover:bg-[#2F2C6F] text-white font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Send Invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Modify Member Permissions</h3>
                <p className="text-[11px] text-gray-400">{showRoleModal.name} &bull; {showRoleModal.email}</p>
              </div>
              <button
                onClick={() => setShowRoleModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">New Role</label>
                <select
                  value={roleForm.role}
                  onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] font-semibold text-gray-800"
                >
                  <option value="OPERATIONS">Operations Manager</option>
                  <option value="COMPLIANCE">Compliance Officer</option>
                  <option value="FINANCE">Finance Lead</option>
                  <option value="SUPPORT">Client Support Ops</option>
                  <option value="SUPER_ADMIN">Super Administrator</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Position Title</label>
                <input
                  type="text"
                  value={roleForm.position}
                  onChange={(e) => setRoleForm({ ...roleForm, position: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  value={roleForm.department}
                  onChange={(e) => setRoleForm({ ...roleForm, department: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(null)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#3C3985] hover:bg-[#2F2C6F] text-white font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
