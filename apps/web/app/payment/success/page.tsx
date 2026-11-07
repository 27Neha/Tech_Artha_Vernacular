'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const orderId =
    searchParams.get('orderId') ||
    searchParams.get('order_id') ||
    searchParams.get('id') ||
    null;
  const amount = searchParams.get('amount') || null;
  const schemeName = searchParams.get('schemeName') || searchParams.get('fund') || null;
  const rawStatus = (searchParams.get('status') || '').toUpperCase();

  const isConfirmed =
    rawStatus === 'SUCCEEDED' ||
    rawStatus === 'CONFIRMED' ||
    rawStatus === 'SUCCESS' ||
    rawStatus === 'COMPLETED';
  const isFailed =
    rawStatus === 'FAILED' ||
    rawStatus === 'REVERSED' ||
    rawStatus === 'REJECTED' ||
    rawStatus === 'CANCELLED';

  const [deepLinkAttempted, setDeepLinkAttempted] = useState(false);

  const buildDeepLink = () => {
    const params = new URLSearchParams();
    if (orderId) params.set('orderId', orderId);
    if (rawStatus) params.set('status', rawStatus);
    if (amount) params.set('amount', amount);
    if (schemeName) params.set('schemeName', schemeName);
    const qs = params.toString();
    return qs ? `techartha://payment-complete?${qs}` : 'techartha://payment-complete';
  };

  useEffect(() => {
    const deepLinkUrl = buildDeepLink();
    const timeout = setTimeout(() => {
      setDeepLinkAttempted(true);
      window.location.href = deepLinkUrl;
    }, 600);

    return () => clearTimeout(timeout);
  }, [orderId, rawStatus, amount, schemeName]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
        {/* Status Icon */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-4 ${
            isConfirmed
              ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
              : isFailed
                ? 'bg-rose-50 border-rose-100 text-rose-600'
                : 'bg-amber-50 border-amber-100 text-amber-600'
          }`}
        >
          {isConfirmed ? (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          ) : isFailed ? (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>

        {/* Header */}
        <span
          className={`inline-block px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider mb-2 ${
            isConfirmed
              ? 'bg-emerald-50 text-emerald-700'
              : isFailed
                ? 'bg-rose-50 text-rose-700'
                : 'bg-amber-50 text-amber-700'
          }`}
        >
          Cybrilla Payment Postback
        </span>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          {isConfirmed
            ? 'Payment Confirmed'
            : isFailed
              ? 'Payment Not Completed'
              : 'Returning to TechArtha'}
        </h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          {isConfirmed
            ? 'Your payment has been confirmed by the gateway. Return to the TechArtha app to view your updated order status.'
            : isFailed
              ? 'The payment session failed or was cancelled. Any debited amount will be refunded automatically by the clearing corporation.'
              : 'Your bank payment session has finished. Return to the TechArtha app so we can verify your live order status with Cybrilla.'}
        </p>

        {/* Details Card (only shows real parameters when provided by gateway) */}
        {(orderId || schemeName || amount || rawStatus) && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-left mb-6 space-y-2 text-sm">
            {orderId && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 text-xs">Order ID</span>
                <span className="font-mono font-semibold text-slate-800 text-xs">{orderId}</span>
              </div>
            )}
            {schemeName && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 text-xs">Scheme</span>
                <span className="font-semibold text-slate-800 text-xs truncate max-w-[200px]">{schemeName}</span>
              </div>
            )}
            {amount && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 text-xs">Amount</span>
                <span className="font-bold text-indigo-900 text-xs">₹{amount}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 text-xs">Gateway Status</span>
              <span
                className={`font-bold text-xs flex items-center gap-1 ${
                  isConfirmed
                    ? 'text-emerald-600'
                    : isFailed
                      ? 'text-rose-600'
                      : 'text-amber-600'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    isConfirmed ? 'bg-emerald-500' : isFailed ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                ></span>
                {rawStatus || 'VERIFYING IN APP'}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <a
          href={buildDeepLink()}
          className="w-full block py-3.5 px-4 bg-indigo-900 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-md transition duration-200 text-sm mb-3"
        >
          Return to TechArtha App
        </a>

        <a
          href="/dashboard/portfolio"
          className="w-full block py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs transition duration-200"
        >
          View Portfolio on Web
        </a>

        {deepLinkAttempted && (
          <p className="text-xs text-slate-400 mt-4 leading-normal">
            If the mobile app does not launch automatically, tap &ldquo;Return to TechArtha App&rdquo; above to check your live order status.
          </p>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">Loading payment callback...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
