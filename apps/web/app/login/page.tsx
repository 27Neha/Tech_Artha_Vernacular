'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import OtpVerification from '../../components/OtpVerification';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [authChannel, setAuthChannel] = useState<'SMS' | 'WHATSAPP' | 'EMAIL'>('SMS');
  const [activeChannel, setActiveChannel] = useState<'SMS'|'WHATSAPP'|'EMAIL' | null>(null);
  const [identifierType, setIdentifierType] = useState<'MOBILE' | 'EMAIL'>('MOBILE');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const [otpSent, setOtpSent] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpHint, setOtpHint] = useState('');

    const [accountNotExistsWarning, setAccountNotExistsWarning] = useState(false);
  
    
  const handleContinue = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'PASSWORD') => {
    setValidationError('');
    setAccountNotExistsWarning(false);
    
    if (channel === 'EMAIL' || (channel === 'PASSWORD' && identifierType === 'EMAIL')) {
      if (!email.trim()) {
        setValidationError(t('validation.emailEmpty', { defaultValue: 'Please enter your email address first.' }));
        emailInputRef.current?.focus();
        return;
      }
      if (!/^[^s@]+@[^s@]+.[^s@]+$/.test(email)) {
        setValidationError(t('validation.emailInvalid', { defaultValue: 'Please enter a valid email address.' }));
        emailInputRef.current?.focus();
        return;
      }
    } else {
      if (!phone.trim()) {
        setValidationError(t('validation.mobileEmpty', { defaultValue: 'Please enter your mobile number first.' }));
        mobileInputRef.current?.focus();
        return;
      }
      if (phone.length !== 10) {
        setValidationError(t('validation.mobileInvalid', { defaultValue: 'Please enter a valid 10-digit mobile number.' }));
        mobileInputRef.current?.focus();
        return;
      }
    }

    setLoading(true);
    setError('');

      try {
        const res = await fetch(`${API_URL}/auth/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(channel === 'EMAIL' || (identifierType === 'EMAIL') ? { email } : { mobile: phone })
        });
        const data = await res.json();
        if (!data.exists) {
          setAccountNotExistsWarning(true);
          setLoading(false);
          return;
        }
        
        if (channel === 'PASSWORD') {
          handleLogin();
        } else {
          setAuthChannel(channel);
          setOtpSent(true);
        }
      } catch (e) {
        setError(t('common.error', { defaultValue: 'Something went wrong. Please try again.' }));
      } finally {
        setLoading(false);
      }
    };
  
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
        setOtpSent(true);
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
                        {step === 1 && !otpSent && (
          <div className="animate-fade-in flex flex-col justify-start max-w-md w-full mx-auto mt-4">
            <h1 className="text-2xl font-bold text-[var(--dark)] mb-6">{t('login.welcomeBack') || 'Welcome back'}</h1>

            <div className="flex justify-end mb-2">
              {identifierType === 'MOBILE' ? (
                 <button onClick={() => { setIdentifierType('EMAIL'); setAuthChannel('EMAIL'); }} className="text-sm font-semibold text-[var(--primary)] hover:underline">
                   {t('signup.useEmailInstead') || 'Use email instead'}
                 </button>
              ) : (
                 <button onClick={() => { setIdentifierType('MOBILE'); setAuthChannel('SMS'); }} className="text-sm font-semibold text-[var(--primary)] hover:underline">
                   {t('signup.useMobileInstead') || 'Use mobile number instead'}
                 </button>
              )}
            </div>

            <div className="mb-6">
              <label className="label text-sm text-gray-700 font-semibold mb-2 block">
                {identifierType === 'EMAIL' ? (t('signup.emailAddress') || 'Email Address') : (t('signup.mobileNumber') || 'Mobile Number')}
              </label>
              
              {identifierType === 'EMAIL' ? (
                <input 
                  type="email"
                      ref={emailInputRef}
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder={t('signup.emailPlaceholder', { defaultValue: 'name@example.com' })} 
                  className="w-full p-4 border border-gray-200 rounded-xl focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-colors" 
                />
              ) : (
                <div className="flex w-full">
                  <div className="flex-shrink-0 flex items-center justify-center px-4 border border-gray-200 border-r-0 rounded-l-xl bg-gray-50 text-gray-600 font-semibold">
                    +91
                  </div>
                  <input 
                    type="tel"
                      ref={mobileInputRef}
                    value={phone} 
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                    placeholder={t('signup.mobilePlaceholder', { defaultValue: 'Enter 10-digit mobile number' })} 
                    className="w-full p-4 border border-gray-200 rounded-r-xl focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-colors" 
                    maxLength={10}
                    inputMode="numeric"
                  />
              {validationError && <p className="text-red-500 text-xs mt-2 font-medium">{validationError}</p>}
              </div>
              )}
            </div>

            <label className="label text-sm text-gray-700 font-semibold mb-3 block">
              {t('login.loginVia', { defaultValue: 'Login via' })}
            </label>
            <div className="flex bg-gray-50 p-1 rounded-xl mb-6 border border-gray-200">
              <button 
                onClick={() => setLoginMethod('otp')} 
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${loginMethod === 'otp' ? 'bg-white shadow-sm text-[var(--primary)] border border-gray-200' : 'text-gray-500 hover:text-[var(--dark)]'}`}
              >
                {t('login.viaOtp') || 'OTP'}
              </button>
              <button 
                onClick={() => setLoginMethod('password')} 
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${loginMethod === 'password' ? 'bg-white shadow-sm text-[var(--primary)] border border-gray-200' : 'text-gray-500 hover:text-[var(--dark)]'}`}
              >
                {t('login.viaPassword') || 'Password'}
              </button>
            </div>

            {loginMethod === 'password' ? (
              <div className="animate-fade-in">

                  {accountNotExistsWarning && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center justify-center text-center">
                      <p className="text-sm text-red-600 mb-2 font-medium">
                        {identifierType === 'EMAIL' ? (t('login.emailNotExists', { defaultValue: 'This account is not registered. Please sign up first.' })) : (t('login.mobileNotExists', { defaultValue: 'This account is not registered. Please sign up first.' }))}
                      </p>
                      <button onClick={() => router.push('/signup')} className="text-sm font-bold text-red-700 hover:underline">
                        {t('login.goToSignup', { defaultValue: 'Go to Sign Up' })} →
                      </button>
                    </div>
                  )}
                                                  <div className="mb-8">
                  <label className="label text-sm text-gray-700 font-semibold mb-2 block">{t('login.password') || 'Password'}</label>
                  <div className="relative flex items-center">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="w-full p-4 border border-gray-200 rounded-xl focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-colors pr-12 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden" 
                      placeholder={t('login.passwordPlaceholder') || 'Enter your password'} 
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
                </div>
                
                <button 
                  onClick={() => handleContinue('PASSWORD')}
                  disabled={loading || !password} 
                  className="btn-primary w-full py-4 rounded-xl font-bold text-lg shadow-sm"
                >
                  {t('login.login') || 'Login'} →
                </button>
              </div>
            ) : (
              <div className="animate-fade-in">

                  {accountNotExistsWarning && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center justify-center text-center">
                      <p className="text-sm text-red-600 mb-2 font-medium">
                        {identifierType === 'EMAIL' ? (t('login.emailNotExists', { defaultValue: 'This account is not registered. Please sign up first.' })) : (t('login.mobileNotExists', { defaultValue: 'This account is not registered. Please sign up first.' }))}
                      </p>
                      <button onClick={() => router.push('/signup')} className="text-sm font-bold text-red-700 hover:underline">
                        {t('login.goToSignup', { defaultValue: 'Go to Sign Up' })} →
                      </button>
                    </div>
                  )}
                                    {identifierType === 'EMAIL' ? (
                  <button 
                    onClick={() => handleContinue('EMAIL')}
                    disabled={loading} 
                    className="btn-primary w-full py-4 rounded-xl font-bold text-lg mb-6 shadow-sm"
                  >
                    {t('signup.continueWithEmail') || 'Continue with Email'} →
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => handleContinue('SMS')}
                      disabled={loading} 
                      className="btn-primary w-full py-4 rounded-xl font-bold text-lg mb-6 shadow-sm"
                    >
                      {t('signup.continueWithSms') || 'Continue with SMS'} →
                    </button>
                    
                    <div className="relative flex items-center justify-center mb-6">
                      <div className="border-t border-gray-200 w-full absolute"></div>
                      <span className="bg-white px-4 text-gray-400 text-sm relative">{t('signup.or') || 'or'}</span>
                    </div>

                    <button 
                      onClick={() => handleContinue('WHATSAPP')} 
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <span className="text-xl">💬</span>
                      {t('login.useWaInstead') || 'Continue with WhatsApp'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {otpSent && (
          <div className="animate-fade-in flex flex-col justify-start">
            <OtpVerification
              identifierType={authChannel === 'EMAIL' ? 'EMAIL' : 'MOBILE'}
              initialChannel={authChannel}
              identifierValue={authChannel === 'EMAIL' ? email : phone}
              onSendOtp={handleSendOtp}
              onVerify={handleVerifyOtp}
              onChangeIdentifier={() => { setOtpSent(false); setStep(1); }}
              loading={loading}
              error={error}
              setError={setError}
              otpHint={otpHint}
            />
          </div>
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
