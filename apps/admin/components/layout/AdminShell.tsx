'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { useAdminAuth } from '@/lib/auth-context';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading, token } = useAdminAuth();

  const isPublicPage = pathname === '/login' || pathname.startsWith('/invite');

  if (isPublicPage) {
    return <main className="min-h-screen bg-[#F8F9FB]">{children}</main>;
  }

  if (isLoading && !token) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-gray-500">Loading TechArtha Operations Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F8F9FB]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
