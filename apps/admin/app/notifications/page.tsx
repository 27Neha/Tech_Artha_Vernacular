'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { Bell, Headphones, ShieldAlert, CheckCircle2, RefreshCw, ExternalLink, MessageCircle } from 'lucide-react';

export default function NotificationsPage() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestTickets, setLatestTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAdminNotifications();
      setUnreadCount(data.unreadCount || 0);
      setLatestTickets(data.latestTickets || []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#3C3985] uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4" />
            <span>Operational Dispatch</span>
          </div>
          <h1 className="text-2xl font-black text-[#102A54] tracking-tight">
            Notifications & System Alerts
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time escalations, pending support tickets, and operational attention triggers.
          </p>
        </div>

        <button
          onClick={fetchNotifs}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Pending Support Desk Alerts
            </p>
            <p className="text-2xl font-black text-rose-600 mt-0.5">{unreadCount}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Headphones className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Operational Queue Status
            </p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">Healthy</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-black text-[#102A54]">Active Support Tickets Requiring Attention</h3>
          <Link
            href="/support"
            className="text-xs font-bold text-[#3C3985] hover:underline flex items-center gap-1"
          >
            <span>Open Full Support Desk</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="w-6 h-6 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs font-semibold">Loading alert items...</span>
          </div>
        ) : latestTickets.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            No active open support alerts right now.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {latestTickets.map((t) => (
              <div key={t.id} className="p-4 hover:bg-gray-50/50 transition-colors flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#3C3985] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-[#3C3985]">
                        {t.referenceId || t.id.slice(0, 8)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-50 text-indigo-700">
                        {t.channel}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-900">
                      {t.customerName || 'Investor'}: {t.subject}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Received{' '}
                      {new Date(t.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <Link
                  href="/support"
                  className="px-3 py-1.5 bg-[#3C3985] hover:bg-[#2F2C6E] text-white text-xs font-bold rounded-xl shrink-0 transition-colors"
                >
                  Reply & Resolve
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
