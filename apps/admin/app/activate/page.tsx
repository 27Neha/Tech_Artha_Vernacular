'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import {
  ShieldCheck,
  Lock,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

function ActivateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing or invalid invitation activation token. Please request a new invite link.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await adminApi.activateAccount({
        token,
        password,
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      if (res.token) {
        localStorage.setItem('admin_access_token', res.token);
        localStorage.setItem('admin_user', JSON.stringify(res.user));
        document.cookie = `admin_token=${res.token}; path=/; max-age=86400; SameSite=Lax`;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to activate account. The invitation may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#102A54] via-[#1E1B4B] to-[#3C3985] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white/20 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#3C3985]/10 text-[#3C3985] flex items-center justify-center mx-auto mb-2">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-[#102A54] tracking-tight">Activate Staff Account</h1>
          <p className="text-xs text-gray-500">
            Welcome to the TechArtha Administrative Platform. Set up your credentials to begin.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Account Activated Successfully!</h2>
            <p className="text-xs text-gray-500">Redirecting to operations dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Your Full Name (Optional update)</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kulkarni"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Phone Number (Optional)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Set Password (min. 8 characters)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#3C3985] focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full py-3 bg-[#3C3985] hover:bg-[#2F2C6F] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Activate & Enter Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#102A54] flex items-center justify-center text-white text-xs">Loading invitation...</div>}>
      <ActivateForm />
    </Suspense>
  );
}
