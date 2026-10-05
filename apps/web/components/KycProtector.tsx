'use client';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useKyc } from '../hooks/useKyc';

export default function KycProtector({ children }: { children: React.ReactNode }) {
  const { requireKyc } = useKyc();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const check = async () => {
      const qs = searchParams.toString();
      const fullPath = qs ? `${pathname}?${qs}` : pathname;
      const isVerified = await requireKyc(fullPath);
      if (isVerified) {
        setAuthorized(true);
      }
    };
    check();
  }, [pathname, searchParams, requireKyc]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FB]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)] mb-4"></div>
        <p className="text-gray-500 font-bold">Checking your verification status...</p>
      </div>
    );
  }

  return <>{children}</>;
}
