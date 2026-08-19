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
  const [clientType, setClientType] = useState('retail');
  const [referralCode, setReferralCode] = useState('');
  
  const [panNumber, setPanNumber] = useState('');
  const [panVerified, setPanVerified] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

  const handleNext = () => {
    setStep(s => s + 1);
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

  const verifyHyperverge = async (type: 'pan' | 'face') => {
    setLoading(true);
    // Simulate Hyperverge API call
    setTimeout(() => {
      if (type === 'pan') {
        setPanVerified(true);
        setPanNumber('ABCD1234E'); // Simulated extraction
      }
      if (type === 'face') setFaceVerified(true);
      setLoading(false);
    }, 1500);
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
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Secure password" className="input-field" />
          
          <button onClick={handleNext} disabled={mobile.length !== 10 || password.length < 6} className="btn-primary mt-8">
            <span>Continue</span><span>→</span>
          </button>
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
        <div className="flex-1">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-6">
            <p className="text-sm text-amber-800">We use <b>Hyperverge</b> to securely verify your identity.</p>
          </div>
          
          <label className="label">PAN Verification</label>
          {panVerified ? (
            <div className="bg-green-50 text-green-700 p-4 rounded-xl font-bold mb-4">PAN Verified: {panNumber} ✓</div>
          ) : (
            <button onClick={() => verifyHyperverge('pan')} disabled={loading} className="btn-outline mb-4">
              {loading ? 'Processing...' : 'Upload PAN Card'}
            </button>
          )}

          <label className="label">Face Liveness</label>
          {faceVerified ? (
            <div className="bg-green-50 text-green-700 p-4 rounded-xl font-bold mb-6">Face Verified ✓</div>
          ) : (
            <button onClick={() => verifyHyperverge('face')} disabled={loading || !panVerified} className="btn-outline mb-6">
              {loading ? 'Processing...' : 'Take a Selfie'}
            </button>
          )}
          
          <button onClick={handleSignup} disabled={!panVerified || !faceVerified || loading} className="btn-primary mt-4">
            <span>{loading ? 'Creating account...' : 'Complete Sign Up'}</span><span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
