'use client';

import React, { useState, useEffect } from 'react';
import { adminApi, ActivityOverviewItem } from '@/lib/api';
import { Activity, RefreshCw, Search, Shield, User, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ActivityFeedPage() {
  const [activities, setActivities] = useState<ActivityOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getActivityOverview(50);
      setActivities(data || []);
    } catch (err) {
      console.error('Failed to load activities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const filtered = activities.filter((act) => {
    const matchesFilter = filterAction === 'ALL' || act.action.toUpperCase().includes(filterAction);
    const matchesSearch =
      !search ||
      act.action.toLowerCase().includes(search.toLowerCase()) ||
      act.actorEmail?.toLowerCase().includes(search.toLowerCase()) ||
      act.details?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#3C3985] uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Audit & Operational Telemetry</span>
          </div>
          <h1 className="text-2xl font-black text-[#102A54] tracking-tight">
            Live Activity Feed
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time chronological stream of platform transactions, administrative actions, and system events.
          </p>
        </div>

        <button
          onClick={fetchActivities}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by action, email, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl focus:bg-white focus:outline-none focus:border-[#3C3985]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'LOGIN', 'KYC', 'GOAL', 'ORDER', 'SUPPORT', 'ADMIN'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterAction(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all ${
                filterAction === cat
                  ? 'bg-[#3C3985] text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Feed List */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="w-6 h-6 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs font-semibold">Streaming activity feed...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            No activity records matching your filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50/50 transition-colors flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#3C3985] flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-900">{item.action}</span>
                      {item.result && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            item.result === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {item.result}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {new Date(item.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 break-words mb-2">
                    {item.details || 'System event executed.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-400 font-medium">
                    {item.actorEmail && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>Actor: {item.actorEmail}</span>
                      </span>
                    )}
                    {item.actorRole && (
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-600 uppercase">
                        {item.actorRole}
                      </span>
                    )}
                    {item.ipAddress && (
                      <span className="font-mono text-[10px]">IP: {item.ipAddress}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
