'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../TranslationProvider';

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
  const [panVerified, setPanVerified] = useState<'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED'>('PENDING');
  const [faceVerified, setFaceVerified] = useState<'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED'>('PENDING');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionId, setTransactionId] = useState('');
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

  const isPasswordStrong = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);

  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
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
    setStep(1.5);
  };

  const handleSendSignupOtp = async (channel: 'SMS' | 'WHATSAPP') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/signup/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, channel })
      });
      const data = await res.json();
      if (res.status === 409) {
        throw new Error('An account already exists with this mobile number. Please Login Instead.');
      }
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
      
      setOtpSent(true);
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
        body: JSON.stringify({ mobile, otp, type: 'signup', password }) // Also submitting password if created
      });
      const data = await res.json();
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
    setPanVerified('IN_PROGRESS');
    try {
      // 1. Ask backend to start KYC
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/v1/kyc/start`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
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
          <label className="label">Mobile Number</label>
          <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="10-digit number" className="input-field" maxLength={10} />
          
                    
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
        <div className="flex-1">
          <label className="label">Enter OTP</label>
          <p className="text-sm text-gray-500 mb-4">OTP sent to {mobile}</p>
          
          <input type="number" value={otp} onChange={e => setOtp(e.target.value)} placeholder="000000" className="input-field text-center text-2xl tracking-widest font-bold" maxLength={6} />
          
          <div className="flex gap-4 mt-6">
              <button 
                onClick={() => handleSendSignupOtp('SMS')}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border-2 font-bold transition-all text-sm border-gray-100 text-gray-400 bg-white hover:border-gray-200"
              >
                Send via SMS
              </button>
              <button 
                onClick={() => handleSendSignupOtp('WHATSAPP')}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border-2 font-bold transition-all text-sm border-[#25D366] bg-[#dcf8c6] text-[#128C7E]"
              >
                Send via WhatsApp
              </button>
            </div>

          <button onClick={handleVerifyOtp} disabled={otp.length < 4 || loading} className="btn-primary mt-8">
            <span>{loading ? 'Verifying...' : 'Verify OTP'}</span><span>→</span>
          </button>
          <button onClick={() => setStep(1)} className="text-[var(--primary)] font-bold mt-4 w-full text-center">Change Number</button>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1">
          <label className="label">Client Type</label>
          <div className="flex gap-4">
            {['retail', 'corporate', 'huf'].map(type => (
              <button key={type} onClick={() => setClientType(type)} className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 capitalize ${clientType === type ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]' : 'border-gray-100 bg-white'}`}>
                {type}
              </button>
            ))}
          </div>
          
          <label className="label">Referral Code (Optional)</label>
          <p className="text-xs text-gray-400 mb-2">Did a Mutual Fund Distributor refer you?</p>
          <input type="text" value={referralCode} onChange={e => setReferralCode(e.target.value)} placeholder="e.g. MFD-12345" className="input-field uppercase" />
          
          <button onClick={handleNext} className="btn-primary mt-8">
            <span>Continue</span><span>→</span>
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="flex-1 flex flex-col">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-6">
            <p className="text-sm text-amber-800 font-semibold mb-1">Identity Verification Required</p>
            <p className="text-xs text-amber-700">Your PAN and KYC details are securely verified through our regulated investment onboarding partner.</p>
          </div>
          
          <div className="flex flex-col gap-4">
            {/* PAN & KYC Section */}
            <div className="border border-gray-100 rounded-xl p-5 bg-gray-50 flex items-center justify-between">
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
                {panVerified === 'IN_PROGRESS' && <span className="text-gray-500 font-bold text-sm">⟳ Verifying...</span>}
                {panVerified === 'SUCCESS' && <span className="text-green-500 font-bold">✓ Verified</span>}
                {panVerified === 'FAILED' && <span className="text-red-500 font-bold">✕ Failed</span>}
              </div>
            </div>

            {/* Face Liveness Section */}
            <div className={`border rounded-xl p-5 flex items-center justify-between transition-colors ${panVerified === 'SUCCESS' ? 'border-gray-100 bg-gray-50' : 'border-gray-50 bg-gray-50/50 opacity-60'}`}>
              <div>
                <h4 className="font-bold text-[var(--dark)]">Face Verification</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {faceVerified === 'PENDING' && 'Live selfie required'}
                  {faceVerified === 'IN_PROGRESS' && 'Verifying...'}
                  {faceVerified === 'SUCCESS' && 'Verified successfully'}
                  {faceVerified === 'FAILED' && 'Verification failed'}
                </p>
              </div>
              <div>
                {panVerified === 'SUCCESS' && faceVerified === 'PENDING' && (
                  <button onClick={startKycWorkflow} disabled={loading} className="px-4 py-2 bg-[var(--primary)] text-white font-bold rounded-lg text-sm">
                    Start
                  </button>
                )}
                {faceVerified === 'IN_PROGRESS' && <span className="text-gray-500 font-bold text-sm">⟳ Verifying...</span>}
                {faceVerified === 'SUCCESS' && <span className="text-green-500 font-bold">✓ Verified</span>}
                {faceVerified === 'FAILED' && <span className="text-red-500 font-bold">✕ Failed</span>}
              </div>
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
            {panVerified === 'SUCCESS' ? 'Complete KYC' : 'KYC Pending'}
          </button>
        </div>
      )}
    </div>
  );
}

