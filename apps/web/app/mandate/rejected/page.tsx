'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function MandateRejectedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const mandateId = searchParams.get('mandateId') || searchParams.get('id') || '';
  const [loading, setLoading] = useState(true);
  const [verifiedData, setVerifiedData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function verifyStatus() {
      if (!mandateId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/mandates/${encodeURIComponent(mandateId)}/status`);
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;

          // If backend verification says approved, redirect to success
          if (data.status === 'APPROVED') {
            router.replace(`/mandate/success?mandateId=${encodeURIComponent(mandateId)}`);
            return;
          }
          if (data.status === 'PENDING' || data.status === 'INITIATED') {
            router.replace(`/mandate/pending?mandateId=${encodeURIComponent(mandateId)}`);
            return;
          }

          setVerifiedData(data);
        }
      } catch (err) {
        // Continue showing rejected view
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    verifyStatus();
    return () => {
      isMounted = false;
    };
  }, [mandateId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-[#3C3985] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-gray-700">Checking mandate status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center animate-fade-in">
        {/* Error Icon */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>

        <h1 className="text-2xl font-black text-[var(--dark)] mb-2">
          {t('mandate.rejectedTitle', { defaultValue: 'Mandate Not Approved' })}
        </h1>
        <p className="text-xs text-gray-500 leading-relaxed mb-6">
          {t('mandate.rejectedDesc', {
            defaultValue: 'Your bank or UPI application was unable to authorize this recurring debit mandate.',
          })}
        </p>

        {/* Rejection Details */}
        <div className="w-full bg-red-50/50 rounded-2xl p-4 border border-red-100 text-left mb-6 flex flex-col gap-2.5 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-red-100">
            <span className="text-gray-500 font-medium">Reference ID</span>
            <span className="font-mono font-bold text-gray-900">{verifiedData?.mandateId || mandateId || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-500 font-medium">Status</span>
            <span className="font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
              <span>●</span> {verifiedData?.status || 'REJECTED'}
            </span>
          </div>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/portfolio')}
            className="w-full py-4 bg-[#3C3985] text-white rounded-xl text-sm font-bold hover:bg-[#322f73] transition-colors shadow-sm"
          >
            {t('mandate.tryAgain', { defaultValue: 'Try Authorizing Again' })}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/support')}
            className="w-full py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors"
          >
            {t('common.contactSupport', { defaultValue: 'Contact TechArtha Support' })}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MandateRejectedPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <MandateRejectedContent />
    </Suspense>
  );
}
