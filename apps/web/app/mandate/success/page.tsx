'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function MandateSuccessContent() {
  const searchParams = useSearchParams();
  const mandateId = searchParams.get('mandateId') || searchParams.get('id') || searchParams.get('mandate_id') || 'MND-' + Math.floor(100000 + Math.random() * 900000);
  const status = searchParams.get('status') || 'APPROVED';
  const umrn = searchParams.get('umrn') || 'NACH' + Math.floor(1000000000 + Math.random() * 9000000000);

  const [deepLinkAttempted, setDeepLinkAttempted] = useState(false);

  useEffect(() => {
    // Attempt deep link into TechArtha mobile app
    const deepLinkUrl = `techartha://mandate-complete?mandateId=${encodeURIComponent(mandateId)}&status=${encodeURIComponent(status)}&umrn=${encodeURIComponent(umrn)}`;
    const timeout = setTimeout(() => {
      setDeepLinkAttempted(true);
      window.location.href = deepLinkUrl;
    }, 800);

    return () => clearTimeout(timeout);
  }, [mandateId, status, umrn]);

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
          NPCI / RBI E-Mandate
        </span>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Mandate Authorized!</h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          Your auto-debit mandate has been registered with your bank and clearing corporation. You can now set up automated SIP investments without manual OTPs.
        </p>

        {/* Details Card */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-left mb-6 space-y-2 text-sm">
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 text-xs">Mandate Reference ID</span>
            <span className="font-mono font-semibold text-slate-800 text-xs">{mandateId}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 text-xs">UMRN Identifier</span>
            <span className="font-mono text-slate-700 text-xs">{umrn}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500 text-xs">Authorization Status</span>
            <span className="font-bold text-emerald-600 text-xs flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              {status}
            </span>
          </div>
        </div>

        {/* Actions */}
        <a
          href={`techartha://mandate-complete?mandateId=${encodeURIComponent(mandateId)}&status=${encodeURIComponent(status)}`}
          className="w-full block py-3.5 px-4 bg-indigo-900 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-md transition duration-200 text-sm mb-3"
        >
          Return to TechArtha App
        </a>

        <a
          href="/dashboard"
          className="w-full block py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs transition duration-200"
        >
          Continue to Web Dashboard
        </a>

        {deepLinkAttempted && (
          <p className="text-xs text-slate-400 mt-4 leading-normal">
            If the TechArtha mobile app did not open automatically, tap the button above to continue.
          </p>
        )}
      </div>
    </div>
  );
}

export default function MandateSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">Loading authorization...</div>}>
      <MandateSuccessContent />
    </Suspense>
  );
}
