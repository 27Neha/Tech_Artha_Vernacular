'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Sparkles as SparklesOriginal,
  ArrowRight as ArrowRightOriginal,
  Smartphone as SmartphoneOriginal,
  Globe as GlobeOriginal,
  AlertCircle as AlertCircleOriginal,
  CheckCircle2 as CheckCircle2Original,
} from 'lucide-react';

const Sparkles = SparklesOriginal as any;
const ArrowRight = ArrowRightOriginal as any;
const Smartphone = SmartphoneOriginal as any;
const Globe = GlobeOriginal as any;
const AlertCircle = AlertCircleOriginal as any;
const CheckCircle2 = CheckCircle2Original as any;

function ResumeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get('ref');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    valid: boolean;
    userName: string;
    maskedMobile: string;
    targetScreen: string;
    step: string;
    deepLinkUrl: string;
    fallbackWebUrl: string;
    appStoreUrl: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appAttempted, setAppAttempted] = useState(false);

  useEffect(() => {
    if (!ref) {
      setError('Missing resume reference. Please use the link sent to your WhatsApp.');
      setLoading(false);
      return;
    }

    async function fetchResumeInfo() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000';
        const res = await fetch(`${apiUrl}/api/reminders/resume?ref=${encodeURIComponent(ref!)}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'This resume link has expired or is invalid.');
        }

        const json = await res.json();
        setData(json);

        // Attempt deep link into the installed native app
        if (json.deepLinkUrl && typeof window !== 'undefined') {
          setAppAttempted(true);
          window.location.href = json.deepLinkUrl;
        }
      } catch (err: any) {
        setError(err.message || 'Unable to resume session.');
      } finally {
        setLoading(false);
      }
    }

    fetchResumeInfo();
  }, [ref]);

  const handleOpenApp = () => {
    if (data?.deepLinkUrl && typeof window !== 'undefined') {
      window.location.href = data.deepLinkUrl;
    }
  };

  const handleContinueWeb = () => {
    if (data?.fallbackWebUrl) {
      router.push(data.fallbackWebUrl);
    } else {
      router.push('/dashboard/profile/edit');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-[#102A54]">Resuming your TechArtha journey...</h2>
        <p className="text-xs text-gray-500 mt-1">Connecting to your profile</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-gray-100 shadow-xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-extrabold text-[#102A54] mb-2">Link Expired or Invalid</h1>
          <p className="text-xs text-gray-500 leading-relaxed mb-6">
            {error || 'We could not find an active signup session for this link. You can sign in or register below.'}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 px-4 bg-[#3C3985] hover:bg-[#2A2761] text-white rounded-xl text-xs font-bold transition shadow-md"
            >
              Sign In to Your Account
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition"
            >
              Start New Registration
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#102A54]/5 via-[#F8F9FB] to-[#3C3985]/10 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-gray-100 shadow-2xl text-center">
        {/* Brand Header */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Welcome back{data.userName ? `, ${data.userName}` : ''}!</span>
          </div>
        </div>

        <h1 className="text-xl font-extrabold text-[#102A54] tracking-tight mb-2">
          Your Financial Journey Awaits 🌱
        </h1>
        <p className="text-xs text-gray-500 leading-relaxed mb-6">
          You are just one step away from completing your setup for{' '}
          <span className="font-semibold text-gray-700">{data.maskedMobile || 'your account'}</span>.
          Pick up right where you left off!
        </p>

        {appAttempted && (
          <div className="mb-6 p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-left flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#3C3985] shrink-0 mt-0.5" />
            <div className="text-[11px] text-gray-600">
              <span className="font-bold text-[#102A54] block">Launching TechArtha App</span>
              If your app didn&apos;t open automatically, choose an option below.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleOpenApp}
            className="w-full py-3.5 px-4 bg-[#3C3985] hover:bg-[#2A2761] text-white rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
          >
            <Smartphone className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Open TechArtha App 🚀</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleContinueWeb}
            className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 text-[#102A54] border border-gray-200 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <Globe className="w-4 h-4 text-gray-500" />
            <span>Continue on TechArtha Web 🌐</span>
          </button>

          {data.appStoreUrl && (
            <a
              href={data.appStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block pt-2 text-[11px] font-semibold text-gray-400 hover:text-[#3C3985] transition-colors"
            >
              Don&apos;t have the app yet? Download from Google Play Store 📲
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResumePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4">
          <div className="w-8 h-8 border-3 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin" />
        </div>
      }
    >
      <ResumeContent />
    </Suspense>
  );
}
