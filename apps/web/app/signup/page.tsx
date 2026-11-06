'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import OtpVerification from '../../components/OtpVerification';
import TermsModal from '../../components/TermsModal';
import PrivacyPolicyModal from '../../components/PrivacyPolicyModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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
  const [authChannel, setAuthChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsWarning, setTermsWarning] = useState('');
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [privacyPolicyModalOpen, setPrivacyPolicyModalOpen] = useState(false);

  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
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

  const mobileInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountExistsWarning, setAccountExistsWarning] = useState(false);

  const [error, setError] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const [otp, setOtp] = useState('');
  const [waTimer, setWaTimer] = useState(0);
  const [emailTimer, setEmailTimer] = useState(0);
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

  const getStatusIcon = (isValid: boolean | null) => {
    if (isValid === null)
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 flex-shrink-0"><circle cx="12" cy="12" r="5" fill="currentColor"></circle></svg>
      );
    return isValid ? (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 flex-shrink-0"><polyline points="20 6 9 17 4 12"></polyline></svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 flex-shrink-0"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    );
  };

  const isPasswordStrong =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  const handleContinue = async (channel: 'WHATSAPP' | 'EMAIL') => {
    setValidationError('');
    setTermsWarning('');
    setAccountExistsWarning(false);

    if (!acceptedTerms) {
      setTermsWarning(
        t('signup.termsRequired', {
          defaultValue: 'Please agree to the Terms of Service & Privacy Policy to continue.',
        }),
      );
      return;
    }

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
        body: JSON.stringify(channel === 'EMAIL' ? { email } : { mobile }),
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

  const handleSendSignupOtp = async (channel: 'WHATSAPP' | 'EMAIL') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/signup/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channel === 'EMAIL' ? { email, channel } : { mobile, channel }),
      });
      const data = await safeFetchJson(res);
      if (res.status === 409) {
        throw new Error(
          channel === 'EMAIL'
            ? t('signup.emailExists', { defaultValue: 'This email is already registered. Please log in instead.' })
            : t('signup.mobileExists', { defaultValue: 'This mobile number is already registered. Please log in instead.' }),
        );
      }
      if (!res.ok) throw new Error(data.message || t('login.failedToSendOtp', { defaultValue: 'Failed to send OTP' }));

      if (channel === 'WHATSAPP') setWaTimer(60);
      if (channel === 'EMAIL') setEmailTimer(60);
      setStep(1.5);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (overrideOtp?: string, overrideChannel?: 'WHATSAPP' | 'EMAIL' | null) => {
    const currentOtp = overrideOtp || otp;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          authChannel === 'EMAIL'
            ? { email, otp: currentOtp, type: 'signup' }
            : { mobile, otp: currentOtp, type: 'signup' },
        ),
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || t('login.invalidOtp', { defaultValue: 'Invalid OTP' }));

      // Move to password creation step
      setStep(1.6);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          authChannel === 'EMAIL'
            ? { email, password, clientType, referralCode }
            : { mobile, password, clientType, referralCode },
        ),
      });
      const data = await safeFetchJson(res);
      if (res.ok) {
        localStorage.setItem('access_token', data.accessToken || data.access_token);
        localStorage.setItem('user_id', data.user.id);
        setStep(2);
      } else {
        setError(data.message || t('signup.failedToSavePassword', { defaultValue: 'Failed to save password' }));
      }
    } catch (e) {
      setError(t('signup.anErrorOccurred', { defaultValue: 'An error occurred' }));
    }
    setLoading(false);
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName, dateOfBirth: dob, pan: panNumber }),
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

  const startKycWorkflow = async () => {
    setLoading(true);
    setError('');
    setPanVerified('IN_PROGRESS');
    try {
      if (!fullName || !dob || !panNumber) {
        setStep(2);
        return;
      }

      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/v1/kyc/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName, pan: panNumber, dob }),
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || 'Failed to initialize KYC');

      setTransactionId(data.transactionId);
      if (data.status === 'VERIFIED') {
        setPanVerified('SUCCESS');
      } else {
        setPanVerified('FAILED');
      }
    } catch (e: any) {
      setError(e.message);
      setPanVerified('FAILED');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 bg-white max-w-md w-full mx-auto">
      <p className="text-gray-400 text-xs font-semibold mb-6">
        {step < 2 ? 'STEP 1 OF 3 • ACCOUNT CREATION' : step === 2 ? 'STEP 2 OF 3 • PERSONAL DETAILS' : 'STEP 3 OF 3 • KYC VERIFICATION'}
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 border border-red-100 flex flex-col gap-2">
          <span className="text-sm">{error}</span>
          {error.includes('already exists') && (
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-xs font-bold text-[#3C3985] underline self-start"
            >
              {t('signup.goToLogin', { defaultValue: 'Go to Log In' })} →
            </button>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="flex-1 animate-fade-in flex flex-col justify-start w-full">
          <h1 className="text-2xl font-bold text-[var(--dark)] mb-2">
            {t('signup.createAccount', { defaultValue: 'Create your TechArtha account' })}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Join thousands of goal-based investors across India.
          </p>

          {termsWarning && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-fade-in">
              <span className="text-xl">⚠️</span>
              <p className="text-sm font-bold text-red-600 leading-snug">{termsWarning}</p>
            </div>
          )}

          {authChannel === 'EMAIL' ? (
            <div className="flex flex-col w-full">
              <div className="mb-6">
                <label className="label text-sm text-gray-700 font-semibold mb-2 block">
                  {t('signup.emailAddress', { defaultValue: 'Email Address' })}
                </label>
                <input
                  type="email"
                  ref={emailInputRef}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('signup.emailPlaceholder', { defaultValue: 'name@example.com' })}
                  className="w-full p-4 border border-gray-200 rounded-xl focus:border-[#3C3985] focus:ring-1 focus:ring-[#3C3985] outline-none transition-colors"
                />
                {validationError && <p className="text-red-500 text-xs mt-2 font-medium">{validationError}</p>}
              </div>

              {accountExistsWarning && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-amber-900 mb-2 font-medium">
                    {t('signup.emailExists', { defaultValue: 'This email is already registered. Please log in instead.' })}
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="text-sm font-bold text-[#3C3985] hover:underline"
                  >
                    {t('signup.goToLogin', { defaultValue: 'Go to Login' })} →
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleContinue('EMAIL')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-lg text-white bg-[#3C3985] hover:bg-[#322f73] transition-all shadow-sm mb-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <span>{t('signup.continueWithEmail', { defaultValue: 'Continue with Email' })}</span>
                <span>→</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthChannel('WHATSAPP');
                  setValidationError('');
                  setTermsWarning('');
                }}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors shadow-sm mb-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                {t('signup.useWaInstead', { defaultValue: 'Continue with WhatsApp instead' })}
              </button>
            </div>
          ) : (
            <div className="flex flex-col w-full">
              <div className="mb-6">
                <label className="label text-sm text-gray-700 font-semibold mb-2 block">
                  {t('signup.mobileNumber', { defaultValue: 'WhatsApp Mobile Number' })}
                </label>
                <div className="flex w-full">
                  <div className="flex-shrink-0 flex items-center justify-center px-4 border border-gray-200 border-r-0 rounded-l-xl bg-gray-50 text-gray-600 font-semibold">
                    +91
                  </div>
                  <input
                    type="tel"
                    ref={mobileInputRef}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder={t('signup.mobilePlaceholder', { defaultValue: 'Enter 10-digit mobile number' })}
                    className="w-full p-4 border border-gray-200 rounded-r-xl focus:border-[#3C3985] focus:ring-1 focus:ring-[#3C3985] outline-none transition-colors"
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
                {validationError && <p className="text-red-500 text-xs mt-2 font-medium">{validationError}</p>}
              </div>

              {accountExistsWarning && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-amber-900 mb-2 font-medium">
                    {t('signup.mobileExists', { defaultValue: 'This mobile number is already registered. Please log in instead.' })}
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="text-sm font-bold text-[#3C3985] hover:underline"
                  >
                    {t('signup.goToLogin', { defaultValue: 'Go to Login' })} →
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleContinue('WHATSAPP')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-lg text-white bg-[#25D366] hover:bg-[#20ba5a] transition-all shadow-sm mb-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                <span>{t('signup.continueWithWa', { defaultValue: 'Continue with WhatsApp' })}</span>
                <span>→</span>
              </button>

              <div className="relative flex items-center justify-center my-2 mb-4">
                <div className="border-t border-gray-200 w-full absolute"></div>
                <span className="bg-white px-4 text-gray-400 text-xs font-semibold relative">
                  {t('signup.or', { defaultValue: 'OR' })}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAuthChannel('EMAIL');
                  setValidationError('');
                  setTermsWarning('');
                }}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors shadow-sm mb-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3C3985" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                {t('signup.useEmailInstead', { defaultValue: 'Continue with Email' })}
              </button>
            </div>
          )}

          {/* Terms & Conditions Checkbox */}
          <div className="mt-2 mb-6">
            <div className="flex items-start gap-3 select-none">
              <input
                type="checkbox"
                id="signup-terms"
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked);
                  if (e.target.checked) setTermsWarning('');
                }}
                className={`mt-1 h-5 w-5 rounded border text-[#3C3985] focus:ring-[#3C3985] cursor-pointer ${
                  termsWarning ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <div className="text-xs sm:text-sm text-gray-600 leading-snug">
                <label htmlFor="signup-terms" className="cursor-pointer">
                  {t('signup.termsPrefix', { defaultValue: 'I agree to the ' })}
                </label>
                <button
                  type="button"
                  onClick={() => setTermsModalOpen(true)}
                  className="font-semibold text-gray-900 underline hover:text-[#3C3985] transition-colors inline"
                >
                  {t('signup.termsOfService', { defaultValue: 'Terms of Service' })}
                </button>
                <span>{` ${t('signup.and', { defaultValue: 'and' })} `}</span>
                <button
                  type="button"
                  onClick={() => setPrivacyPolicyModalOpen(true)}
                  className="font-semibold text-gray-900 underline hover:text-[#3C3985] transition-colors inline"
                >
                  {t('signup.privacyPolicy', { defaultValue: 'Privacy Policy' })}
                </button>
              </div>
            </div>
          </div>
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
          <h2 className="text-xl font-bold mb-2">{t('signup.passwordLabel', { defaultValue: 'Create Password' })}</h2>
          <p className="text-xs text-gray-500 mb-6">Create a strong password to secure your investment account.</p>

          <label className="label text-sm text-gray-700 font-semibold mb-2 block">
            {t('signup.passwordLabel', { defaultValue: 'Password' })}
          </label>
          <div className="relative flex items-center mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              placeholder={t('signup.passwordPlaceholder', { defaultValue: 'Secure password' })}
              className="w-full p-4 border border-gray-200 rounded-xl focus:border-[#3C3985] focus:ring-1 focus:ring-[#3C3985] outline-none transition-colors pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-gray-400 hover:text-[#3C3985] focus:outline-none flex items-center justify-center w-8 h-8 transition-colors"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
          </div>

          <label className="label text-sm text-gray-700 font-semibold mb-2 block">
            {t('signup.confirmPassword', { defaultValue: 'Confirm Password' })}
          </label>
          <div className="relative flex items-center mb-6">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('signup.confirmYourPassword', { defaultValue: 'Confirm your password' })}
              className="w-full p-4 border border-gray-200 rounded-xl focus:border-[#3C3985] focus:ring-1 focus:ring-[#3C3985] outline-none transition-colors pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 text-gray-400 hover:text-[#3C3985] focus:outline-none flex items-center justify-center w-8 h-8 transition-colors"
            >
              {showConfirmPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-xs text-gray-600">
            <p className="font-bold text-gray-900 mb-2">Password Requirements:</p>
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-2">
                {getStatusIcon(password.length === 0 ? null : password.length >= 8)}
                <span>At least 8 characters</span>
              </span>
              <span className="flex items-center gap-2">
                {getStatusIcon(password.length === 0 ? null : /[A-Z]/.test(password))}
                <span>One uppercase letter</span>
              </span>
              <span className="flex items-center gap-2">
                {getStatusIcon(password.length === 0 ? null : /[a-z]/.test(password))}
                <span>One lowercase letter</span>
              </span>
              <span className="flex items-center gap-2">
                {getStatusIcon(password.length === 0 ? null : /[0-9]/.test(password))}
                <span>One number</span>
              </span>
              <span className="flex items-center gap-2">
                {getStatusIcon(password.length === 0 ? null : /[^A-Za-z0-9]/.test(password))}
                <span>One special character</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSavePassword}
            disabled={!isPasswordStrong || password !== confirmPassword || loading}
            className="w-full py-4 rounded-xl font-bold text-lg text-white bg-[#3C3985] hover:bg-[#322f73] transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Set Password & Continue'} →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 flex flex-col mt-4 animate-fade-in">
          <h2 className="text-2xl font-bold text-[var(--dark)] mb-2">
            {t('signup.tellUsAboutYourself', { defaultValue: 'Tell us about yourself' })}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {t('signup.needFewDetails', { defaultValue: 'We need these details to verify your investor identity.' })}
          </p>

          <label className="label text-sm text-gray-700 font-semibold mb-2 block">
            {t('signup.fullNamePan', { defaultValue: 'Full Name (As per PAN Card)' })}
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Neha Mahajan"
            className="w-full p-4 border border-gray-200 rounded-xl focus:border-[#3C3985] focus:ring-1 focus:ring-[#3C3985] outline-none transition-colors mb-4"
          />

          <label className="label text-sm text-gray-700 font-semibold mb-2 block">
            {t('signup.dob', { defaultValue: 'Date of Birth' })}
          </label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full p-4 border border-gray-200 rounded-xl focus:border-[#3C3985] focus:ring-1 focus:ring-[#3C3985] outline-none transition-colors mb-4"
          />

          <label className="label text-sm text-gray-700 font-semibold mb-2 block">
            {t('signup.panNumber', { defaultValue: 'Permanent Account Number (PAN)' })}
          </label>
          <input
            type="text"
            value={panNumber}
            onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
            placeholder="ABCDE1234F"
            maxLength={10}
            className="w-full p-4 border border-gray-200 rounded-xl focus:border-[#3C3985] focus:ring-1 focus:ring-[#3C3985] outline-none transition-colors uppercase font-mono tracking-wider mb-6"
          />

          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={loading || !fullName || !dob || panNumber.length !== 10}
            className="w-full py-4 rounded-xl font-bold text-lg text-white bg-[#3C3985] hover:bg-[#322f73] transition-all shadow-sm disabled:opacity-50 mt-auto"
          >
            {loading ? 'Saving...' : 'Save & Proceed to Verification'} →
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="flex-1 flex flex-col animate-fade-in mt-4">
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6">
            <p className="text-sm text-[#3C3985] font-bold mb-1">
              {t('signup.identityVerification', { defaultValue: 'Identity Verification (KYC)' })}
            </p>
            <p className="text-xs text-gray-600">
              {t('signup.panKycDesc', { defaultValue: 'Your PAN is checked with the central registry via Cybrilla.' })}
            </p>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50 flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[var(--dark)]">PAN Verification</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {panVerified === 'PENDING' && 'Ready for verification'}
                  {panVerified === 'IN_PROGRESS' && 'Verifying with registry...'}
                  {panVerified === 'SUCCESS' && 'Verified successfully ✓'}
                  {panVerified === 'FAILED' && 'Verification failed'}
                </p>
              </div>
              <div>
                {panVerified === 'PENDING' && (
                  <button
                    type="button"
                    onClick={startKycWorkflow}
                    disabled={loading}
                    className="px-4 py-2 bg-[#3C3985] text-white font-bold rounded-lg text-sm hover:bg-[#322f73]"
                  >
                    {loading ? 'Starting...' : 'Verify Now'}
                  </button>
                )}
                {panVerified === 'IN_PROGRESS' && <span className="text-indigo-600 font-bold text-sm">Verifying...</span>}
                {panVerified === 'SUCCESS' && <span className="text-green-600 font-bold text-sm">Verified ✓</span>}
                {panVerified === 'FAILED' && <span className="text-red-500 font-bold text-sm">Failed</span>}
              </div>
            </div>

            {panVerified === 'FAILED' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-600 mb-2">{error || 'Could not verify PAN. Please verify the details entered.'}</p>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-2 bg-white border border-red-200 text-red-600 font-bold rounded-md text-xs hover:bg-red-50"
                >
                  Review PAN & Date of Birth
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            disabled={panVerified !== 'SUCCESS'}
            className={`w-full py-4 rounded-xl font-bold text-lg text-white mt-auto transition-all ${
              panVerified === 'SUCCESS'
                ? 'bg-[#3C3985] hover:bg-[#322f73]'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {panVerified === 'SUCCESS' ? 'Complete Onboarding & Enter Dashboard →' : 'Complete Verification to Continue'}
          </button>
        </div>
      )}

      <TermsModal isOpen={termsModalOpen} onClose={() => setTermsModalOpen(false)} />
      <PrivacyPolicyModal isOpen={privacyPolicyModalOpen} onClose={() => setPrivacyPolicyModalOpen(false)} />
    </div>
  );
}
