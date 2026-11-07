'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function MandateSuccessContent() {
  const searchParams = useSearchParams();
  const mandateId =
    searchParams.get('mandateId') ||
    searchParams.get('id') ||
    searchParams.get('mandate_id') ||
    null;
  const rawStatus = (searchParams.get('status') || '').toUpperCase();
  const umrn = searchParams.get('umrn') || null;

  const isApproved = rawStatus === 'APPROVED' || rawStatus === 'ACTIVE';
  const isRejected =
    rawStatus === 'REJECTED' ||
    rawStatus === 'FAILED' ||
    rawStatus === 'CANCELLED' ||
    rawStatus === 'EXPIRED';

  const [deepLinkAttempted, setDeepLinkAttempted] = useState(false);

  const buildDeepLink = () => {
    const params = new URLSearchParams();
    if (mandateId) params.set('mandateId', mandateId);
    if (rawStatus) params.set('status', rawStatus);
    if (umrn) params.set('umrn', umrn);
    const qs = params.toString();
    return qs ? `techartha://mandate-complete?${qs}` : 'techartha://mandate-complete';
  };

  useEffect(() => {
    const deepLinkUrl = buildDeepLink();
    const timeout = setTimeout(() => {
      setDeepLinkAttempted(true);
      window.location.href = deepLinkUrl;
    }, 600);

    return () => clearTimeout(timeout);
  }, [mandateId, rawStatus, umrn]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
        {/* Status Icon */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-4 ${
            isApproved
              ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
              : isRejected
                ? 'bg-rose-50 border-rose-100 text-rose-600'
                : 'bg-amber-50 border-amber-100 text-amber-600'
          }`}
        >
          {isApproved ? (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          ) : isRejected ? (
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
            isApproved
              ? 'bg-emerald-50 text-emerald-700'
              : isRejected
                ? 'bg-rose-50 text-rose-700'
                : 'bg-amber-50 text-amber-700'
          }`}
        >
          NPCI / Cybrilla Mandate Postback
        </span>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          {isApproved
            ? 'Mandate Approved'
            : isRejected
              ? 'Mandate Authorization Failed'
              : 'Returning to TechArtha'}
        </h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          {isApproved
            ? 'Your auto-debit mandate has been approved by your bank. Return to the TechArtha app to link it to your SIP plans.'
            : isRejected
              ? 'The mandate authorization was declined or cancelled at the bank portal. You can initiate a new authorization from the app.'
              : 'Your bank authorization session has finished. Return to the TechArtha app so we can verify your live mandate status with Cybrilla.'}
        </p>

        {/* Details Card (only shows real parameters when provided by gateway) */}
        {(mandateId || umrn || rawStatus) && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-left mb-6 space-y-2 text-sm">
            {mandateId && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 text-xs">Mandate ID</span>
                <span className="font-mono font-semibold text-slate-800 text-xs">{mandateId}</span>
              </div>
            )}
            {umrn && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 text-xs">UMRN</span>
                <span className="font-mono text-slate-700 text-xs">{umrn}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 text-xs">Gateway Status</span>
              <span
                className={`font-bold text-xs flex items-center gap-1 ${
                  isApproved
                    ? 'text-emerald-600'
                    : isRejected
                      ? 'text-rose-600'
                      : 'text-amber-600'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    isApproved ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-amber-500'
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
          href="/dashboard"
          className="w-full block py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs transition duration-200"
        >
          Continue to Web Dashboard
        </a>

        {deepLinkAttempted && (
          <p className="text-xs text-slate-400 mt-4 leading-normal">
            If the TechArtha mobile app did not open automatically, tap the button above to return and sync your mandate status.
          </p>
        )}
      </div>
    </div>
  );
}

export default function MandateSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">Loading mandate callback...</div>}>
      <MandateSuccessContent />
    </Suspense>
  );
}
