'use client';
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

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
  const [otpChannel, setOtpChannel] = useState<'SMS' | 'WHATSAPP' | null>(null);
  const [password, setPassword] = useState('');

  const [smsTimer, setSmsTimer] = useState(0);
  const [waTimer, setWaTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (smsTimer > 0 || waTimer > 0) {
      interval = setInterval(() => {
        setSmsTimer((s) => (s > 0 ? s - 1 : 0));
        setWaTimer((w) => (w > 0 ? w - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [smsTimer, waTimer]);

  const handleSendOtp = async (channel: 'SMS' | 'WHATSAPP') => {
    setOtpChannel(channel);
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
      if (channel === 'SMS') setSmsTimer(120);
      if (channel === 'WHATSAPP') setWaTimer(120);
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
            <h1 className="page-title">{t('login.welcomeBack')}</h1>
            <p className="page-desc">{t('login.journeyDesc')}</p>

            <label className="label">{t('login.mobileLabel')}</label>
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
                <label className="label">{t('login.passwordLabel')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
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
              <span>{loading ? t('login.verifying') : t('login.continue')}</span>
              <span>→</span>
            </button>
          </>
        ) : (
          <>
            <h1 className="page-title">{t('login.verifyNumber')}</h1>
            <p className="page-desc">Enter the OTP sent to <strong>+91 {phone}</strong></p>

            <label className="label">{t('login.otpLabel')}</label>
            
            <input
              type="number"
              value={otp}
              onChange={(e) => {
                if (!otpChannel) {
                  setError('Please select SMS or WhatsApp first.');
                  return;
                }
                setOtp(e.target.value.slice(0, 6));
                setError('');
              }}
              onFocus={() => {
                if (!otpChannel) {
                  setError('Please select SMS or WhatsApp first.');
                }
              }}
              readOnly={!otpChannel}
              placeholder={t('login.otpPlaceholder')}
              className={`input-field text-center text-2xl font-bold tracking-widest ${!otpChannel ? 'bg-gray-50 opacity-70 cursor-not-allowed' : ''}`}
            />

            <div className="flex gap-4 mt-6">
              <button 
                onClick={() => handleSendOtp('SMS')}
                disabled={loading || smsTimer > 0}
                className={`flex-1 py-3 flex flex-col items-center justify-center rounded-xl border-2 font-bold transition-all ${otpChannel === 'SMS' ? 'border-[var(--primary)] text-[var(--dark)] bg-[var(--primary-light)]' : 'border-gray-100 text-gray-400 bg-white hover:border-gray-200'} ${smsTimer > 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <span className="text-sm">{t('login.sendSms')}</span>
                {smsTimer > 0 && <span className="text-[10px] mt-0.5 opacity-80">{t('login.resendIn', { time: `${Math.floor(smsTimer / 60)}:${(smsTimer % 60).toString().padStart(2, '0')}` })}</span>}
              </button>
              <button 
                onClick={() => handleSendOtp('WHATSAPP')}
                disabled={loading || waTimer > 0}
                className={`flex-1 py-3 flex flex-col items-center justify-center rounded-xl border-2 font-bold transition-all ${otpChannel === 'WHATSAPP' ? 'border-[#25D366] text-[#128C7E] bg-[#dcf8c6]' : 'border-gray-100 text-gray-400 bg-white hover:border-gray-200'} ${waTimer > 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <span className="text-sm">{t('login.sendWa')}</span>
                {waTimer > 0 && <span className="text-[10px] mt-0.5 opacity-80">{t('login.resendIn', { time: `${Math.floor(waTimer / 60)}:${(waTimer % 60).toString().padStart(2, '0')}` })}</span>}
              </button>
            </div>

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="btn-primary mt-6"
            >
              <span>{loading ? t('login.verifying') : t('login.verifyOtp')}</span>
              <span>→</span>
            </button>

            <button onClick={() => setOtpSent(false)} className="w-full text-center text-[var(--primary)] font-semibold mt-4 py-2">
              ← {t('login.changeNumber')}
            </button>
          </>
        )}

        <p className="text-xs text-gray-400 text-center mt-6"> {t('login.terms')} <span className="underline">{t('login.termsLink')}</span> {t('login.and')} <span className="underline">{t('login.privacyLink')}</span>.
        </p>

        <p className="text-sm text-center mt-6">
          <span className="text-gray-500"> {t('login.noAccount')} </span>
          <button onClick={() => router.push('/signup')} className="font-bold text-[var(--primary)] hover:underline">{t('login.signUp')}</button>
        </p>
      </div>
    </div>
  );
}
