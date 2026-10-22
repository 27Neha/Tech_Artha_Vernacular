'use client';

import React, { useState } from 'react';
import { useAdminAuth } from '@/lib/auth-context';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, Shield, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('support@techartha.com');
  const [password, setPassword] = useState('TechArtha@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#102A54]/5 via-[#F8F9FB] to-[#3C3985]/10">
      <div className="w-full max-w-md">
        {/* Brand Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-6">
            <div className="flex justify-center items-center py-2 mb-3">
              <img
                src="/techartha-logo.png"
                alt="TechArtha - Finance Simplified"
                className="h-12 w-auto max-w-[200px] object-contain drop-shadow-xs"
              />
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-[#3C3985]/10 text-[#3C3985] text-[11px] font-extrabold uppercase tracking-wider">
              Operations & Admin Portal
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Sign in with your authorized staff credentials to manage the platform.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Staff Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@techartha.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:border-[#3C3985] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:border-[#3C3985] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-gray-400 hover:text-gray-700 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#3C3985] hover:bg-[#2A2761] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Session...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Staff Presets */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center mb-2.5">
              Quick Role Switch (Local/Dev)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreset('support@techartha.com', 'TechArtha@2026!')}
                className="p-2.5 text-left rounded-lg bg-gray-50 hover:bg-purple-50 hover:border-purple-200 border border-gray-100 transition-colors"
              >
                <div className="text-xs font-bold text-purple-900">TechArtha Admin</div>
                <div className="text-[11px] text-gray-500 truncate">support@techartha.com</div>
              </button>
              <button
                type="button"
                onClick={() => setPreset('admin@techartha.com', 'TechArtha@2026!')}
                className="p-2.5 text-left rounded-lg bg-gray-50 hover:bg-blue-50 hover:border-blue-200 border border-gray-100 transition-colors"
              >
                <div className="text-xs font-bold text-blue-900">Platform Admin</div>
                <div className="text-[11px] text-gray-500 truncate">admin@techartha.com</div>
              </button>
              <button
                type="button"
                onClick={() => setPreset('ops@techartha.com', 'TechArtha@2026!')}
                className="p-2.5 text-left rounded-lg bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 border border-gray-100 transition-colors"
              >
                <div className="text-xs font-bold text-emerald-900">Operations Lead</div>
                <div className="text-[11px] text-gray-500 truncate">ops@techartha.com</div>
              </button>
              <button
                type="button"
                onClick={() => setPreset('analyst@techartha.com', 'TechArtha@2026!')}
                className="p-2.5 text-left rounded-lg bg-gray-50 hover:bg-amber-50 hover:border-amber-200 border border-gray-100 transition-colors"
              >
                <div className="text-xs font-bold text-amber-900">Compliance Analyst</div>
                <div className="text-[11px] text-gray-500 truncate">analyst@techartha.com</div>
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-gray-400 font-medium text-center">
            <Shield className="w-3.5 h-3.5 text-gray-400" />
            <span>Strict access controls & audit logging enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
