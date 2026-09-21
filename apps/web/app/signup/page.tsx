'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../TranslationProvider';


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

  const isPasswordStrong = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);

  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [emailInputMode, setEmailInputMode] = useState(false);
  const [email, setEmail] = useState('');
  const [activeChannel, setActiveChannel] = useState<'SMS'|'WHATSAPP'|'EMAIL' | null>(null);
  const [otpHint, setOtpHint] = useState('');
  const [otpChannel, setOtpChannel] = useState<'SMS' | 'WHATSAPP'>('SMS');

    const handleNext = () => {
    setStep(s => s + 1);
  };

  const handleContinueToOtp = () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setOtpSent(false);
    setEmailInputMode(false);
    setStep(1.5);
  };

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendSignupOtp = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => {
    setActiveChannel(channel);
    
    if (channel === 'EMAIL' && !emailInputMode) {
      setEmailInputMode(true);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const contact = channel === 'EMAIL' ? email : mobile;
      const res = await fetch(`${API_URL}/auth/signup/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: contact, channel })
      });
      const data = await safeFetchJson(res);
      if (res.status === 409) {
        throw new Error('An account already exists with this ' + (channel === 'EMAIL' ? 'email address' : 'mobile number') + '. Please Login Instead.');
      }
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
      
      setOtpSent(true);
      setResendTimer(30);
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

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: activeChannel === 'EMAIL' ? email : mobile, otp, type: 'signup', password })
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
              Go to Log In
            </button>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="flex-1">
          <label className="label">Mobile Number or Email</label>
          <input type="text" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="10-digit number or email" className="input-field" />
          
                    
                    <label className="label">Create Password</label>
            <div className="relative flex items-center">
              <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Secure password" className="input-field w-full pr-10" />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 text-gray-400 hover:text-[var(--primary)] focus:outline-none flex items-center justify-center w-8 h-8 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
            
            <label className="label mt-4">Confirm Password</label>
            <div className="relative flex items-center">
              <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm your password" className="input-field w-full pr-10" />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                className="absolute right-3 text-gray-400 hover:text-[var(--primary)] focus:outline-none flex items-center justify-center w-8 h-8 transition-colors"
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
          
          <div className="mt-3 flex flex-col gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Password Requirements</p>
            <div className={`text-xs flex items-center gap-2 transition-colors ${password.length >= 8 ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
              <span className="w-3">{password.length >= 8 ? '✓' : '○'}</span> At least 8 characters
            </div>
            <div className={`text-xs flex items-center gap-2 transition-colors ${/[A-Z]/.test(password) ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
              <span className="w-3">{/[A-Z]/.test(password) ? '✓' : '○'}</span> One uppercase letter
            </div>
            <div className={`text-xs flex items-center gap-2 transition-colors ${/[0-9]/.test(password) ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
              <span className="w-3">{/[0-9]/.test(password) ? '✓' : '○'}</span> One number
            </div>
            <div className={`text-xs flex items-center gap-2 transition-colors ${/[^A-Za-z0-9]/.test(password) ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
              <span className="w-3">{/[^A-Za-z0-9]/.test(password) ? '✓' : '○'}</span> One special character
            </div>
          </div>
          
          
          
          
                    <button onClick={handleContinueToOtp}
 disabled={mobile.length !== 10 || !isPasswordStrong || loading} className="btn-primary mt-8">
              <span>Continue</span><span>→</span>
            </button>
        </div>
      )}

      {step === 1.5 && (
        <div className="flex-1 flex flex-col mt-8">
          
          {!otpSent && !emailInputMode && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-[var(--dark)] mb-2">Choose OTP method</h2>
              <p className="text-sm text-gray-500 mb-8">Choose how you want to receive your OTP</p>
              
              <button onClick={() => handleSendSignupOtp('WHATSAPP')} disabled={loading} className="py-3 rounded-xl border-2 font-bold transition-all text-sm border-[#25D366] bg-[#dcf8c6] text-[#128C7E]">
                WhatsApp OTP
              </button>
              <button onClick={() => handleSendSignupOtp('SMS')} disabled={loading} className="py-3 rounded-xl border-2 font-bold transition-all text-sm border-purple-200 text-purple-700 bg-purple-50 hover:border-purple-300 hover:bg-purple-100">
                SMS OTP
              </button>
              <button onClick={() => handleSendSignupOtp('EMAIL')} disabled={loading} className="py-3 rounded-xl border-2 font-bold transition-all text-sm border-blue-100 text-blue-500 bg-blue-50 hover:border-blue-200">
                Email OTP
              </button>
              

            </div>
          )}

          {!otpSent && emailInputMode && (
             <div className="flex flex-col gap-4">
               <h2 className="text-2xl font-bold text-[var(--dark)] mb-2">Verify your email</h2>
               <p className="text-sm text-gray-500 mb-8">Enter your email address to receive an OTP</p>
               
               <label className="label">Email Address</label>
               <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email address" className="input-field" />
               
               <button onClick={() => handleSendSignupOtp('EMAIL')} disabled={loading || !email.includes('@')} className="btn-primary mt-4">
                 <span>{loading ? 'Sending...' : 'Send OTP'}</span><span>→</span>
               </button>
               

             </div>
          )}

          {otpSent && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-[var(--primary-light)] text-[var(--primary)] rounded-full flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <h2 className="text-2xl font-bold text-[var(--dark)] mb-2">Verify your {activeChannel === 'EMAIL' ? 'email' : 'number'}</h2>
              <p className="text-sm text-gray-500 mb-8 text-center max-w-xs">We sent a 6-digit OTP to <br/><span className="font-bold text-[var(--dark)]">{activeChannel === 'EMAIL' ? email : mobile}</span></p>
              
              <div className="flex gap-2 justify-center mb-8" dir="ltr">
                {otpArray.map((digit, index) => (
                  <input 
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    autoFocus={index === 0}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val) {
                        const newOtp = [...otpArray];
                        newOtp[index] = val;
                        setOtpArray(newOtp);
                        setOtp(newOtp.join(''));
                        if (index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
                      } else {
                        const newOtp = [...otpArray];
                        newOtp[index] = '';
                        setOtpArray(newOtp);
                        setOtp(newOtp.join(''));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !digit && index > 0) {
                        document.getElementById(`otp-${index - 1}`)?.focus();
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                      if (pasted.length > 0) {
                        const newOtp = [...otpArray];
                        for (let i = 0; i < pasted.length; i++) {
                          if (index + i < 6) newOtp[index + i] = pasted[i];
                        }
                        setOtpArray(newOtp);
                        setOtp(newOtp.join(''));
                        const focusIndex = Math.min(index + pasted.length, 5);
                        document.getElementById(`otp-${focusIndex}`)?.focus();
                      }
                    }}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-gray-200 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)] transition-all bg-gray-50 focus:bg-white" 
                  />
                ))}
              </div>

              <button onClick={handleVerifyOtp} disabled={otp.length < 6 || loading} className="btn-primary w-full max-w-sm">
                <span>{loading ? 'Verifying...' : 'Verify OTP'}</span><span>→</span>
              </button>
              
              <div className="flex flex-col items-center gap-3 mt-8">
                <p className="text-sm text-gray-500">
                  Didn't receive the code? 
                  {resendTimer > 0 ? (
                    <span className="font-bold text-gray-400 ml-1">Resend in {resendTimer}s</span>
                  ) : (
                    <button onClick={() => handleSendSignupOtp(activeChannel || 'SMS')} className="font-bold text-[var(--primary)] ml-1 hover:underline">
                      Resend OTP
                    </button>
                  )}
                </p>
                <button 
                  onClick={() => {
                    setOtpSent(false);
                    if (activeChannel !== 'EMAIL') setStep(1);
                  }} 
                  className="text-sm font-bold text-[var(--primary)] hover:underline mt-2"
                >
                  Change {activeChannel === 'EMAIL' ? 'Email' : 'Number'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      
      {step === 2 && (
        <div className="flex-1 flex flex-col mt-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-[var(--dark)] mb-2">Tell us about yourself</h2>
          <p className="text-sm text-gray-500 mb-8">We need a few details before verifying your identity.</p>

          <label className="label">Full Name (As per PAN)</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Neha Mahajan" className="input-field mb-4" />
          
          <label className="label">Date of Birth</label>
          <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="input-field mb-4" />
          
          <label className="label">PAN Number</label>
          <input type="text" value={panNumber} onChange={e => setPanNumber(e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} className="input-field uppercase mb-8" />
          
          <button onClick={handleSaveProfile} disabled={loading || !fullName || !dob || panNumber.length !== 10} className="btn-primary mt-auto">
            <span>{loading ? 'Saving...' : 'Save & Continue'}</span><span>→</span>
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-6">
            <p className="text-sm text-amber-800 font-semibold mb-1">Identity Verification</p>
            <p className="text-xs text-amber-700">Your PAN and KYC details are securely verified through Cybrilla.</p>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="border border-gray-100 rounded-xl p-5 bg-gray-50 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[var(--dark)]">PAN & KYC</h4>
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
                  {panVerified === 'IN_PROGRESS' && <span className="text-gray-500 font-bold text-sm">⏳ Verifying...</span>}
                  {panVerified === 'SUCCESS' && <span className="text-green-500 font-bold">✅ Verified</span>}
                  {panVerified === 'FAILED' && <span className="text-red-500 font-bold">❌ Failed</span>}
                </div>
              </div>
              
              {panVerified === 'FAILED' && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 mt-2">
                   <p className="text-xs text-red-600 mb-3">{error || 'The details provided do not match your PAN records.'}</p>
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
