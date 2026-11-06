'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function MandatePendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const mandateId = searchParams.get('mandateId') || searchParams.get('id') || '';
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      if (!mandateId) return;

      try {
        const res = await fetch(`${API_URL}/mandates/${encodeURIComponent(mandateId)}/status`);
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;

          if (data.status === 'APPROVED') {
            router.replace(`/mandate/success?mandateId=${encodeURIComponent(mandateId)}`);
            return;
          }
          if (data.status === 'REJECTED' || data.status === 'CANCELLED') {
            router.replace(`/mandate/rejected?mandateId=${encodeURIComponent(mandateId)}`);
            return;
          }
        }
      } catch (err) {
        // Continue polling
      }
    }

    checkStatus();
    const interval = setInterval(() => {
      setPollCount((c) => c + 1);
      checkStatus();
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [mandateId, pollCount, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center animate-fade-in">
        {/* Animated Pending Ring */}
        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-amber-100" />
          <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-2xl">⏳</span>
        </div>

        <h1 className="text-2xl font-black text-[var(--dark)] mb-2">
          {t('mandate.pendingTitle', { defaultValue: 'Awaiting Bank Confirmation' })}
        </h1>
        <p className="text-xs text-gray-500 leading-relaxed mb-6">
          {t('mandate.pendingDesc', {
            defaultValue: 'Please authorize the mandate notification in your UPI application (e.g. Google Pay, PhonePe, Paytm, or BHIM). This screen updates automatically once approved.',
          })}
        </p>

        <div className="w-full bg-amber-50/60 rounded-2xl p-4 border border-amber-200/60 text-left mb-6 text-xs text-amber-900 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Mandate ID</span>
            <span className="font-mono font-bold">{mandateId || 'Processing...'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Live Status</span>
            <span className="font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
              Checking with Bank...
            </span>
          </div>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="w-full py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors"
          >
            I will check back later (Go to Dashboard)
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MandatePendingPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <MandatePendingContent />
    </Suspense>
  );
}
