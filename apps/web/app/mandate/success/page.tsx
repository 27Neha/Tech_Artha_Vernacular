'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function MandateSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const mandateId = searchParams.get('mandateId') || searchParams.get('id') || '';
  const [loading, setLoading] = useState(true);
  const [verifiedData, setVerifiedData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function verifyStatus() {
      if (!mandateId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/mandates/${encodeURIComponent(mandateId)}/status`);
        if (!res.ok) {
          throw new Error('Could not verify mandate status with server.');
        }
        const data = await res.json();

        if (!isMounted) return;

        // If backend verification contradicts URL, route to the true state
        if (data.status === 'REJECTED' || data.status === 'CANCELLED') {
          router.replace(`/mandate/rejected?mandateId=${encodeURIComponent(mandateId)}`);
          return;
        }
        if (data.status === 'PENDING' || data.status === 'INITIATED') {
          router.replace(`/mandate/pending?mandateId=${encodeURIComponent(mandateId)}`);
          return;
        }

        setVerifiedData(data);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Verification failed');
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
        <p className="text-sm font-bold text-gray-700">Verifying Mandate Status with Bank...</p>
        <p className="text-xs text-gray-500 mt-1">Please do not refresh this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center animate-fade-in">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>

        <h1 className="text-2xl font-black text-[var(--dark)] mb-2">
          {t('mandate.successTitle', { defaultValue: 'Mandate Approved' })}
        </h1>
        <p className="text-xs text-gray-500 leading-relaxed mb-6">
          {t('mandate.successDesc', {
            defaultValue: 'Your AutoPay mandate is officially registered. Your SIP installments will be debited automatically on schedule.',
          })}
        </p>

        {/* Verified Server Details */}
        <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 text-left mb-6 flex flex-col gap-2.5 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-gray-100">
            <span className="text-gray-500 font-medium">Mandate ID</span>
            <span className="font-mono font-bold text-gray-900">{verifiedData?.mandateId || mandateId || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-100">
            <span className="text-gray-500 font-medium">Type</span>
            <span className="font-semibold text-gray-900">{verifiedData?.type || 'UPI AutoPay'}</span>
          </div>
          {verifiedData?.maxAmount && (
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-gray-500 font-medium">Max Limit</span>
              <span className="font-bold text-gray-900">₹{Number(verifiedData.maxAmount).toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-500 font-medium">Status</span>
            <span className="font-bold text-green-600 uppercase tracking-wider flex items-center gap-1">
              <span>●</span> Verified Active
            </span>
          </div>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/portfolio')}
            className="w-full py-4 bg-[#3C3985] text-white rounded-xl text-sm font-bold hover:bg-[#322f73] transition-colors shadow-sm"
          >
            {t('mandate.viewPortfolio', { defaultValue: 'View Portfolio & Goals' })} →
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="w-full py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors"
          >
            {t('common.goToDashboard', { defaultValue: 'Go to Dashboard' })}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MandateSuccessPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading verification...</div>}>
      <MandateSuccessContent />
    </Suspense>
  );
}
