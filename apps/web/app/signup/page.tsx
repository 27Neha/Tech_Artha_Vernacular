'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import OtpVerification from '../../components/OtpVerification';


const safeFetchJson = async (res: Response) => {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch (e) {
    return { message: 'Internal Server Error. Please try again later.' };
  }
};

export default function SignupPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [authChannel, setAuthChannel] = useState<'SMS' | 'WHATSAPP' | 'EMAIL'>('SMS');
  
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [clientType, setClientType] = useState('retail');
  const [referralCode, setReferralCode] = useState('');
  
  const [panNumber, setPanNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [panVerified, setPanVerified] = useState<'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED'>('PENDING');
  const [faceVerified, setFaceVerified] = useState<'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED'>('PENDING');
  
  
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountExistsWarning, setAccountExistsWarning] = useState(false);

  
  const handleContinue = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => {
    setValidationError('');
    setAccountExistsWarning(false);
    
    if (channel === 'EMAIL') {
      if (!email.trim()) {
        setValidationError(t('validation.emailEmpty', { defaultValue: 'Please enter your email address first.' }));
        emailInputRef.current?.focus();
        return;
      }
      if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
        setValidationError(t('validation.emailInvalid', { defaultValue: 'Please enter a valid email address.' }));
        emailInputRef.current?.focus();
        return;
      }
    } else {
      if (!mobile.trim()) {
        setValidationError(t('validation.mobileEmpty', { defaultValue: 'Please enter your mobile number first.' }));
        mobileInputRef.current?.focus();
        return;
      }
      if (mobile.length !== 10) {
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
        body: JSON.stringify(channel === 'EMAIL' ? { email } : { mobile })
      });
      const data = await safeFetchJson(res);
      if (data.exists) {
        setAccountExistsWarning(true);
        setLoading(false);
        return;
      }
      setAuthChannel(channel);
      await handleSendSignupOtp(channel);
    } catch (e) {
      setError(t('common.error', { defaultValue: 'Something went wrong. Please try again.' }));
    } finally {
      setLoading(false);
    }
  };

  const [error, setError] = useState('');
  const [transactionId, setTransactionId] = useState('');
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

  const getStatusIcon = (isValid: boolean | null) => {
    if (isValid === null) return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 flex-shrink-0"><circle cx="12" cy="12" r="5" fill="currentColor"></circle></svg>;
    return isValid ? 
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 flex-shrink-0"><polyline points="20 6 9 17 4 12"></polyline></svg> : 
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 flex-shrink-0"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
  };

  const isPasswordStrong = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);

  const [otp, setOtp] = useState('');
  const [smsTimer, setSmsTimer] = useState(0);
  const [waTimer, setWaTimer] = useState(0);
  const [emailTimer, setEmailTimer] = useState(0);
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [activeChannel, setActiveChannel] = useState<'SMS'|'WHATSAPP'|'EMAIL' | null>(null);
      const [showPasswordInfo, setShowPasswordInfo] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const passwordInfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (passwordInfoRef.current && !passwordInfoRef.current.contains(event.target as Node)) {
        setShowPasswordInfo(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
  
  return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

    const handleNext = () => {
    setStep(s => s + 1);
  };

  
  const handleSavePassword = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authChannel === 'EMAIL' ? { email, password, clientType, referralCode } : { mobile, password, clientType, referralCode })
        });
      const data = await safeFetchJson(res);
      if (res.ok) {
          localStorage.setItem('access_token', data.accessToken);
          localStorage.setItem('user_id', data.user.id);
          setStep(2);
        } else {
        setError(data.message || t('signup.failedToSavePassword') || 'Failed to save password');
      }
    } catch (e) {
      setError(t('signup.anErrorOccurred') || 'An error occurred');
    }
    setLoading(false);
  };

  const handleContinueToOtp = () => {
    if (password !== confirmPassword) {
      setError(t('signup.passwordMismatch') || 'Passwords do not match');
      return;
    }
    setError('');
    
    setActiveChannel(authChannel);
    setStep(1.5);
  };

  useEffect(() => {
    let sInt: any, wInt: any, eInt: any;
    if (smsTimer > 0) sInt = setInterval(() => setSmsTimer(p => p - 1), 1000);
    if (waTimer > 0) wInt = setInterval(() => setWaTimer(p => p - 1), 1000);
    if (emailTimer > 0) eInt = setInterval(() => setEmailTimer(p => p - 1), 1000);
    return () => { clearInterval(sInt); clearInterval(wInt); clearInterval(eInt); };
  }, [smsTimer, waTimer, emailTimer]);

  const handleSendSignupOtp = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => {
    setActiveChannel(channel);
    
    

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/signup/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(channel === 'EMAIL' ? { email, channel } : { mobile, channel })
      });
      const data = await safeFetchJson(res);
      if (res.status === 409) {
        throw new Error(channel === 'EMAIL' ? (t('signup.emailExists', { defaultValue: 'This email is already registered. Please log in instead.' })) : (t('signup.mobileExists', { defaultValue: 'This mobile number is already registered. Please log in instead.' })));
      }
      if (!res.ok) throw new Error(data.message || t('login.failedToSendOtp', { defaultValue: 'Failed to send OTP' }));
              
      if (channel === 'SMS') setSmsTimer(120);
      if (channel === 'WHATSAPP') setWaTimer(120);
      if (channel === 'EMAIL') setEmailTimer(120);
      setStep(1.5);
        setStep(1.5);
        setStep(1.5);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDevGenerateOtp = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/auth/dev/generate-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile })
      });
      alert('Test OTP generated. Check the backend terminal.');
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (overrideOtp?: string, overrideChannel?: string | null) => {
    const currentOtp = overrideOtp || otp;
    if (overrideChannel) setActiveChannel(overrideChannel as any);
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authChannel === 'EMAIL' ? { email, otp: currentOtp, type: 'signup' } : { mobile, otp: currentOtp, type: 'signup' })
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || t('login.invalidOtp', { defaultValue: 'Invalid OTP' }));
      
      // Temporarily wait for password before setting session
      
      // Move to password creation (step 1.6)
        setStep(1.6);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  
  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    try {
      if (!fullName || !dob || !panNumber) {
        throw new Error('Full Name, Date of Birth, and PAN are required.');
      }
      if (panNumber.length !== 10) {
        throw new Error('PAN must be exactly 10 characters.');
      }

      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fullName, dateOfBirth: dob, pan: panNumber })
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || 'Failed to save profile');
      
      if (data.investorType === 'MINOR') {
        router.push('/onboarding/minor/welcome');
      } else {
        setStep(3);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };


  const handleSignup = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password, clientType, referralCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      
      // Temporarily wait for password before setting session
      router.push('/kyc');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };


  // Poll backend for KYC status
  const pollKycStatus = async (txnId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/v1/kyc/status?transactionId=${txnId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.status === 'VERIFIED') {
        setPanVerified('SUCCESS');
        setFaceVerified('SUCCESS');
      } else if (data.status === 'FAILED') {
        setPanVerified('FAILED');
        setFaceVerified('FAILED');
      } else if (data.status === 'MANUAL_REVIEW') {
        alert(t('signup.manualReview') || 'KYC is under manual review.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  
  const startKycWorkflow = async () => {
    setLoading(true);
    setError('');
    setPanVerified('IN_PROGRESS');
    try {
      if (!fullName || !dob || !panNumber) {
         setStep(2); // kick them back to step 2
         return;
      }

      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/v1/kyc/start`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fullName, pan: panNumber, dob })
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || 'Failed to initialize KYC');
      
      setTransactionId(data.transactionId);

      if (data.status === 'VERIFIED') { setPanVerified('SUCCESS'); } else { setPanVerified('FAILED'); }
    } catch (e: any) {
      setError(e.message);
      setPanVerified('FAILED');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 bg-white">
      <p className="text-gray-500 mb-8">{t('signup.step', { step })}</p>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-4 border border-red-100 flex flex-col gap-2">
          <span>{error}</span>
          {error.includes('already exists') && (
            <button onClick={() => router.push('/login')} className="text-sm font-bold text-[var(--primary)] underline self-start">
              {t('signup.goToLogin') || 'Go to Log In'}
            </button>
          )}
        </div>
      )}

      
            {step === 1 && (
        <div className="flex-1 animate-fade-in flex flex-col justify-start max-w-md w-full mx-auto mt-4">
            <h1 className="text-2xl font-bold text-[var(--dark)] mb-6">{t('signup.createAccount') || 'Create your TechArtha account'}</h1>

            

            
            {authChannel === 'EMAIL' ? (
              <div className="flex flex-col w-full">
                <div className="mb-6">
                  <label className="label text-sm text-gray-700 font-semibold mb-2 block">{t('signup.emailAddress') || 'Email Address'}</label>
                  <input 
                    type="email"
                      ref={emailInputRef}
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder={t('signup.emailPlaceholder') || 'name@example.com'} 
                    className="w-full p-4 border border-gray-200 rounded-xl focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-colors" 
                  />
                  {validationError && <p className="text-red-500 text-xs mt-2 font-medium">{validationError}</p>}
                  </div>

                  {accountExistsWarning && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center justify-center text-center">
                      <p className="text-sm text-red-600 mb-2 font-medium">
                        {String(authChannel) === 'EMAIL' ? (t('signup.emailExists') || 'This email is already registered. Please log in instead.') : (t('signup.mobileExists') || 'This mobile number is already registered. Please log in instead.')}
                      </p>
                      <button onClick={() => router.push('/login')} className="text-sm font-bold text-red-700 hover:underline">
                        {t('signup.goToLogin') || 'Go to Login'} →
                      </button>
                    </div>
                  )}
                  <button 
                    onClick={() => handleContinue('EMAIL')}
                  disabled={loading} 
                  className="btn-primary w-full py-4 rounded-xl font-bold text-lg mb-6 shadow-sm"
                >
                  {t('signup.continueWithEmail') || 'Continue with Email'} →
                </button>
                
                
              </div>
            ) : (
              <div className="flex flex-col w-full">
                <div className="mb-6">
                  <label className="label text-sm text-gray-700 font-semibold mb-2 block">{t('signup.mobileNumber') || 'Mobile Number'}</label>
                  <div className="flex w-full">
                    <div className="flex-shrink-0 flex items-center justify-center px-4 border border-gray-200 border-r-0 rounded-l-xl bg-gray-50 text-gray-600 font-semibold">
                      +91
                    </div>
                    <input 
                      type="tel"
                      ref={mobileInputRef}
                      value={mobile} 
                      onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                      placeholder={t('signup.mobilePlaceholder') || 'Enter 10-digit mobile number'} 
                      className="w-full p-4 border border-gray-200 rounded-r-xl focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-colors" 
                      maxLength={10}
                      inputMode="numeric"
                    />
                  </div>
                  {validationError && <p className="text-red-500 text-xs mt-2 font-medium">{validationError}</p>}
                  </div>

                  {accountExistsWarning && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center justify-center text-center">
                      <p className="text-sm text-red-600 mb-2 font-medium">
                        {String(authChannel) === 'EMAIL' ? (t('signup.emailExists') || 'This email is already registered. Please log in instead.') : (t('signup.mobileExists') || 'This mobile number is already registered. Please log in instead.')}
                      </p>
                      <button onClick={() => router.push('/login')} className="text-sm font-bold text-red-700 hover:underline">
                        {t('signup.goToLogin') || 'Go to Login'} →
                      </button>
                    </div>
                  )}
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
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors mb-2 shadow-sm"
                >
                  <span className="text-xl">💬</span>
                  {t('signup.continueWithWa') || 'Continue with WhatsApp'}
                </button>
                
                <p className="text-xs text-center text-gray-500 mb-8">
                  {t('signup.preferWa') || 'Prefer WhatsApp? Get your OTP there instead.'}
                  </p>
                  <div className="flex justify-center mt-2 mb-6">
                    <button onClick={() => setAuthChannel('EMAIL')} className="text-sm font-semibold text-[var(--primary)] hover:underline">
                      {t('signup.useEmailInstead') || 'Use email instead'}
                    </button>
                  </div>
                </div>
              )}
        </div>
      )}

      {step === 1.5 && (
        <div className="flex-1 flex flex-col justify-start animate-fade-in">
          <OtpVerification
            identifierType={authChannel === 'EMAIL' ? 'EMAIL' : 'MOBILE'}
            initialChannel={authChannel}
            identifierValue={authChannel === 'EMAIL' ? email : mobile}
            onSendOtp={handleSendSignupOtp}
            onVerify={handleVerifyOtp}
            onChangeIdentifier={() => setStep(1)}
            loading={loading}
            error={error}
            setError={setError}
                      />
        </div>
      )}

      {step === 1.6 && (
        <div className="flex-1 flex flex-col justify-start animate-fade-in">
            <h2 className="text-xl font-bold mb-4">{t('signup.passwordLabel') || 'Create Password'}</h2>
            
            <label className="label flex items-center gap-2 relative mt-4">
              {t('signup.passwordLabel') || 'Create Password'}
              <div className="relative inline-block" ref={passwordInfoRef}>
                <button type="button" onClick={() => setShowPasswordInfo(!showPasswordInfo)} className="text-gray-400 hover:text-[var(--primary)] focus:outline-none flex items-center justify-center rounded-full bg-gray-100 w-5 h-5 transition-colors">
                  <span className="text-xs font-bold">i</span>
                </button>
                {showPasswordInfo && (
                  <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 text-xs text-gray-600">
                    <p className="font-bold text-[var(--dark)] mb-2">{t('signup.reqTitle') || 'Password Requirements:'}</p>
                    <div className="flex flex-col gap-2">
                        <span className="flex items-center gap-2">{getStatusIcon(password.length === 0 ? null : password.length >= 8)} <span className="text-gray-700">{t('signup.reqLength') || 'At least 8 characters'}</span></span>
                        <span className="flex items-center gap-2">{getStatusIcon(password.length === 0 ? null : /[A-Z]/.test(password))} <span className="text-gray-700">{t('signup.reqUpper') || 'One uppercase letter'}</span></span>
                        <span className="flex items-center gap-2">{getStatusIcon(password.length === 0 ? null : /[a-z]/.test(password))} <span className="text-gray-700">{t('signup.reqLower') || 'One lowercase letter'}</span></span>
                        <span className="flex items-center gap-2">{getStatusIcon(password.length === 0 ? null : /[0-9]/.test(password))} <span className="text-gray-700">{t('signup.reqNumber') || 'One number'}</span></span>
                        <span className="flex items-center gap-2">{getStatusIcon(password.length === 0 ? null : /[^A-Za-z0-9]/.test(password))} <span className="text-gray-700">{t('signup.reqSpecial') || 'One special character'}</span></span>
                      </div>
                  </div>
                )}
              </div>
            </label>
            <div className="relative flex items-center">
              <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onBlur={() => setPasswordTouched(true)} placeholder={t('signup.passwordPlaceholder') || "Secure password"} className="input-field w-full pr-10 [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:hidden" />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 text-gray-400 hover:text-[var(--primary)] focus:outline-none flex items-center justify-center w-8 h-8 transition-colors"
                title={showPassword ? (t('signup.hidePassword') || "Hide password") : (t('signup.showPassword') || "Show password")}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
            
            <label className="label mt-4">{t('signup.confirmPassword') || 'Confirm Password'}</label>
            <div className="relative flex items-center">
              <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t('signup.confirmYourPassword') || 'Confirm your password'} className="input-field w-full pr-10 [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:hidden" />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                className="absolute right-3 text-gray-400 hover:text-[var(--primary)] focus:outline-none flex items-center justify-center w-8 h-8 transition-colors"
                title={showConfirmPassword ? (t('signup.hidePassword') || "Hide password") : (t('signup.showPassword') || "Show password")}
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
            
            <button onClick={handleSavePassword}
              disabled={!isPasswordStrong || password !== confirmPassword || loading} className="btn-primary mt-8">
                <span>{t('signup.continue') || 'Continue'}</span><span>→</span>
            </button>
            
            {!isPasswordStrong && passwordTouched && (
              <p className="text-red-500 text-xs font-semibold text-center mt-3 animate-fade-in">
                {t('signup.passwordWarning') || 'Please check the password requirements using the ⓘ icon above.'}
              </p>
            )}
        </div>
      )}


      {step === 2 && (
        <div className="flex-1 flex flex-col mt-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-[var(--dark)] mb-2">{t('signup.tellUsAboutYourself') || 'Tell us about yourself'}</h2>
          <p className="text-sm text-gray-500 mb-8">{t('signup.needFewDetails') || 'We need a few details before verifying your identity.'}</p>

          <label className="label">{t('signup.fullNamePan') || 'Full Name (As per PAN)'}</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('signup.namePlaceholder', { defaultValue: 'e.g. Neha Mahajan' })} className="input-field mb-4" />
          
          <label className="label">{t('signup.dob') || 'Date of Birth'}</label>
          <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="input-field mb-4" />
          
          <label className="label">{t('signup.panNumber') || 'PAN Number'}</label>
          <input type="text" value={panNumber} onChange={e => setPanNumber(e.target.value.toUpperCase())} placeholder={t('signup.panPlaceholder', { defaultValue: 'ABCDE1234F' })} maxLength={10} className="input-field uppercase mb-8" />
          
          <button onClick={handleSaveProfile} disabled={loading || !fullName || !dob || panNumber.length !== 10} className="btn-primary mt-auto">
              <span>{loading ? 'Saving...' : (t('profile.continue') || 'Save & Continue')}</span><span>→</span>
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-6">
            <p className="text-sm text-amber-800 font-semibold mb-1">{t('signup.identityVerification') || 'Identity Verification'}</p>
            <p className="text-xs text-amber-700">{t('signup.panKycDesc') || 'Your PAN and KYC details are securely verified through Cybrilla.'}</p>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="border border-gray-100 rounded-xl p-5 bg-gray-50 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[var(--dark)]">{t('signup.panAndKyc')}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {panVerified === 'PENDING' && t('signup.kycRequired') || 'Verification required'}
                    {panVerified === 'IN_PROGRESS' && t('signup.kycInProgress') || 'Verification in progress'}
                    {panVerified === 'SUCCESS' && t('signup.kycSuccess') || 'Verified successfully'}
                    {panVerified === 'FAILED' && t('signup.kycFailed') || 'Verification failed'}
                  </p>
                </div>
                <div>
                  {panVerified === 'PENDING' && (
                    <button onClick={startKycWorkflow} disabled={loading} className="px-4 py-2 bg-[var(--primary)] text-white font-bold rounded-lg text-sm">
                      {loading ? t('signup.starting') || 'Starting...' : t('signup.verifyNow') || 'Verify Now'}
                    </button>
                  )}
                  {panVerified === 'IN_PROGRESS' && <span className="text-gray-500 font-bold text-sm">{t('signup.verifyingStatus')}</span>}
                  {panVerified === 'SUCCESS' && <span className="text-green-500 font-bold">{t('signup.verifiedStatus')}</span>}
                  {panVerified === 'FAILED' && <span className="text-red-500 font-bold">{t('signup.failedStatus')}</span>}
                </div>
              </div>
              
              {panVerified === 'FAILED' && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 mt-2">
                   <p className="text-xs text-red-600 mb-3">{error || t('signup.panInvalid')}</p>
                   <button onClick={() => setStep(2)} className="w-full py-2 bg-white border border-red-200 text-red-600 font-bold rounded-md text-xs hover:bg-red-50 transition-colors">
                     {t('signup.reviewDetails') || 'Review Details'}
                   </button>
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={() => router.push('/dashboard')} 
            disabled={panVerified !== 'SUCCESS'} 
            className={`w-full py-3.5 rounded-xl font-extrabold text-white mt-auto mb-4 transition-all ${
              panVerified === 'SUCCESS' 
                ? 'bg-[var(--primary)]' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {panVerified === 'SUCCESS' ? t('signup.completeOnboarding') || 'Complete Onboarding' : t('signup.kycPending') || 'KYC Pending'}
          </button>
        </div>
      )}
    </div>
  );
}
