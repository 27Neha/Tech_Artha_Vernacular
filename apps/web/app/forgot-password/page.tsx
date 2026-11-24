'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type Step = 'email' | 'otp' | 'password' | 'success';

function maskEmail(email: string): string {
  const clean = email.trim().toLowerCase();
  const at = clean.indexOf('@');
  if (at <= 0) return '';
  const local = clean.slice(0, at);
  const domain = clean.slice(at + 1);
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  // Held strictly in component memory, never localStorage or query string
  const [resetAuthorization, setResetAuthorization] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [expiry, setExpiry] = useState(0);

  useEffect(() => {
    if (step !== 'otp') return;
    const t = setInterval(() => {
      setCooldown((p) => (p > 0 ? p - 1 : 0));
      setExpiry((p) => (p > 0 ? p - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [step]);

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    setError('');
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Unable to send verification code.');

      setEmail(normalized);
      setOtp('');
      setResetAuthorization('');
      setExpiry(data.expiresInSeconds ?? 300);
      setCooldown(data.cooldownSeconds ?? 45);
      setStep('otp');
    } catch (err: any) {
      setError(err?.message || 'Could not reach TechArtha. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    const cleanOtp = otp.replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (expiry <= 0) {
      setError('Your code has expired. Request a new one.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/verify-password-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: cleanOtp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.resetAuthorization) {
        throw new Error(data.message || 'Incorrect code. Please try again.');
      }
      setResetAuthorization(data.resetAuthorization);
      setStep('password');
    } catch (err: any) {
      setError(err?.message || 'Incorrect code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      setError(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Your passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetAuthorization, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't update your password. Please try again.");
      setResetAuthorization('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('success');
    } catch (err: any) {
      setError(err?.message || "Couldn't update your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6">
      <div className="max-w-md w-full mx-auto mt-6">
        {step === 'email' && (
          <form onSubmit={sendOtp} className="space-y-4">
            <h1 className="text-2xl font-bold text-[#102A54]">Forgot Password?</h1>
            <p className="text-sm text-gray-500">
              Enter your registered email address. We&apos;ll send you a verification code.
            </p>
            <div>
              <label className="text-sm text-gray-700 font-semibold mb-2 block">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full p-4 border border-gray-200 rounded-xl focus:border-[#3C3985] outline-none"
              />
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-lg text-white bg-[#3C3985] hover:bg-[#322f73] disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send OTP →'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="w-full py-2 text-sm font-bold text-[#3C3985] hover:underline"
            >
              Back to Login
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <h1 className="text-2xl font-bold text-[#102A54]">Verify Your Email</h1>
            <p className="text-sm text-gray-500">
              We&apos;ve sent a verification code to your registered email ({maskEmail(email)}).
            </p>
            <div>
              <label className="text-sm text-gray-700 font-semibold mb-2 block">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full p-4 border border-gray-200 rounded-xl focus:border-[#3C3985] outline-none tracking-[0.5em] text-center text-xl font-bold"
              />
              <p className="text-xs text-gray-500 mt-2">
                {expiry > 0
                  ? `Code valid for ${Math.floor(expiry / 60)}:${String(expiry % 60).padStart(2, '0')}`
                  : 'Your code has expired. Request a new one.'}
              </p>
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-lg text-white bg-[#3C3985] hover:bg-[#322f73] disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify OTP →'}
            </button>
            <div className="flex items-center justify-between text-sm pt-1">
              <button
                type="button"
                onClick={() => {
                  setOtp('');
                  setError('');
                  setStep('email');
                }}
                className="font-bold text-gray-600 hover:underline"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={loading || cooldown > 0}
                onClick={() => sendOtp()}
                className="font-bold text-[#3C3985] hover:underline disabled:text-gray-400"
              >
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={updatePassword} className="space-y-4">
            <h1 className="text-2xl font-bold text-[#102A54]">Create New Password</h1>
            <p className="text-sm text-gray-500">Choose a new password for your account.</p>
            <div>
              <label className="text-sm text-gray-700 font-semibold mb-1 block">New Password</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-4 border border-gray-200 rounded-xl focus:border-[#3C3985] outline-none pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-4 text-xs font-bold text-[#3C3985]"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-700 font-semibold mb-1 block">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-4 border border-gray-200 rounded-xl focus:border-[#3C3985] outline-none"
              />
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-lg text-white bg-[#3C3985] hover:bg-[#322f73] disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Update Password →'}
            </button>
          </form>
        )}

        {step === 'success' && (
          <div className="p-6 bg-green-50 border border-green-200 rounded-xl space-y-4">
            <h1 className="text-xl font-bold text-green-900">Password Updated!</h1>
            <p className="text-sm text-green-800">
              Your password has been changed successfully.
            </p>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="w-full py-3.5 rounded-xl font-bold text-white bg-[#3C3985] hover:bg-[#322f73]"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
