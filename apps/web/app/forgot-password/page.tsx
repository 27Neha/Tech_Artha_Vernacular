'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(30);

  useEffect(() => {
    let timer: any;
    if (step === 2 && resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, resendCooldown]);

  const maskEmail = (val: string) => {
    if (!val || !val.includes('@')) return val;
    const [name, domain] = val.split('@');
    if (name.length <= 2) return `${name[0]}*@${domain}`;
    return `${name[0]}${'*'.repeat(Math.max(name.length - 2, 3))}${name[name.length - 1]}@${domain}`;
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to send verification code.');
      setStep(2);
      setResendCooldown(30);
    } catch (err: any) {
      setError(err.message || 'Unable to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: cleanOtp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Incorrect verification code.');
      setResetToken(data.resetToken);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('Password must contain at least one uppercase letter (A-Z).');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setError('Password must contain at least one lowercase letter (a-z).');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setError('Password must contain at least one number (0-9).');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setError('Password must contain at least one special character (such as @, #, $, %, &, !).');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update password.');
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Unable to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        {/* Step 1: Request OTP */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-[#EBEBFA] text-[#3C3985] rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
                🔑
              </div>
              <h1 className="text-2xl font-black text-[#102A54]">Forgot Password?</h1>
              <p className="text-sm text-gray-500 mt-2">
                Enter your registered email address. We'll send you an OTP to verify your identity.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Registered Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full p-4 border border-gray-200 rounded-xl focus:border-[#3C3985] focus:ring-1 focus:ring-[#3C3985] outline-none text-sm font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-4 bg-[#3C3985] hover:bg-[#2d2a6a] text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send OTP →'}
            </button>

            <div className="text-center">
              <Link href="/login" className="text-sm font-bold text-[#3C3985] hover:underline">
                ← Back to Login
              </Link>
            </div>
          </form>
        )}

        {/* Step 2: Verify OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-[#EBEBFA] text-[#3C3985] rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
                ✉️
              </div>
              <h1 className="text-2xl font-black text-[#102A54]">Verify Email</h1>
              <p className="text-sm text-gray-500 mt-2">
                We sent a 6-digit code to <span className="font-bold text-gray-700">{maskEmail(email)}</span>
              </p>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-[#3C3985] font-bold underline mt-1"
              >
                Change email
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 text-center">
                Enter 6-Digit OTP
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full p-4 border border-gray-200 rounded-xl focus:border-[#3C3985] focus:ring-1 focus:ring-[#3C3985] outline-none text-2xl font-mono text-center tracking-widest font-black text-[#102A54]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="w-full py-4 bg-[#3C3985] hover:bg-[#2d2a6a] text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Proceed →'}
            </button>

            <div className="text-center text-xs text-gray-500">
              {resendCooldown > 0 ? (
                <span>Resend code in 0:{resendCooldown < 10 ? `0${resendCooldown}` : resendCooldown}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  className="font-bold text-[#3C3985] hover:underline"
                >
                  Resend OTP
                </button>
              )}
            </div>
          </form>
        )}

        {/* Step 3: Create New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-[#EBEBFA] text-[#3C3985] rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
                🔒
              </div>
              <h1 className="text-2xl font-black text-[#102A54]">Create New Password</h1>
              <p className="text-sm text-gray-500 mt-2">
                Choose a strong password to protect your TechArtha portfolio.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full p-4 border border-gray-200 rounded-xl focus:border-[#3C3985] focus:ring-1 focus:ring-[#3C3985] outline-none text-sm font-medium pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-4 text-xs font-bold text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Password Requirements Guidance - Directly below New Password field */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
                <div className="font-bold text-gray-700 uppercase tracking-wider text-[11px] mb-1">Password Requirements</div>
                <div className={`flex items-center gap-2 ${newPassword.length >= 8 ? 'text-green-600 font-bold' : 'text-gray-500'}`}>
                  <span>{newPassword.length >= 8 ? '✓' : '○'}</span>
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center gap-2 ${/[A-Z]/.test(newPassword) ? 'text-green-600 font-bold' : 'text-gray-500'}`}>
                  <span>{/[A-Z]/.test(newPassword) ? '✓' : '○'}</span>
                  <span>At least one uppercase letter (A-Z)</span>
                </div>
                <div className={`flex items-center gap-2 ${/[a-z]/.test(newPassword) ? 'text-green-600 font-bold' : 'text-gray-500'}`}>
                  <span>{/[a-z]/.test(newPassword) ? '✓' : '○'}</span>
                  <span>At least one lowercase letter (a-z)</span>
                </div>
                <div className={`flex items-center gap-2 ${/[0-9]/.test(newPassword) ? 'text-green-600 font-bold' : 'text-gray-500'}`}>
                  <span>{/[0-9]/.test(newPassword) ? '✓' : '○'}</span>
                  <span>At least one number (0-9)</span>
                </div>
                <div className={`flex items-center gap-2 ${/[^A-Za-z0-9]/.test(newPassword) ? 'text-green-600 font-bold' : 'text-gray-500'}`}>
                  <span>{/[^A-Za-z0-9]/.test(newPassword) ? '✓' : '○'}</span>
                  <span>At least one special character (@, #, $, %, &, !, etc.)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full p-4 border border-gray-200 rounded-xl focus:border-[#3C3985] focus:ring-1 focus:ring-[#3C3985] outline-none text-sm font-medium"
                />
                {confirmPassword && (
                  <div className={`flex items-center gap-2 text-xs mt-2 ${newPassword && newPassword === confirmPassword ? 'text-green-600 font-bold' : 'text-red-500 font-medium'}`}>
                    <span>{newPassword && newPassword === confirmPassword ? '✓' : '✕'}</span>
                    <span>{newPassword && newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword) || newPassword !== confirmPassword}
              className="w-full py-4 bg-[#3C3985] hover:bg-[#2d2a6a] text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Update Password ✓'}
            </button>
          </form>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl font-black">
              ✓
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#102A54]">Password Reset Successful</h1>
              <p className="text-sm text-gray-500 mt-2">
                Your password has been successfully reset. All active sessions have been safely secured.
              </p>
            </div>

            <button
              onClick={() => router.push('/login')}
              className="w-full py-4 bg-[#3C3985] hover:bg-[#2d2a6a] text-white font-bold rounded-xl shadow-md transition-colors"
            >
              Back to Login →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
