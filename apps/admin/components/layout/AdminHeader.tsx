'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, Activity, ShieldAlert, Sparkles, ExternalLink, MessageCircle, Smartphone, Mail, Phone } from 'lucide-react';
import { useAdminAuth } from '@/lib/auth-context';
import { adminApi } from '@/lib/api';

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAdminAuth();
  const [currentTime, setCurrentTime] = useState<string>('');

  // Notifications State
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestTickets, setLatestTickets] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = async () => {
    try {
      const data = await adminApi.getAdminNotifications();
      setUnreadCount(data.unreadCount || 0);
      setLatestTickets(data.latestTickets || []);
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const pollTimer = setInterval(fetchNotifications, 15000); // 15s poll
    return () => clearInterval(pollTimer);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'Operations Overview';
    return segments
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' '))
      .join(' / ');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Breadcrumbs & Page title */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
            <span>TechArtha</span>
            <span>/</span>
            <span className="text-[#3C3985] font-bold">{getBreadcrumbs()}</span>
          </div>
        </div>
      </div>

      {/* Right: Operational indicators & status */}
      <div className="flex items-center gap-4">
        {/* Environment Badge */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>API Connected (Port 3000)</span>
        </div>

        {/* Port Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-[#3C3985]">
          <span>Portal: Port 3002</span>
        </div>

        {/* Live IST clock */}
        <div className="hidden lg:block text-xs font-medium text-gray-500 font-mono">
          IST {currentTime || '...'}
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2 text-gray-600 hover:text-[#3C3985] hover:bg-gray-100 rounded-xl transition-colors relative"
            title="Support Tickets Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-[#102A54]">Support Desk Alerts</h4>
                  <p className="text-[10px] text-gray-400">{unreadCount} active open tickets</p>
                </div>
                <button
                  onClick={() => {
                    setShowNotifDropdown(false);
                    router.push('/support');
                  }}
                  className="text-[11px] font-bold text-[#3C3985] hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 text-xs">
                {latestTickets.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-xs">
                    No active support alerts right now.
                  </div>
                ) : (
                  latestTickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setShowNotifDropdown(false);
                        router.push('/support');
                      }}
                      className="p-3 hover:bg-gray-50 cursor-pointer transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-[#3C3985]">
                          {t.referenceId || t.id.slice(0, 8)}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-50 text-emerald-700">
                          {t.channel}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 text-xs truncate">
                        {t.customerName || 'Investor'}: {t.subject}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(t.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-gray-50 border-t border-gray-100 text-center">
                <button
                  onClick={() => {
                    setShowNotifDropdown(false);
                    router.push('/support');
                  }}
                  className="text-xs font-bold text-[#3C3985] hover:underline"
                >
                  Open Support Desk →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Role Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-[#3C3985]/10 text-[#3C3985] font-bold text-xs flex items-center justify-center">
            {user?.name?.slice(0, 2).toUpperCase() || 'OP'}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold text-[#102A54] leading-tight">{user?.name || 'Staff'}</p>
            <p className="text-[10px] text-gray-400 font-medium">{user?.role || 'OPERATIONS'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
