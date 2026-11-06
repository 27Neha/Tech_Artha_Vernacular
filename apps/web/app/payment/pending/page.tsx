'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function PaymentPendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const paymentId = searchParams.get('paymentId') || searchParams.get('id') || searchParams.get('orderId') || '';
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      if (!paymentId) return;

      try {
        const res = await fetch(`${API_URL}/payments/${encodeURIComponent(paymentId)}/status`);
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;

          if (data.status === 'SUCCESSFUL' || data.status === 'SUCCESS') {
            router.replace(`/payment/success?paymentId=${encodeURIComponent(paymentId)}`);
            return;
          }
          if (data.status === 'REJECTED' || data.status === 'FAILED') {
            router.replace(`/payment/rejected?paymentId=${encodeURIComponent(paymentId)}`);
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
  }, [paymentId, pollCount, router]);

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
          {t('payment.pendingTitle', { defaultValue: 'Confirming with Your Bank' })}
        </h1>
        <p className="text-xs text-gray-500 leading-relaxed mb-6">
          {t('payment.pendingDesc', {
            defaultValue: 'Please complete the transaction in your UPI app or Net Banking portal. This screen will update automatically as soon as payment is confirmed.',
          })}
        </p>

        <div className="w-full bg-amber-50/60 rounded-2xl p-4 border border-amber-200/60 text-left mb-6 text-xs text-amber-900 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Transaction Ref</span>
            <span className="font-mono font-bold">{paymentId || 'Processing...'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Status</span>
            <span className="font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
              Awaiting Settlement...
            </span>
          </div>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/portfolio')}
            className="w-full py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors"
          >
            I have completed payment (Go to Portfolio)
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <PaymentPendingContent />
    </Suspense>
  );
}
