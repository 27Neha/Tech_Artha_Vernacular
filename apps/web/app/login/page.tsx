'use client';
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '../TranslationProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpHint, setOtpHint] = useState('');
  const [error, setError] = useState('');

  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('otp');
  const [otpChannel, setOtpChannel] = useState<'SMS' | 'WHATSAPP'>('SMS');
  const [password, setPassword] = useState('');

  const handleSendOtp = async (channel: 'SMS' | 'WHATSAPP' = 'WHATSAPP') => {
    setError('');
    setOtpHint('');
    if (!/^\d{10}$/.test(phone)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: phone, channel }),
      });
      const data = await res.json();
      if (res.status === 404) {
        throw new Error('Account not found. Please Sign Up first.');
      }
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
      
      setOtpSent(true);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    if (loginMethod === 'password') {
      if (!password) { setError('Enter password.'); return; }
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/auth/login-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: phone, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Invalid credentials');
        localStorage.setItem('access_token', data.accessToken || data.access_token);
        localStorage.setItem('user_id', data.user?.id ?? '');
        router.push('/dashboard');
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    } else {
      setOtpSent(true);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    if (otp.length < 4) {
      setError('Please enter a valid OTP.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: phone, otp, type: 'login' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid OTP');
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('user_id', data.user?.id ?? '');
      
      // Navigate based on backend status
      // If the user uses the Login flow, we assume they are an existing user.
      // Route them straight to the dashboard to prevent forcing them through onboarding.
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 p-6">
        {!otpSent ? (
          <>
            <h1 className="page-title">{'Welcome Back'}</h1>
            <p className="page-desc">{'Login to continue your investment journey'}</p>

            <label className="label">Mobile number</label>
            <div className="flex items-center border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm mb-4">
              <span className="px-4 py-4 text-[var(--dark)] font-bold border-r border-gray-200">+91</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number"
                className="flex-1 px-4 py-4 text-[var(--dark)] text-base focus:outline-none bg-transparent"
                maxLength={10}
              />
            </div>

            <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
              <button 
                onClick={() => setLoginMethod('otp')} 
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginMethod === 'otp' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-gray-500 hover:text-[var(--dark)]'}`}
              >
                Login via OTP
              </button>
              <button 
                onClick={() => setLoginMethod('password')} 
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginMethod === 'password' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-gray-500 hover:text-[var(--dark)]'}`}
              >
                Login via Password
              </button>
            </div>

            {loginMethod === 'password' && (
              <>
                <label className="label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field mb-4"
                />
              </>
            )}

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

            
            
            
            <button
              onClick={handleLogin}
              disabled={loading}
              className="btn-primary mt-6"
            >
              <span>{loading ? 'Verifying...' : 'Continue securely'}</span>
              <span>→</span>
            </button>
          </>
        ) : (
          <>
            <h1 className="page-title">Verify your number</h1>
            <p className="page-desc">Enter the OTP sent to <strong>+91 {phone}</strong></p>

            <label className="label">One-Time Password (OTP)</label>
            
            

            <input
              type="number"
              value={otp}
              onChange={(e) => setOtp(e.target.value.slice(0, 6))}
              placeholder="Enter OTP"
              className="input-field text-center text-2xl font-bold tracking-widest"
            />

            <div className="flex gap-4 mt-6">
              <button 
                onClick={() => handleSendOtp('SMS')}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border-2 font-bold transition-all text-sm border-gray-100 text-gray-400 bg-white hover:border-gray-200"
              >
                Send via SMS
              </button>
              <button 
                onClick={() => handleSendOtp('WHATSAPP')}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border-2 font-bold transition-all text-sm border-[#25D366] bg-[#dcf8c6] text-[#128C7E]"
              >
                Send via WhatsApp
              </button>
            </div>

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="btn-primary mt-6"
            >
              <span>{loading ? 'Verifying...' : 'Verify OTP'}</span>
              <span>→</span>
            </button>

            <button onClick={() => setOtpSent(false)} className="w-full text-center text-[var(--primary)] font-semibold mt-4 py-2">
              ← {'Change Number'}
            </button>
          </>
        )}

        <p className="text-xs text-gray-400 text-center mt-6">
          By continuing, you agree to our <span className="underline">Terms</span> and <span className="underline">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
