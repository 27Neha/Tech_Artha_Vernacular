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
  Activity,
  Bell,
  CreditCard,
  PieChart,
  Repeat,
  CheckSquare,
  ShieldAlert,
  Sliders,
  Settings,
} from 'lucide-react';

interface NavGroup {
  label: string;
  items: Array<{
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    permission?: string;
  }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard Overview', href: '/', icon: LayoutDashboard },
      { name: 'Live Activity Feed', href: '/activity', icon: Activity, permission: 'activity.view' },
      { name: 'Notifications & Alerts', href: '/notifications', icon: Bell },
    ],
  },
  {
    label: 'Customer Management',
    items: [
      { name: 'All Investors', href: '/users', icon: Users, permission: 'users.view' },
      { name: 'KYC & Verification', href: '/onboarding', icon: ShieldCheck, permission: 'kyc.view' },
      { name: 'Bank Accounts', href: '/bank-verification', icon: CreditCard, permission: 'bank_verification.view' },
      { name: 'Risk Profiles', href: '/risk-profiles', icon: Target, permission: 'risk_profiles.view' },
    ],
  },
  {
    label: 'Investment Operations',
    items: [
      { name: 'Financial Goals', href: '/goals', icon: Target, permission: 'goals.view' },
      { name: 'Investment Accounts', href: '/investment-accounts', icon: Building2, permission: 'investment_accounts.view' },
      { name: 'Portfolios', href: '/portfolio', icon: PieChart, permission: 'portfolio.view' },
      { name: 'SIP Management', href: '/sip-management', icon: Repeat, permission: 'sip.view' },
      { name: 'Order Status', href: '/order-status', icon: ArrowLeftRight, permission: 'order_status.view' },
      { name: 'Funds & Schemes', href: '/funds', icon: TrendingUp, permission: 'funds.view' },
    ],
  },
  {
    label: 'Support & Operations',
    items: [
      { name: 'Support Desk', href: '/support', icon: Headphones, permission: 'support.view' },
      { name: 'Operational Tasks', href: '/tasks', icon: CheckSquare, permission: 'tasks.view' },
    ],
  },
  {
    label: 'Reports & Compliance',
    items: [
      { name: 'Compliance & AML', href: '/compliance', icon: ShieldAlert, permission: 'compliance.view' },
      { name: 'Audit Trail', href: '/audit', icon: FileText, permission: 'audit.view' },
      { name: 'Reports & Export', href: '/reports', icon: DownloadCloud, permission: 'reports.export' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { name: 'System Settings', href: '/settings', icon: Sliders, permission: 'settings.view' },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout, hasPermission, isSuperAdmin } = useAdminAuth();

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ADMIN':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'OPERATIONS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SUPPORT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'FINANCE':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'COMPLIANCE':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'ANALYST':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 min-h-screen sticky top-0 h-screen">
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-gray-100 flex items-center justify-between shrink-0">
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

      {/* Nav List with 6 Categorized Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NAV_GROUPS.map((group) => {
          // Filter items by permission
          const visibleItems = group.items.filter((item) => {
            if (!item.permission || isSuperAdmin) return true;
            return hasPermission(item.permission);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="space-y-1">
              <div className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                {group.label}
              </div>
              {visibleItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#3C3985] text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-[#3C3985]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-white' : 'text-gray-400'
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 opacity-70 shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer User Profile & Logout */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
        <div className="p-2.5 rounded-xl bg-white border border-gray-200/80 shadow-2xs mb-2">
          <div className="flex items-center justify-between mb-1">
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
