'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Target,
  ArrowLeftRight,
  TrendingUp,
  Headphones,
  FileText,
  DownloadCloud,
  LogOut,
  Building2,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    name: 'Dashboard Overview',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Clients & Users',
    href: '/users',
    icon: Users,
  },
  {
    name: 'KYC & Onboarding',
    href: '/onboarding',
    icon: ShieldCheck,
    badgeKey: 'kyc',
  },
  {
    name: 'Risk & Goals',
    href: '/risk-goals',
    icon: Target,
  },
  {
    name: 'Orders & Mandates',
    href: '/transactions',
    icon: ArrowLeftRight,
  },
  {
    name: 'Funds & Schemes',
    href: '/funds',
    icon: TrendingUp,
  },
  {
    name: 'Support Operations',
    href: '/support',
    icon: Headphones,
  },
  {
    name: 'Audit Trail',
    href: '/audit',
    icon: FileText,
  },
  {
    name: 'Reports & Export',
    href: '/reports',
    icon: DownloadCloud,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAdminAuth();

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'OPERATIONS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SUPPORT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'ANALYST':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 min-h-screen sticky top-0 h-screen">
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-gray-100 flex items-center justify-between">
        <Link href="/" className="flex items-center justify-between w-full gap-2">
          <img
            src="/techartha-logo.png"
            alt="TechArtha Logo"
            className="h-8 w-auto max-w-[135px] object-contain"
          />
          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F7941E]/15 text-[#F7941E] shrink-0">
            Ops
          </span>
        </Link>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          Platform Operations
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#3C3985] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#3C3985]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span className="truncate">{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70 shrink-0" />}
            </Link>
          );
        })}
      </div>

      {/* Footer User Profile & Logout */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50">
        <div className="p-2.5 rounded-xl bg-white border border-gray-200/80 shadow-2xs mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-gray-900 truncate max-w-[130px]">
              {user?.name || 'Staff Member'}
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${getRoleBadgeColor(
                user?.role,
              )}`}
            >
              {user?.role?.replace('_', ' ') || 'STAFF'}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 truncate">{user?.email || 'admin@techartha.com'}</p>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
