'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const TABS = [
  { id: 'home', label: 'Home', icon: '🏠', href: '/dashboard' },
  { id: 'portfolio', label: 'Portfolio', icon: '📊', href: '/dashboard/portfolio' },
  { id: 'expenses', label: 'Expenses', icon: '💰', href: '/dashboard/expenses' },
  { id: 'learn', label: 'Learn', icon: '📚', href: '/dashboard/learn' },
  { id: 'profile', label: 'Profile', icon: '👤', href: '/dashboard/profile' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = TABS.find((t) =>
    pathname === t.href || (t.href !== '/dashboard' && pathname.startsWith(t.href))
  )?.id ?? 'home';

  return (
    <div className="flex flex-col flex-1">
      {/* Page content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {children}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 flex">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => router.push(tab.href)}
            className={`flex-1 flex flex-col items-center py-3 transition-all ${
              activeTab === tab.id ? 'text-[var(--primary)]' : 'text-gray-400'
            }`}
          >
            <span className="text-xl mb-0.5">{tab.icon}</span>
            <span className={`text-xs font-bold ${activeTab === tab.id ? 'text-[var(--primary)]' : 'text-gray-400'}`}>
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <div className="w-1 h-1 bg-[var(--primary)] rounded-full mt-1" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
