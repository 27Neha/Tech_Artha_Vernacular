'use client';

import React, { useEffect, useState } from 'react';
import { adminApi, DashboardStats } from '@/lib/api';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  Target,
  ArrowLeftRight,
  Headphones,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Activity,
  ChevronRight,
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch platform metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-3 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-gray-500">Aggregating live platform metrics...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-rose-100 shadow-sm text-center">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-gray-900">Failed to load platform dashboard</h3>
        <p className="text-xs text-gray-500 mt-1">{error}</p>
        <button
          onClick={() => loadData(true)}
          className="mt-4 px-4 py-2 bg-[#3C3985] text-white text-xs font-bold rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#102A54] tracking-tight">Operations Dashboard</h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live System
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time monitoring across client onboarding, Cybrilla KYC, goal planning, and transactions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/onboarding"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#3C3985] hover:bg-[#2A2761] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <span>Review KYC Funnel</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Users */}
        <Link
          href="/users"
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs relative overflow-hidden group hover:border-[#3C3985] hover:shadow-md transition-all block cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 group-hover:text-[#3C3985] transition-colors">Total Clients</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#3C3985] flex items-center justify-center group-hover:bg-[#3C3985] group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#102A54] tracking-tight">{stats.users.total}</div>
          <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-gray-500">
            <span className="text-emerald-600 font-bold">{stats.users.active} Active</span>
            <span>•</span>
            <span className="text-gray-400">+{stats.users.newThisWeek} this week</span>
          </div>
          <div className="mt-2 text-[10px] text-gray-400 font-medium group-hover:text-[#3C3985] flex items-center gap-1 transition-colors">
            <span>View directory</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </Link>

        {/* KYC Applications */}
        <Link
          href="/onboarding"
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs relative overflow-hidden group hover:border-blue-500 hover:shadow-md transition-all block cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 group-hover:text-blue-600 transition-colors">KYC Funnel</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#102A54] tracking-tight">{stats.kyc.total}</div>
          <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-gray-500">
            <span className="text-emerald-600 font-bold">{stats.kyc.breakdown.VERIFIED} Verified</span>
            <span>•</span>
            {stats.kyc.breakdown.MANUAL_REVIEW > 0 ? (
              <span className="text-amber-600 font-bold">{stats.kyc.breakdown.MANUAL_REVIEW} Review</span>
            ) : (
              <span className="text-amber-600 font-bold">
                {stats.kyc.breakdown.PENDING + stats.kyc.breakdown.SUBMITTED} Pending
              </span>
            )}
          </div>
          <div className="mt-2 text-[10px] text-gray-400 font-medium group-hover:text-blue-600 flex items-center gap-1 transition-colors">
            <span>Inspect queue</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </Link>

        {/* Goal Planning */}
        <Link
          href="/risk-goals"
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs relative overflow-hidden group hover:border-emerald-500 hover:shadow-md transition-all block cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 group-hover:text-emerald-600 transition-colors">Active Goals</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#102A54] tracking-tight">{stats.goals.active}</div>
          <div className="mt-2 text-[11px] font-medium text-gray-500 truncate">
            Target: <span className="font-bold text-gray-700">{formatCurrency(stats.goals.totalTargetAmount)}</span>
          </div>
          <div className="mt-2 text-[10px] text-gray-400 font-medium group-hover:text-emerald-600 flex items-center gap-1 transition-colors">
            <span>View profiles & goals</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </Link>

        {/* Orders & Volume */}
        <Link
          href="/transactions"
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs relative overflow-hidden group hover:border-[#F7941E] hover:shadow-md transition-all block cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 group-hover:text-[#F7941E] transition-colors">Purchase Orders</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#F7941E] flex items-center justify-center group-hover:bg-[#F7941E] group-hover:text-white transition-colors">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#102A54] tracking-tight">{stats.transactions.totalOrders}</div>
          <div className="mt-2 text-[11px] font-medium text-gray-500 truncate">
            Invested: <span className="font-bold text-gray-700">{formatCurrency(stats.transactions.totalInvestedAmount)}</span>
          </div>
          <div className="mt-2 text-[10px] text-gray-400 font-medium group-hover:text-[#F7941E] flex items-center gap-1 transition-colors">
            <span>View order ledger</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </Link>

        {/* Support Tickets */}
        <Link
          href="/support"
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs relative overflow-hidden group hover:border-rose-500 hover:shadow-md transition-all block cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 group-hover:text-rose-600 transition-colors">Support Desk</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Headphones className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#102A54] tracking-tight">{stats.support.total}</div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium">
            {stats.support.open > 0 ? (
              <span className="text-rose-600 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {stats.support.open} Tickets Open
              </span>
            ) : (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> All Resolved
              </span>
            )}
          </div>
          <div className="mt-2 text-[10px] text-gray-400 font-medium group-hover:text-rose-600 flex items-center gap-1 transition-colors">
            <span>View ticket queue</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </Link>
      </div>

      {/* Two Column Section: KYC Funnel & Order Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KYC Pipeline Status */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#102A54]">KYC Pipeline Breakdown</h2>
              <p className="text-xs text-gray-400">Status distribution of all Cybrilla KYC applications</p>
            </div>
            <Link
              href="/onboarding"
              className="text-xs font-bold text-[#3C3985] hover:underline flex items-center gap-1"
            >
              <span>View Queue</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Verified & Approved', count: stats.kyc.breakdown.VERIFIED, color: 'bg-emerald-500' },
              { label: 'Manual Review Required', count: stats.kyc.breakdown.MANUAL_REVIEW, color: 'bg-amber-500' },
              { label: 'Submitted / Processing', count: stats.kyc.breakdown.SUBMITTED, color: 'bg-blue-500' },
              { label: 'Pending Completion', count: stats.kyc.breakdown.PENDING, color: 'bg-indigo-400' },
              { label: 'Rejected / Incomplete', count: stats.kyc.breakdown.REJECTED, color: 'bg-rose-500' },
              { label: 'Not Started', count: stats.kyc.breakdown.NOT_STARTED, color: 'bg-gray-300' },
            ].map((stage) => {
              const total = stats.kyc.total || 1;
              const pct = Math.round((stage.count / total) * 100);
              return (
                <div key={stage.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-700">{stage.label}</span>
                    <span className="font-bold text-gray-900">
                      {stage.count} <span className="text-gray-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className={`${stage.color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Investment Orders by Status */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#102A54]">Financial Orders Status</h2>
              <p className="text-xs text-gray-400">Cybrilla mutual fund purchase order statuses</p>
            </div>
            <Link
              href="/transactions"
              className="text-xs font-bold text-[#3C3985] hover:underline flex items-center gap-1"
            >
              <span>View Orders</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {Object.keys(stats.transactions.breakdown).length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-gray-400">
              <ArrowLeftRight className="w-8 h-8 stroke-1 mb-2 text-gray-300" />
              <p className="text-xs font-medium">No purchase orders recorded yet in system.</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Orders will appear here once investors execute funds.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.transactions.breakdown).map(([status, item]) => (
                <div
                  key={status}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        status === 'SUCCESS' || status === 'ALLOTTED'
                          ? 'bg-emerald-500'
                          : status === 'PENDING'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-800">{status}</span>
                      <p className="text-[11px] text-gray-400">{item.count} order(s)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-900">{formatCurrency(item.volume)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Real-time Audit Activity Stream */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#102A54]">Platform Audit & System Activity</h2>
            <p className="text-xs text-gray-400">Chronological trail of staff actions, logins, and system events</p>
          </div>
          <Link href="/audit" className="text-xs font-bold text-[#3C3985] hover:underline flex items-center gap-1">
            <span>Full Audit Log</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stats.recentActivity.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400">No recent activity logs found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {stats.recentActivity.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 shrink-0 mt-0.5">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-800 font-mono">{log.action}</span>
                    {log.details && (
                      <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5 font-mono">{log.details}</p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-gray-400">
                    {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
