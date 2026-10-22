'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Search, Activity, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';
import { useAdminAuth } from '@/lib/auth-context';

export function AdminHeader() {
  const pathname = usePathname();
  const { user } = useAdminAuth();
  const [currentTime, setCurrentTime] = useState<string>('');

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
