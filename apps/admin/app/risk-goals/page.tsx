'use client';

import React, { useEffect, useState } from 'react';
import {
  adminApi,
  DashboardStats,
  UserItem,
  ClientGoalsResponse,
  ClientActiveGoal,
} from '@/lib/api';
import {
  Target,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Search,
  User,
  AlertCircle,
  Clock,
  Calendar,
  ArrowRight,
  Sparkles,
  ChevronRight,
  PieChart,
  Check,
} from 'lucide-react';

export default function RiskGoalsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clients, setClients] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Client Search & Active Goals State
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<UserItem | null>(null);
  const [clientGoalsData, setClientGoalsData] = useState<ClientGoalsResponse | null>(null);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [goalsError, setGoalsError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashboardStats, usersRes] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getUsers({ limit: 50 }),
      ]);
      setStats(dashboardStats);
      setClients(usersRes.data);
      setSearchResults(usersRes.data);

      // Auto-select first client if not already selected
      if (!selectedClient && usersRes.data.length > 0) {
        handleSelectClient(usersRes.data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load risk and goals metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearching(true);
    try {
      const res = await adminApi.getUsers({ search: searchQuery.trim(), limit: 15 });
      setSearchResults(res.data);
    } catch (err: any) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectClient = async (client: UserItem) => {
    setSelectedClient(client);
    setLoadingGoals(true);
    setGoalsError(null);
    try {
      const res = await adminApi.getClientActiveGoals(client.id);
      setClientGoalsData(res);
    } catch (err: any) {
      setGoalsError(err.message || 'Failed to fetch active goals for this client.');
      setClientGoalsData(null);
    } finally {
      setLoadingGoals(false);
    }
  };

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
            <h1 className="text-xl font-black text-[#102A54] tracking-tight">Active Goals & Risk Profiles</h1>
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-[#3C3985] text-[10px] font-bold border border-purple-100 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#F7941E]" />
              Client Goal Management
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Track individual client active goals, real-time savings progress, remaining corpus requirements, and SEBI suitability tiers.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500">Platform Active Goals</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#3C3985] flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#102A54] mt-1">{stats?.goals?.active || 0}</div>
          <p className="text-[11px] text-gray-400 mt-1">From registered retail investors in Supabase</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500">Accumulated Goal Targets</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#3C3985] mt-1">
            {formatCurrency(stats?.goals?.totalTargetAmount || 0)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Combined life financial objectives</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500">Monthly SIP Commitment</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#F7941E] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#F7941E] mt-1">
            {formatCurrency(stats?.goals?.totalMonthlySip || 0)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Monthly run-rate scheduled for goals</p>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SECTION 2: CLIENT SEARCH & ACTIVE GOALS EXPLORER   */}
      {/* ==================================================== */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50">
          <div>
            <h2 className="text-sm font-extrabold text-[#102A54] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#3C3985]" />
              <span>Client Active Goals Explorer</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Select or search any registered client to inspect their active financial goals, real-time savings, and remaining targets.
            </p>
          </div>

          {/* Client Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, mobile, or UUID..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#3C3985] shadow-2xs"
            />
            {searching && (
              <div className="absolute right-3 top-2.5">
                <div className="w-3.5 h-3.5 border-2 border-[#3C3985]/30 border-t-[#3C3985] rounded-full animate-spin" />
              </div>
            )}
          </form>
        </div>

        {/* Client Selector Carousel / Pills */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Matching Clients ({searchResults.length})
            </span>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults(clients);
                }}
                className="text-[11px] font-semibold text-[#3C3985] hover:underline"
              >
                Clear Search
              </button>
            )}
          </div>

          {searchResults.length === 0 ? (
            <div className="p-4 rounded-xl bg-gray-50 text-center text-xs text-gray-500 border border-gray-100">
              No clients found matching &ldquo;<span className="font-bold text-gray-700">{searchQuery}</span>&rdquo;. Try searching with registered mobile (+91...) or client name.
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {searchResults.map((c) => {
                const isSelected = selectedClient?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectClient(c)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs text-left shrink-0 transition-all ${
                      isSelected
                        ? 'bg-[#3C3985] text-white border-[#3C3985] shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200/80 hover:bg-gray-100'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#3C3985]/10 text-[#3C3985]'
                      }`}
                    >
                      {c.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold leading-tight">{c.fullName}</div>
                      <div className={`text-[10px] font-mono ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                        {c.mobile || c.email || c.id.slice(0, 8)}
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white ml-1 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Client Goals Content Area */}
        <div className="p-6">
          {/* Loading State */}
          {loadingGoals && (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-3 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mb-3" />
              <p className="text-xs font-semibold text-gray-500">
                Fetching active goals from Supabase for {selectedClient?.fullName || 'client'}...
              </p>
            </div>
          )}

          {/* API Error State */}
          {!loadingGoals && goalsError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{goalsError}</span>
              </div>
              <button
                onClick={() => selectedClient && handleSelectClient(selectedClient)}
                className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loaded Content */}
          {!loadingGoals && !goalsError && clientGoalsData && (
            <div className="space-y-6">
              {/* Client Header & Overall Plan Summary */}
              <div className="bg-gradient-to-br from-[#102A54] to-[#1C3E75] text-white p-5 rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black">{clientGoalsData.client.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                      {clientGoalsData.client.isActive ? 'Active Account' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 font-mono mt-1">
                    {clientGoalsData.client.mobile || clientGoalsData.client.email || 'No direct contact'} • ID: {clientGoalsData.client.id}
                  </p>
                </div>

                <div className="flex items-center gap-6 border-t lg:border-t-0 lg:border-l border-white/10 pt-3 lg:pt-0 lg:pl-6 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-300 block">Active Goals</span>
                    <span className="text-xl font-black">{clientGoalsData.summary.totalGoals}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-300 block">Total Target</span>
                    <span className="text-xl font-black text-white">
                      {formatCurrency(clientGoalsData.summary.totalTargetAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-300 block">Combined Progress</span>
                    <span className="text-xl font-black text-[#F7941E]">
                      {clientGoalsData.summary.overallCompletionPercentage}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-300 block">Monthly SIP</span>
                    <span className="text-xl font-black text-emerald-400">
                      {formatCurrency(clientGoalsData.summary.totalMonthlySip)}
                    </span>
                  </div>
                </div>
              </div>

              {/* No-Active-Goals State */}
              {clientGoalsData.goals.length === 0 ? (
                <div className="p-10 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#3C3985] flex items-center justify-center mx-auto mb-3">
                    <Target className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">No Active Goals Configured</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                    {clientGoalsData.client.name} has not set up any active financial goals in the TechArtha application yet. Goals planned via the mobile app or web portal will display here automatically.
                  </p>
                </div>
              ) : (
                /* Grid of Goal Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientGoalsData.goals.map((g) => (
                    <div
                      key={g.id}
                      className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs hover:border-[#3C3985]/40 hover:shadow-sm transition-all flex flex-col justify-between"
                    >
                      {/* Top Title & Status */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-black text-[#102A54] tracking-tight">{g.name}</h4>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0">
                            {g.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mb-4">
                          <span className="px-2 py-0.5 rounded-md bg-[#3C3985]/10 text-[#3C3985] text-[10px] font-bold uppercase">
                            {g.bucketName || 'CUSTOM'}
                          </span>
                          <span className="text-[11px] text-gray-400">•</span>
                          <span className="text-[11px] text-gray-500 font-medium">
                            {g.timePeriod} {g.timePeriod === 1 ? 'Year' : 'Years'} Horizon
                          </span>
                        </div>

                        {/* Financial Metrics Grid */}
                        <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50/80 rounded-xl border border-gray-100 text-xs mb-4">
                          <div>
                            <span className="text-[10px] text-gray-400 uppercase font-bold block">Target</span>
                            <span className="font-extrabold text-[#102A54]">
                              {formatCurrency(g.targetAmount)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 uppercase font-bold block">Current</span>
                            <span className="font-extrabold text-[#3C3985]">
                              {formatCurrency(g.currentProgress)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 uppercase font-bold block">Remaining</span>
                            <span className="font-extrabold text-amber-600">
                              {formatCurrency(g.remainingAmount)}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar & Percentage */}
                        <div className="space-y-1.5 mb-4">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-gray-500">Fulfilment Progress</span>
                            <span className="text-[#3C3985] font-black">{g.completionPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-[#3C3985] to-[#5550B5] h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(0, g.completionPercentage))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Footer Details: Monthly SIP & Creation Date */}
                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        <div className="flex items-center gap-1 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-[#F7941E]" />
                          <span>SIP: {formatCurrency(g.monthlySip)}/mo</span>
                        </div>
                        <span className="font-mono text-gray-400 text-[10px]">
                          Day {g.sipDate || 5} of month
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* SECTION 3: SEBI 5-TIER RISK SUITABILITY OVERVIEW     */}
      {/* ==================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <h2 className="text-sm font-bold text-[#102A54] mb-1">SEBI 5-Tier Risk Assessment Framework</h2>
        <p className="text-xs text-gray-400 mb-4">
          Investor distribution across suitability tiers mapping into TechArtha asset allocation buckets.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[
            { tier: 'Conservative', range: 'Score 11-18', bucket: 'Liquid / Ultra Short Debt', color: 'border-blue-200 bg-blue-50/50 text-blue-900' },
            { tier: 'Moderately Conservative', range: 'Score 19-25', bucket: 'Conservative Hybrid', color: 'border-cyan-200 bg-cyan-50/50 text-cyan-900' },
            { tier: 'Moderate', range: 'Score 26-31', bucket: 'Balanced Advantage / Multi-Asset', color: 'border-purple-200 bg-purple-50/50 text-purple-900' },
            { tier: 'Moderately Aggressive', range: 'Score 32-40', bucket: 'Large & Mid Cap Equity', color: 'border-amber-200 bg-amber-50/50 text-amber-900' },
            { tier: 'Aggressive', range: 'Score 41-55', bucket: 'Flexi Cap & Small Cap', color: 'border-rose-200 bg-rose-50/50 text-rose-900' },
          ].map((t) => (
            <div key={t.tier} className={`p-4 rounded-xl border ${t.color}`}>
              <div className="text-xs font-black mb-1">{t.tier}</div>
              <div className="text-[10px] font-mono opacity-80 mb-2">{t.range}</div>
              <div className="text-[11px] font-semibold opacity-90 leading-snug">
                Bucket: <span className="font-bold">{t.bucket}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ==================================================== */}
      {/* SECTION 4: ALL REGISTERED INVESTORS & ROSTER         */}
      {/* ==================================================== */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#102A54] uppercase tracking-wider">
            Investor Profiles & Active Goal Records
          </h3>
          <span className="text-[11px] text-gray-400 font-medium">Real-time DB Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Investor</th>
                <th className="py-3 px-4">Risk Category</th>
                <th className="py-3 px-4">Goals Planned</th>
                <th className="py-3 px-4">Portfolio Value</th>
                <th className="py-3 px-4">Suitability Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Loading records...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No investor risk records found.
                  </td>
                </tr>
              ) : (
                clients.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{u.fullName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{u.email || u.mobile}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-800">{u.riskCategory}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">{u.goalsCount} goal(s)</td>
                    <td className="py-3 px-4 font-bold text-gray-900">
                      ₹{u.portfolioValue ? u.portfolioValue.toLocaleString('en-IN') : '0'}
                    </td>
                    <td className="py-3 px-4">
                      {u.riskCategory !== 'UNASSESSED' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>SEBI Compliant</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-semibold">
                          Assessment Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
