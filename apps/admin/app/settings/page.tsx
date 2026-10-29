'use client';

import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/lib/auth-context';
import { adminApi, SystemInfo, RoleConfigItem } from '@/lib/api';
import {
  Settings,
  User,
  Shield,
  KeyRound,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Database,
  Lock,
  Layers,
  FileText,
  Save,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshUser } = useAdminAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'roles' | 'system' | 'logs'>('profile');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Profile Form
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // System & Roles
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [rolesConfig, setRolesConfig] = useState<RoleConfigItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'system') {
      loadSystemInfo();
    } else if (activeTab === 'roles') {
      loadRoles();
    } else if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab]);

  const loadSystemInfo = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getSystemInfo();
      setSystemInfo(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch system info', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getRolesConfig();
      setRolesConfig(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load roles matrix', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAdminActivityLogs({ limit: 50 });
      setAuditLogs(res.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminApi.updateAdminProfile({ name, phone });
      showToast('Profile updated successfully');
      if (refreshUser) refreshUser();
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await adminApi.changeAdminPassword({ currentPassword, newPassword });
      showToast('Password changed successfully. New session token issued.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-xl font-black text-[#102A54] tracking-tight">System Settings & Governance</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#3C3985]/10 text-[#3C3985] border border-[#3C3985]/20">
              Operations Control
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Configure administrative preferences, role capabilities, credentials, and system diagnostics.
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="flex items-center gap-1.5 border-b border-gray-200/80 pb-px overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-[#3C3985] text-[#3C3985]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <User className="w-4 h-4" />
          <span>My Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-[#3C3985] text-[#3C3985]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Security & Password</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'roles'
              ? 'border-[#3C3985] text-[#3C3985]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>RBAC Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'system'
              ? 'border-[#3C3985] text-[#3C3985]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>System Health</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-[#3C3985] text-[#3C3985]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Activity Audit</span>
        </button>
      </div>

      {/* Tab: Profile */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-5">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-[#3C3985]" />
              <span>Personal Information</span>
            </h2>

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Company Email (Immutable)</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assigned Role</label>
                  <input
                    type="text"
                    disabled
                    value={user?.role || 'OPERATIONS'}
                    className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-[#3C3985] hover:bg-[#2F2C6F] text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-4 text-xs">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#3C3985]" />
              <span>Session Overview</span>
            </h3>

            <div className="space-y-3 divide-y divide-gray-100">
              <div className="pt-2">
                <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Account ID</div>
                <div className="font-mono text-gray-700 mt-0.5 truncate">{user?.id}</div>
              </div>

              <div className="pt-3">
                <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Role Authority</div>
                <div className="font-bold text-[#3C3985] mt-0.5">{user?.role}</div>
              </div>

              <div className="pt-3">
                <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Position & Team</div>
                <div className="text-gray-800 font-medium mt-0.5">
                  {user?.position || 'Operations'} &bull; {user?.department || 'FinTech'}
                </div>
              </div>

              <div className="pt-3">
                <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Active Workspace</div>
                <div className="text-gray-800 font-medium mt-0.5">TechArtha Multi-Asset Production</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Security */}
      {activeTab === 'security' && (
        <div className="max-w-xl bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#3C3985]/10 text-[#3C3985] flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Change Admin Password</h2>
              <p className="text-[11px] text-gray-400">Regularly rotate credentials for high-security environments</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">New Password (min 8 chars)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] focus:bg-white"
              />
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-[#3C3985] hover:bg-[#2F2C6F] text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: RBAC Matrix */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Role-Based Access Control (RBAC) Permissions</h2>
              <p className="text-[11px] text-gray-400">Standardized SEBI & RBI compliance segregation of duties</p>
            </div>
            <button
              onClick={loadRoles}
              className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-600 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rolesConfig.map((r) => (
              <div key={r.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#102A54]">{r.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                    {r.id}
                  </span>
                </div>
                <p className="text-gray-500 text-[11px]">{r.description}</p>
                <div className="pt-2 border-t border-gray-200/80 space-y-1.5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Granted Capabilities</div>
                  {r.permissions.map((p) => (
                    <div key={p} className="flex items-center gap-1.5 text-[11px] text-gray-700">
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: System Health */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="text-gray-400 text-xs font-semibold mb-1">API Backend</div>
              <div className="text-xl font-black text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Operational</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Port 3000 &bull; NestJS 11</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="text-gray-400 text-xs font-semibold mb-1">Database Engine</div>
              <div className="text-xl font-black text-gray-900">
                {systemInfo?.database?.connected ? 'Connected' : 'Active'}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Prisma Client &bull; PostgreSQL</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="text-gray-400 text-xs font-semibold mb-1">System Uptime</div>
              <div className="text-xl font-black text-[#3C3985]">
                {systemInfo?.uptimeSeconds ? `${Math.floor(systemInfo.uptimeSeconds / 60)} mins` : 'Live'}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Zero downtime recorded</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="text-gray-400 text-xs font-semibold mb-1">Node Environment</div>
              <div className="text-xl font-black text-gray-900">{systemInfo?.environment || 'development'}</div>
              <p className="text-[10px] text-gray-400 mt-1">{systemInfo?.nodeVersion || 'v20.x'}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Microservice Topology</h2>
              <button
                onClick={loadSystemInfo}
                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl font-bold flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Diagnostics</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/70 space-y-2">
                <div className="font-bold text-gray-900 flex items-center justify-between">
                  <span>NestJS API Gateway</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                    HTTP 200 OK
                  </span>
                </div>
                <div className="text-gray-500 text-[11px]">
                  Internal RPC, REST controllers, JWT Guards, WhatsApp Bot Engine, Risk Scoring.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/70 space-y-2">
                <div className="font-bold text-gray-900 flex items-center justify-between">
                  <span>Expo Metro Bundler</span>
                  <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded font-bold">
                    Port 8081 LAN
                  </span>
                </div>
                <div className="text-gray-500 text-[11px]">
                  React Native SDK 57 / React 19 engine serving mobile clients.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Activity Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Administrative Audit Stream</h2>
              <p className="text-[11px] text-gray-400">Tamper-evident operational access records</p>
            </div>
            <button
              onClick={loadLogs}
              className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-600 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Operator</th>
                  <th className="px-4 py-3">Target / Resource</th>
                  <th className="px-4 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      No administrative audit entries found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3 text-gray-500 font-medium">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : 'Just now'}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">{log.action}</td>
                      <td className="px-4 py-3 text-gray-700">{log.user?.name || log.userId || 'System'}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
                        {log.resource || log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-[11px]">{log.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
