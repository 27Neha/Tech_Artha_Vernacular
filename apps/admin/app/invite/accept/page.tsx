'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [isValidating, setIsValidating] = useState(true);
  const [inviteData, setInviteData] = useState<{
    valid: boolean;
    email: string;
    role: string;
    department?: string;
    expiresAt: string;
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      setValidationError('No invitation token was provided in the URL. Please verify your invitation link.');
      return;
    }

    async function checkToken() {
      try {
        const res = await adminApi.validateInvitationToken(token);
        if (res.valid) {
          setInviteData(res);
          // Suggest name from email local part
          const emailPrefix = res.email.split('@')[0].replace(/[._]/g, ' ');
          const formatted = emailPrefix
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          setFullName(formatted);
        } else {
          setValidationError('This invitation is invalid or has expired.');
        }
      } catch (err: any) {
        setValidationError(err.message || 'Unable to validate invitation. It may have expired or been revoked.');
      } finally {
        setIsValidating(false);
      }
    }

    checkToken();
  }, [token]);

  // Password Validation Criteria
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid =
    fullName.trim().length >= 2 &&
    hasMinLength &&
    hasUpper &&
    hasLower &&
    hasNumber &&
    hasSpecial &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await adminApi.acceptInvitation({
        token,
        password,
        fullName: fullName.trim(),
      });

      adminApi.setToken(res.token);
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to activate your account. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mb-4" />
        <h3 className="text-base font-bold text-gray-800">Verifying TechArtha Invitation...</h3>
        <p className="text-xs text-gray-500 mt-1">Checking cryptographic token authenticity</p>
      </div>
    );
  }

  if (validationError || !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-rose-100 shadow-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Invitation Link Invalid</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            {validationError || 'This invitation has expired or has already been used.'}
          </p>
          <div className="pt-2">
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 px-4 rounded-xl bg-[#3C3985] text-white font-bold text-xs hover:bg-[#32306f] transition-all"
            >
              Go to TechArtha Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-emerald-100 shadow-xl p-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 animate-bounce" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Account Activated!</h2>
          <p className="text-xs text-gray-500">
            Welcome to the TechArtha Operations Team. Logging you in now...
          </p>
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto pt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <img
          src="/techartha-logo.png"
          alt="TechArtha Logo"
          className="h-10 mx-auto object-contain mb-3"
        />
        <h2 className="text-2xl font-black text-[#102A54] tracking-tight">
          Welcome to TechArtha Team
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Set up your administrator credentials to access your designated workspace
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-gray-100 sm:px-10">
          {/* Invitee Metadata Card */}
          <div className="mb-6 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-[#3C3985] uppercase tracking-wider">
                Assigned Role
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#3C3985] text-white uppercase">
                {inviteData.role.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm font-bold text-gray-900">{inviteData.email}</p>
            {inviteData.department && (
              <p className="text-xs text-gray-500 mt-0.5">Department: {inviteData.department}</p>
            )}
          </div>

          {submitError && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Full Legal Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#3C3985]/20 focus:border-[#3C3985]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Set Strong Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#3C3985]/20 focus:border-[#3C3985]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#3C3985]/20 focus:border-[#3C3985]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Rules Checklist */}
            <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-[11px] text-gray-600 border border-gray-200/60">
              <p className="font-bold text-gray-700 text-[10px] uppercase tracking-wider mb-1">
                Security Policy Checklist:
              </p>
              <div className="grid grid-cols-2 gap-1">
                <span className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-bold' : 'text-gray-400'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-gray-300'}`} />
                  Min 8 characters
                </span>
                <span className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-700 font-bold' : 'text-gray-400'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasUpper ? 'text-emerald-600' : 'text-gray-300'}`} />
                  Uppercase letter
                </span>
                <span className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-700 font-bold' : 'text-gray-400'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasLower ? 'text-emerald-600' : 'text-gray-300'}`} />
                  Lowercase letter
                </span>
                <span className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-bold' : 'text-gray-400'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-600' : 'text-gray-300'}`} />
                  One number
                </span>
                <span className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-700 font-bold' : 'text-gray-400'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasSpecial ? 'text-emerald-600' : 'text-gray-300'}`} />
                  Special symbol
                </span>
                <span className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-700 font-bold' : 'text-gray-400'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${passwordsMatch ? 'text-emerald-600' : 'text-gray-300'}`} />
                  Passwords match
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
                isFormValid && !isSubmitting
                  ? 'bg-[#3C3985] hover:bg-[#32306f] hover:shadow-lg'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Activating Security Credentials...</span>
                </>
              ) : (
                <>
                  <span>Activate Account & Proceed</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-gray-400">
          Protected by TechArtha Institutional Access Control & PBKDF2 Encryption
        </p>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#3C3985] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
