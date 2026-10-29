'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAdminAuth } from '@/lib/auth-context';
import {
  ArrowLeft,
  User,
  Shield,
  Eye,
  EyeOff,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  Target,
  CreditCard,
  History,
  Lock,
  Layers,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { user: currentAdmin } = useAdminAuth();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [unmasked, setUnmasked] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'kyc' | 'portfolio' | 'goals' | 'orders' | 'logs'>('overview');

  const fetchUser = async (unmask = false) => {
    setLoading(true);
    try {
      const data = await adminApi.getUserDetails(userId, unmask);
      setUserData(data);
      setUnmasked(unmask);
    } catch (err: any) {
      setError(err.message || 'Failed to load user information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUser(false);
    }
  }, [userId]);

  const toggleUnmask = () => {
    fetchUser(!unmasked);
  };

  if (loading && !userData) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-[#3C3985]" />
          <span>Fetching Client Records...</span>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="p-8 max-w-xl mx-auto bg-white rounded-2xl border border-rose-200 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Unable to Load Client Profile</h2>
        <p className="text-xs text-gray-500">{error || 'User not found in system repository'}</p>
        <button
          onClick={() => router.push('/users')}
          className="px-4 py-2 bg-[#3C3985] text-white text-xs font-bold rounded-xl"
        >
          Return to Users Directory
        </button>
      </div>
    );
  }

  const profile = userData.profile || {};
  const kyc = userData.kycApplication || {};
  const risk = userData.riskProfile || {};
  const portfolio = userData.portfolio || {};
  const holdings = portfolio.holdings || [];
  const goals = userData.goals || [];
  const orders = userData.FpInvestorProfile?.mfAccounts?.[0]?.orders || [];
  const auditLogs = userData.auditLogs || [];

  const getKycBadge = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>;
      case 'PENDING':
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Under Review</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Rejected</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">Not Started</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/users')}
          className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#102A54] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Users</span>
        </button>

        <div className="flex items-center gap-2">
          {(currentAdmin?.role === 'SUPER_ADMIN' || currentAdmin?.role === 'OPERATIONS') && (
            <button
              onClick={toggleUnmask}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                unmasked
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {unmasked ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-gray-400" />}
              <span>{unmasked ? 'Mask PII Data' : 'Unmask PII (Audit Logged)'}</span>
            </button>
          )}

          <button
            onClick={() => fetchUser(unmasked)}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* User Hero Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#3C3985]/10 text-[#3C3985] flex items-center justify-center font-black text-xl">
              {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-[#102A54] tracking-tight">
                  {profile.fullName || 'Registered User'}
                </h1>
                {getKycBadge(kyc.status)}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1 font-medium">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{userData.phone || '—'}</span>
                </span>
                {profile.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{profile.email}</span>
                  </span>
                )}
                <span className="flex items-center gap-1 font-mono text-[11px] text-gray-400">
                  ID: {userData.id}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-200 text-center">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Language</div>
              <div className="font-bold text-gray-800 uppercase mt-0.5">{userData.preferredLanguage || 'HINDI'}</div>
            </div>

            <div className="bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-200 text-center">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Risk Profile</div>
              <div className="font-bold text-[#3C3985] mt-0.5">{risk.category || 'MODERATE'}</div>
            </div>

            <div className="bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-200 text-center">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Client Tier</div>
              <div className="font-bold text-emerald-600 mt-0.5">Tier {kyc.tier || 1}</div>
            </div>
          </div>
        </div>

        {/* Tab Headers */}
        <div className="flex items-center gap-2 border-t border-gray-100 pt-3 text-xs font-bold overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'kyc', label: 'KYC & Identity', icon: Shield },
            { id: 'portfolio', label: 'Portfolio & Assets', icon: TrendingUp },
            { id: 'goals', label: 'Goals', icon: Target },
            { id: 'orders', label: 'Transactions', icon: DollarSign },
            { id: 'logs', label: 'Audit Trail', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
                  active
                    ? 'bg-[#3C3985] text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-4">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-[#3C3985]" />
                <span>Identity Details</span>
              </h2>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block mb-0.5">Full Legal Name</span>
                  <span className="font-bold text-gray-800">{profile.fullName || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Permanent Account Number (PAN)</span>
                  <span className="font-mono font-bold text-gray-800">{profile.pan || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Date of Birth</span>
                  <span className="font-medium text-gray-800">
                    {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-IN') : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Gender</span>
                  <span className="font-medium text-gray-800">{profile.gender || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Registered Phone</span>
                  <span className="font-bold text-gray-800">{userData.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Registered Email</span>
                  <span className="font-bold text-gray-800">{profile.email || '—'}</span>
                </div>
              </div>
            </div>

            {/* Quick Portfolio Snapshot */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#3C3985]" />
                  <span>Portfolio Snapshot</span>
                </h2>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className="text-xs font-bold text-[#3C3985] hover:underline flex items-center gap-1"
                >
                  <span>View Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Total Value</span>
                  <div className="text-lg font-black text-gray-900 mt-1">
                    ₹{portfolio.totalValue ? Number(portfolio.totalValue).toLocaleString('en-IN') : '0.00'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Invested Amount</span>
                  <div className="text-lg font-black text-gray-700 mt-1">
                    ₹{portfolio.investedAmount ? Number(portfolio.investedAmount).toLocaleString('en-IN') : '0.00'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">Holdings Count</span>
                  <div className="text-lg font-black text-emerald-800 mt-1">{holdings.length} Assets</div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Overview Cards */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-3 text-xs">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#3C3985]" />
                <span>Onboarding Stage</span>
              </h3>

              <div className="space-y-2">
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Phone Verification</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">KYC Status</span>
                  <span className="font-bold text-gray-800">{kyc.status || 'NOT_STARTED'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Bank Linked</span>
                  <span className="font-bold text-gray-800">{userData.FpMandate?.length ? 'Yes' : 'Pending'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500">Account Created</span>
                  <span className="font-medium text-gray-700">
                    {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-IN') : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-3 text-xs">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#3C3985]" />
                <span>Active Financial Goals</span>
              </h3>
              {goals.length === 0 ? (
                <p className="text-gray-400 text-xs">No financial goals configured yet.</p>
              ) : (
                <div className="space-y-2">
                  {goals.slice(0, 3).map((g: any) => (
                    <div key={g.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex justify-between items-center font-bold text-gray-800">
                        <span>{g.name}</span>
                        <span>₹{Number(g.targetAmount).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">Status: {g.status || 'ACTIVE'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: KYC */}
      {activeTab === 'kyc' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Regulatory Verification Records</h2>
              <p className="text-[11px] text-gray-400">SEBI / KRA / Digilocker verification artifacts</p>
            </div>
            {getKycBadge(kyc.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <span className="text-gray-400 font-bold uppercase text-[10px]">PAN Verification</span>
              <div className="font-bold text-gray-900 text-sm">{profile.pan || 'Not Submitted'}</div>
              <div className="text-[11px] text-gray-500">Status: {kyc.panVerified ? 'Verified with NSDL' : 'Pending'}</div>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Aadhaar / Digilocker</span>
              <div className="font-bold text-gray-900 text-sm">{kyc.aadhaarVerified ? 'Verified' : 'Pending'}</div>
              <div className="text-[11px] text-gray-500">UIDAI Paperless eKYC flow</div>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Bank Penny Drop</span>
              <div className="font-bold text-gray-900 text-sm">{kyc.bankVerified ? 'Verified' : 'Pending'}</div>
              <div className="text-[11px] text-gray-500">NPCI / IMPS Penny drop confirmation</div>
            </div>
          </div>

          {kyc.verifications && kyc.verifications.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Verification Steps History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Provider</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {kyc.verifications.map((v: any, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 font-bold text-gray-800">{v.type}</td>
                        <td className="px-4 py-2.5 text-gray-600">{v.provider || 'Internal'}</td>
                        <td className="px-4 py-2.5 font-bold text-emerald-600">{v.status}</td>
                        <td className="px-4 py-2.5 text-gray-400">
                          {v.createdAt ? new Date(v.createdAt).toLocaleString('en-IN') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Portfolio */}
      {activeTab === 'portfolio' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Portfolio Asset Holdings</h2>
            <span className="text-xs font-bold text-gray-500">{holdings.length} Assets</span>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold">
                <tr>
                  <th className="px-5 py-3">Asset Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Units</th>
                  <th className="px-4 py-3">Avg Cost</th>
                  <th className="px-4 py-3">Current Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {holdings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      No asset holdings recorded for this user.
                    </td>
                  </tr>
                ) : (
                  holdings.map((h: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3 font-bold text-gray-900">{h.assetName || h.symbol || 'Mutual Fund'}</td>
                      <td className="px-4 py-3 text-gray-600">{h.category || 'EQUITY'}</td>
                      <td className="px-4 py-3 font-mono text-gray-800">{h.quantity || 0}</td>
                      <td className="px-4 py-3 font-mono text-gray-800">₹{Number(h.averagePrice || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">₹{Number(h.currentValue || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Goals */}
      {activeTab === 'goals' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900">Configured Client Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.length === 0 ? (
              <p className="text-xs text-gray-400 col-span-2 py-8 text-center">No financial goals found.</p>
            ) : (
              goals.map((g: any) => (
                <div key={g.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-sm">{g.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {g.status || 'ACTIVE'}
                    </span>
                  </div>
                  <div className="text-gray-500">Target: ₹{Number(g.targetAmount).toLocaleString('en-IN')}</div>
                  <div className="text-gray-400 text-[11px]">
                    Target Year: {g.targetDate ? new Date(g.targetDate).getFullYear() : '—'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Transaction & Order Ledger</h2>
          </div>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold">
                <tr>
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Scheme</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      No mutual fund transactions found.
                    </td>
                  </tr>
                ) : (
                  orders.map((o: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-5 py-3 font-mono text-[11px] text-gray-700">{o.id}</td>
                      <td className="px-4 py-3 font-bold text-gray-800">{o.type || 'BUY'}</td>
                      <td className="px-4 py-3 text-gray-700">{o.schemeName || 'Direct Plan'}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">₹{Number(o.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600">{o.status}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">User Audit & Event Logs</h2>
          </div>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-4 py-3">Event Action</th>
                  <th className="px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                      No audit history entries found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-5 py-3 text-gray-400">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800">{log.action}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
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
