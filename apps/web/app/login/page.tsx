'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import OtpVerification from '../../components/OtpVerification';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [identifierType, setIdentifierType] = useState<'MOBILE' | 'EMAIL'>('MOBILE');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpHint, setOtpHint] = useState('');
  const [error, setError] = useState('');

  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('otp');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSendOtp = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => {
    setError('');
    setOtpHint('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mobile: channel === 'EMAIL' ? undefined : phone, 
          email: channel === 'EMAIL' ? email : undefined, 
          channel 
        }),
      });
      const data = await res.json();
      if (res.status === 404) {
        throw new Error('No account found. Please sign up.');
      }
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');

      if (data.devOtp) setOtpHint(`Test OTP: ${data.devOtp}`);
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP. Please try again.');
      throw e;
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
          body: JSON.stringify({ 
            mobile: identifierType === 'EMAIL' ? undefined : phone, 
            email: identifierType === 'EMAIL' ? email : undefined, 
            password 
          }),
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

  const handleVerifyOtp = async (otp: string, otpChannel: 'SMS' | 'WHATSAPP' | 'EMAIL' | null) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mobile: identifierType === 'EMAIL' ? undefined : phone, 
          email: identifierType === 'EMAIL' ? email : undefined, 
          otp, 
          type: 'login' 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid OTP');
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('user_id', data.user?.id ?? '');
      
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isContinueDisabled = identifierType === 'EMAIL' 
    ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) 
    : phone.length !== 10;

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 p-6">
        {!otpSent ? (
          <>
            <h1 className="page-title">{t('login.welcomeBack')}</h1>
            <p className="page-desc">{t('login.journeyDesc')}</p>

            
            <div className="flex gap-4 mb-4 mt-6" id="identifier-selector-wrapper">
              <label className="flex items-center gap-2 text-sm cursor-pointer" htmlFor="radio-mobile">
                <input id="radio-mobile" type="radio" checked={identifierType === 'MOBILE'} onChange={() => { setIdentifierType('MOBILE'); setEmail(''); setPassword(''); }} className="accent-[var(--primary)]" /> {t('signup.mobileNumber') || 'Mobile Number'}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer" htmlFor="radio-email">
                <input id="radio-email" type="radio" checked={identifierType === 'EMAIL'} onChange={() => { setIdentifierType('EMAIL'); setPhone(''); setPassword(''); }} className="accent-blue-500" /> {t('signup.emailAddress') || 'Email'}
              </label>
            </div>


            <label className="label">{identifierType === 'EMAIL' ? (t('login.emailAddress') || 'Email Address') : (t('login.mobileLabel') || 'Mobile number')}</label>
            
            {identifierType === 'MOBILE' ? (
              <div className="flex items-center border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm mb-4">
                <span className="px-4 py-4 text-[var(--dark)] font-bold border-r border-gray-200">+91</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder={t('login.mobilePlaceholder', { defaultValue: '10-digit number' })}
                  className="flex-1 px-4 py-4 text-[var(--dark)] text-base focus:outline-none bg-transparent"
                  maxLength={10}
                />
              </div>
            ) : (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder', { defaultValue: 'name@example.com' })}
                className="input-field mb-4"
              />
            )}

            <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
              <button 
                onClick={() => setLoginMethod('otp')} 
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginMethod === 'otp' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-gray-500 hover:text-[var(--dark)]'}`}
              >
                {t('login.viaOtp')}
              </button>
              <button 
                onClick={() => setLoginMethod('password')} 
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginMethod === 'password' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-gray-500 hover:text-[var(--dark)]'}`}
              >
                {t('login.viaPassword')}
              </button>
            </div>

            {loginMethod === 'password' && (
              <>
                <label className="label">{t('login.passwordLabel')}</label>
                <div className="relative flex items-center mb-4">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t('login.passwordPlaceholder') || 'Enter your password'}
                    className="input-field w-full pr-10 [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3 text-gray-400 hover:text-[var(--primary)] focus:outline-none flex items-center justify-center w-8 h-8 transition-colors"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
              </>
            )}

            {error && !otpSent && <p className="text-red-500 text-sm mt-3">{error}</p>}

            <button
              onClick={handleLogin}
              disabled={loading || isContinueDisabled}
              className="btn-primary mt-6"
            >
              <span>{loading ? (t('login.verifying') || 'Verifying...') : (t('login.continue') || 'Continue securely')}</span>
              <span>➔</span>
            </button>
          </>
        ) : (
          <OtpVerification
            identifierType={identifierType}
            identifierValue={identifierType === 'EMAIL' ? email : phone}
            onSendOtp={handleSendOtp}
            onVerify={handleVerifyOtp}
            onChangeIdentifier={() => setOtpSent(false)}
            loading={loading}
            error={error}
            setError={setError}
            otpHint={otpHint}
          />
        )}

        <p className="text-xs text-gray-400 text-center mt-6"> {t('login.terms') || 'By continuing, you agree to our'} <span className="underline">{t('login.termsLink') || 'Terms'}</span> {t('login.and') || 'and'} <span className="underline">{t('login.privacyLink') || 'Privacy Policy'}</span>.
        </p>

        <p className="text-sm text-center mt-6">
          <span className="text-gray-500"> {t('login.noAccount') || 'Not have an account?'} </span>
          <button onClick={() => router.push('/signup')} className="font-bold text-[var(--primary)] hover:underline">{t('login.signUp') || 'Sign up'}</button>
        </p>
      </div>
    </div>
  );
}
