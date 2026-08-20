'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../TranslationProvider';

export default function ParentalApprovalPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [parentMobile, setParentMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = () => {
    if (parentMobile.length === 10) {
      setLoading(true);
      setTimeout(() => {
        setOtpSent(true);
        setLoading(false);
      }, 1000);
    }
  };

  const handleVerify = () => {
    if (otp.length === 6) {
      setLoading(true);
      setTimeout(() => {
        localStorage.setItem('parent_approved', 'true');
        router.push('/risk');
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-6 bg-white">
      <div className="flex items-center justify-between py-5 mb-4">
        
      </div>

      <div className="flex-1">
        <div className="w-16 h-16 bg-[#FFF4E8] rounded-full flex items-center justify-center mb-6">
          <span className="text-3xl">👨‍👩‍👧</span>
        </div>
        
        <h1 className="text-3xl font-extrabold text-[var(--dark)] mb-2">{t('parent.title')}</h1>
        <p className="text-gray-500 mb-10">{t('parent.desc')}</p>

        {!otpSent ? (
          <>
            <label className="label">Parent's Mobile Number</label>
            <div className="flex items-center border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm mb-6">
              <span className="px-4 py-4 text-[var(--dark)] font-bold border-r border-gray-200">+91</span>
              <input
                type="tel"
                value={parentMobile}
                onChange={(e) => setParentMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number"
                className="flex-1 px-4 py-4 text-[var(--dark)] text-base focus:outline-none bg-transparent"
                maxLength={10}
              />
            </div>
            
            <button
              onClick={handleSendOtp}
              disabled={loading || parentMobile.length !== 10}
              className="btn-primary"
            >
              <span>{loading ? 'Sending...' : 'Request Approval'}</span>
              <span>→</span>
            </button>
          </>
        ) : (
          <>
            <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-6 font-medium text-sm">
              Approval request sent to +91 {parentMobile}
            </div>
            
            <label className="label">Enter Approval OTP</label>
            <input
              type="number"
              value={otp}
              onChange={(e) => setOtp(e.target.value.slice(0, 6))}
              placeholder="6-digit OTP"
              className="input-field text-center tracking-widest font-bold text-2xl mb-6"
            />
            
            <button
              onClick={handleVerify}
              disabled={loading || otp.length !== 6}
              className="btn-primary"
            >
              <span>{loading ? 'Verifying...' : 'Verify & Continue'}</span>
              <span>→</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
