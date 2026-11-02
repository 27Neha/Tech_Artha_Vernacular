'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('order_id') || searchParams.get('id') || 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const amount = searchParams.get('amount') || '5,000';
  const schemeName = searchParams.get('schemeName') || searchParams.get('fund') || 'Mutual Fund Investment';
  const status = searchParams.get('status') || 'SUCCESS';

  const [deepLinkAttempted, setDeepLinkAttempted] = useState(false);

  useEffect(() => {
    // Attempt deep link into TechArtha mobile app
    const deepLinkUrl = `techartha://payment-complete?orderId=${encodeURIComponent(orderId)}&status=${encodeURIComponent(status)}&amount=${encodeURIComponent(amount)}`;
    const timeout = setTimeout(() => {
      setDeepLinkAttempted(true);
      window.location.href = deepLinkUrl;
    }, 800);

    return () => clearTimeout(timeout);
  }, [orderId, status, amount]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-emerald-50 border-4 border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-sm">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Header */}
        <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
          Payment Confirmed
        </span>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Order Placed Successfully!</h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          Your payment has been received and routed to the Asset Management Company (AMC). Mutual fund units will be credited to your folio per SEBI settlement timelines.
        </p>

        {/* Details Card */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-left mb-6 space-y-2 text-sm">
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 text-xs">Order ID</span>
            <span className="font-mono font-semibold text-slate-800 text-xs">{orderId}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 text-xs">Scheme Name</span>
            <span className="font-semibold text-slate-800 text-xs truncate max-w-[200px]">{schemeName}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 text-xs">Amount Paid</span>
            <span className="font-bold text-indigo-900 text-xs">₹{amount}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500 text-xs">Payment Status</span>
            <span className="font-bold text-emerald-600 text-xs flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              {status}
            </span>
          </div>
        </div>

        {/* Actions */}
        <a
          href={`techartha://payment-complete?orderId=${encodeURIComponent(orderId)}&status=${encodeURIComponent(status)}`}
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
            If the mobile app does not launch automatically, tap &ldquo;Return to TechArtha App&rdquo; above.
          </p>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">Loading confirmation...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
