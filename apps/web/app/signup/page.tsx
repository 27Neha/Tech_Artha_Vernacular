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
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionId, setTransactionId] = useState('');
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

  const isPasswordStrong = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);

  const [otp, setOtp] = useState('');
  const [smsTimer, setSmsTimer] = useState(0);
  const [waTimer, setWaTimer] = useState(0);
  const [emailTimer, setEmailTimer] = useState(0);
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [activeChannel, setActiveChannel] = useState<'SMS'|'WHATSAPP'|'EMAIL' | null>(null);
  const [otpHint, setOtpHint] = useState('');
  const [signupMethod, setSignupMethod] = useState<'MOBILE' | 'EMAIL'>('MOBILE');
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

  const handleContinueToOtp = () => {
    if (password !== confirmPassword) {
      setError(t('signup.passwordMismatch') || 'Passwords do not match');
      return;
    }
    setError('');
    
    setActiveChannel(signupMethod === 'EMAIL' ? 'EMAIL' : null);
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
        throw new Error('An account already exists with this ' + (channel === 'EMAIL' ? 'email address' : 'mobile number') + '. Please Login Instead.');
      }
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
        if (data.devOtp) setOtpHint('Test OTP: ' + data.devOtp);
      
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
        body: JSON.stringify(signupMethod === 'EMAIL' ? { email, otp: currentOtp, type: 'signup', password } : { mobile, otp: currentOtp, type: 'signup', password })
      });
      const data = await safeFetchJson(res);
      if (!res.ok) throw new Error(data.message || 'Invalid OTP');
      
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('user_id', data.user.id);
      
      // Move to personal info (formerly step 2)
      setStep(2);
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
      
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('user_id', data.user.id);
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
        alert('KYC is under manual review.');
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
      <p className="text-gray-500 mb-8">Step {step} of 3</p>
      
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
        <div className="flex-1">
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={signupMethod === 'MOBILE'} onChange={() => { setSignupMethod('MOBILE'); setEmail(''); setPassword(''); setConfirmPassword(''); }} className="accent-[var(--primary)]" /> {t('signup.mobileNumber') || 'Number'}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={signupMethod === 'EMAIL'} onChange={() => { setSignupMethod('EMAIL'); setMobile(''); setPassword(''); setConfirmPassword(''); }} className="accent-blue-500" /> {t('signup.emailAddress') || 'Email'}
              </label>
            </div>
            <label className="label">{signupMethod === 'EMAIL' ? (t('signup.emailAddress') || 'Email Address') : (t('signup.mobileNumber') || 'Mobile Number')}</label>
            <input 
              type={signupMethod === 'EMAIL' ? 'email' : 'text'} 
              value={signupMethod === 'EMAIL' ? email : mobile} 
              onChange={e => signupMethod === 'EMAIL' ? setEmail(e.target.value) : setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} 
              placeholder={signupMethod === 'EMAIL' ? t('signup.emailPlaceholder', { defaultValue: 'name@example.com' }) : t('signup.mobilePlaceholder', { defaultValue: '10-digit mobile number' })} 
              className="input-field" 
              maxLength={signupMethod === 'EMAIL' ? undefined : 10}
              inputMode={signupMethod === 'EMAIL' ? 'email' : 'numeric'}
            />
          
                    
                    <label className="label flex items-center gap-2 relative">
              {t('signup.passwordLabel') || 'Create Password'}
              <div ref={passwordInfoRef} className="relative flex items-center">
                <button type="button" onClick={(e) => { e.preventDefault(); setShowPasswordInfo(!showPasswordInfo); }} className="text-gray-400 hover:text-[var(--primary)] transition-colors focus:outline-none flex items-center justify-center" aria-label="Password requirements">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </button>
                {showPasswordInfo && (
                  <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-white shadow-xl rounded-xl border border-gray-100 z-50 animate-fade-in font-normal normal-case tracking-normal">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-2">{t('signup.passwordReqs') || 'Password Requirements'}</p>
                    <div className={`text-xs flex items-center gap-2 mb-1.5 transition-colors ${password.length === 0 ? 'text-gray-500' : (password.length >= 8 ? 'text-green-500' : 'text-red-500')}`}>
          <span className="w-3 flex-shrink-0 font-bold">{password.length === 0 ? '\u2022' : (password.length >= 8 ? '\u2713' : '\u2715')}</span> {t('signup.req8Chars') || 'At least 8 characters'}
        </div>
                    <div className={`text-xs flex items-center gap-2 mb-1.5 transition-colors ${password.length === 0 ? 'text-gray-500' : (/[A-Z]/.test(password) ? 'text-green-500' : 'text-red-500')}`}>
          <span className="w-3 flex-shrink-0 font-bold">{password.length === 0 ? '\u2022' : (/[A-Z]/.test(password) ? '\u2713' : '\u2715')}</span> {t('signup.reqUppercase') || 'One uppercase letter'}
        </div>
                    <div className={`text-xs flex items-center gap-2 mb-1.5 transition-colors ${password.length === 0 ? 'text-gray-500' : (/[a-z]/.test(password) ? 'text-green-500' : 'text-red-500')}`}>
          <span className="w-3 flex-shrink-0 font-bold">{password.length === 0 ? '\u2022' : (/[a-z]/.test(password) ? '\u2713' : '\u2715')}</span> {t('signup.reqLowercase') || 'One lowercase letter'}
        </div>
                    <div className={`text-xs flex items-center gap-2 mb-1.5 transition-colors ${password.length === 0 ? 'text-gray-500' : (/[0-9]/.test(password) ? 'text-green-500' : 'text-red-500')}`}>
          <span className="w-3 flex-shrink-0 font-bold">{password.length === 0 ? '\u2022' : (/[0-9]/.test(password) ? '\u2713' : '\u2715')}</span> {t('signup.reqNumber') || 'One number'}
        </div>
                    <div className={`text-xs flex items-center gap-2 transition-colors ${password.length === 0 ? 'text-gray-500' : (/[^A-Za-z0-9]/.test(password) ? 'text-green-500' : 'text-red-500')}`}>
          <span className="w-3 flex-shrink-0 font-bold">{password.length === 0 ? '\u2022' : (/[^A-Za-z0-9]/.test(password) ? '\u2713' : '\u2715')}</span> {t('signup.reqSpecial') || 'One special character'}
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
                title={showPassword ? "Hide password" : "Show password"}
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
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
            <button onClick={handleContinueToOtp}
  disabled={(signupMethod === 'EMAIL' ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : mobile.length !== 10) || !isPasswordStrong || loading} className="btn-primary mt-8">
                <span>{t('signup.continue') || 'Continue'}</span><span>→</span>
              </button>
              {!isPasswordStrong && passwordTouched && (
                <p className="text-red-500 text-xs font-semibold text-center mt-3 animate-fade-in">
                  {t('signup.passwordWarning') || 'Please check the password requirements using the ⓘ icon above.'}
                </p>
              )}
        </div>
      )}

      {step === 1.5 && (
        <div className="flex-1 flex flex-col justify-start">
          <OtpVerification
            identifierType={signupMethod}
            identifierValue={signupMethod === 'EMAIL' ? email : mobile}
            onSendOtp={handleSendSignupOtp}
            onVerify={handleVerifyOtp}
            onChangeIdentifier={() => setStep(1)}
            loading={loading}
            error={error}
            setError={setError}
            otpHint={otpHint}
          />
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
                    {panVerified === 'PENDING' && 'Verification required'}
                    {panVerified === 'IN_PROGRESS' && 'Verification in progress'}
                    {panVerified === 'SUCCESS' && 'Verified successfully'}
                    {panVerified === 'FAILED' && 'Verification failed'}
                  </p>
                </div>
                <div>
                  {panVerified === 'PENDING' && (
                    <button onClick={startKycWorkflow} disabled={loading} className="px-4 py-2 bg-[var(--primary)] text-white font-bold rounded-lg text-sm">
                      {loading ? 'Starting...' : 'Verify Now'}
                    </button>
                  )}
                  {panVerified === 'IN_PROGRESS' && <span className="text-gray-500 font-bold text-sm">{t('signup.verifyingStatus')}</span>}
                  {panVerified === 'SUCCESS' && <span className="text-green-500 font-bold">{t('signup.verifiedStatus')}</span>}
                  {panVerified === 'FAILED' && <span className="text-red-500 font-bold">{t('signup.failedStatus')}</span>}
                </div>
              </div>
              
              {panVerified === 'FAILED' && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 mt-2">
                   <p className="text-xs text-red-600 mb-3">{error || '{t('signup.panInvalid')}'}</p>
                   <button onClick={() => setStep(2)} className="w-full py-2 bg-white border border-red-200 text-red-600 font-bold rounded-md text-xs hover:bg-red-50 transition-colors">
                     Review Details
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
            {panVerified === 'SUCCESS' ? 'Complete Onboarding' : 'KYC Pending'}
          </button>
        </div>
      )}
    </div>
  );
}
