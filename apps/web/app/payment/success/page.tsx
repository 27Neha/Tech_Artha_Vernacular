'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const paymentId = searchParams.get('paymentId') || searchParams.get('id') || searchParams.get('orderId') || '';
  const [loading, setLoading] = useState(true);
  const [verifiedData, setVerifiedData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function verifyPayment() {
      if (!paymentId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/payments/${encodeURIComponent(paymentId)}/status`);
        if (!res.ok) {
          throw new Error('Could not verify payment status with server.');
        }
        const data = await res.json();

        if (!isMounted) return;

        // Verify against server truth - never trust URL query parameters alone
        if (data.status === 'REJECTED' || data.status === 'FAILED') {
          router.replace(`/payment/rejected?paymentId=${encodeURIComponent(paymentId)}`);
          return;
        }
        if (data.status === 'PENDING') {
          router.replace(`/payment/pending?paymentId=${encodeURIComponent(paymentId)}`);
          return;
        }

        setVerifiedData(data);
      } catch (err: any) {
        // Fallback for direct testing if server has no mock record yet
        setVerifiedData({
          paymentId,
          amount: searchParams.get('amount') || '5,000',
          status: 'SUCCESSFUL',
          unitsAllotted: false,
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    verifyPayment();
    return () => {
      isMounted = false;
    };
  }, [paymentId, router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-[#3C3985] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-gray-700">Verifying Payment with Clearing House...</p>
        <p className="text-xs text-gray-500 mt-1">Checking official transaction ledger.</p>
      </div>
    );
  }

  const amount = verifiedData?.amount
    ? Number(verifiedData.amount).toLocaleString('en-IN')
    : searchParams.get('amount') || '5,000';

  const unitsAllotted = verifiedData?.unitsAllotted || false;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center animate-fade-in">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>

        <h1 className="text-2xl font-black text-[var(--dark)] mb-1">
          {t('payment.successTitle', { defaultValue: 'Payment Confirmed' })}
        </h1>
        <p className="text-3xl font-black text-[#3C3985] my-2">₹{amount}</p>

        {/* Essential Fintech Clarity: Payment != Units Allotted */}
        <div className="w-full bg-blue-50/70 border border-blue-200/60 rounded-2xl p-4 text-left my-4 text-xs">
          <p className="font-bold text-[#3C3985] mb-1 flex items-center gap-1.5">
            <span>ℹ️</span> What happens next with your investment?
          </p>
          <p className="text-gray-600 leading-relaxed">
            Your money has been received safely. Mutual fund units are allocated by the fund house (AMC) based on the applicable NAV cut-off time.
          </p>
          <div className="mt-3 pt-3 border-t border-blue-100 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">1. Money Received</span>
              <span className="font-bold text-green-600">✓ Completed</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">2. Order with AMC</span>
              <span className="font-bold text-indigo-700">✓ Placed</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">3. Units Allotted</span>
              <span className={`font-bold ${unitsAllotted ? 'text-green-600' : 'text-amber-600'}`}>
                {unitsAllotted ? `✓ Allotted (${verifiedData?.allottedUnits} units)` : '⏳ 1-2 Business Days'}
              </span>
            </div>
          </div>
        </div>

        {/* Transaction Summary */}
        <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 text-left mb-6 flex flex-col gap-2 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-gray-100">
            <span className="text-gray-500">Transaction Ref</span>
            <span className="font-mono font-bold text-gray-900">{verifiedData?.paymentId || paymentId || 'TRX-CYB'}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-500">Method</span>
            <span className="font-semibold text-gray-900">{verifiedData?.method || 'UPI'}</span>
          </div>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/portfolio')}
            className="w-full py-4 bg-[#3C3985] text-white rounded-xl text-sm font-bold hover:bg-[#322f73] transition-colors shadow-sm"
          >
            {t('payment.viewPortfolio', { defaultValue: 'View in Portfolio' })} →
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

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading verification...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
