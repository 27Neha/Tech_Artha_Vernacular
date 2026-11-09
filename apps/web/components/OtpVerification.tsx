'use client';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface OtpVerificationProps {
  identifierType: 'MOBILE' | 'EMAIL';
  initialChannel?: 'WHATSAPP' | 'EMAIL' | null;
  identifierValue: string;
  onSendOtp: (channel: 'WHATSAPP' | 'EMAIL') => Promise<void>;
  onVerify: (otp: string, channel: 'WHATSAPP' | 'EMAIL' | null) => Promise<void>;
  onChangeIdentifier: () => void;
  loading: boolean;
  error: string;
  setError: (error: string) => void;
}

export default function OtpVerification({
  identifierType,
  initialChannel,
  identifierValue,
  onSendOtp,
  onVerify,
  onChangeIdentifier,
  loading,
  error,
  setError,
}: OtpVerificationProps) {
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');
  const [otpChannel, setOtpChannel] = useState<'WHATSAPP' | 'EMAIL'>(
    initialChannel || (identifierType === 'EMAIL' ? 'EMAIL' : 'WHATSAPP')
  );

  const [waTimer, setWaTimer] = useState(0);
  const [emailTimer, setEmailTimer] = useState(0);
  const [hasSent, setHasSent] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialChannel === 'EMAIL') {
      setEmailTimer(60);
      setOtpChannel('EMAIL');
    } else {
      setWaTimer(60);
      setOtpChannel('WHATSAPP');
    }
    inputRef.current?.focus();
  }, [initialChannel]);

  useEffect(() => {
    let wInt: NodeJS.Timeout | undefined;
    let eInt: NodeJS.Timeout | undefined;
    if (waTimer > 0) wInt = setInterval(() => setWaTimer((w) => w - 1), 1000);
    if (emailTimer > 0) eInt = setInterval(() => setEmailTimer((e) => e - 1), 1000);
    return () => {
      if (wInt) clearInterval(wInt);
      if (eInt) clearInterval(eInt);
    };
  }, [waTimer, emailTimer]);

  const handleSend = async (channel: 'WHATSAPP' | 'EMAIL') => {
    setOtpChannel(channel);
    setHasSent(true);
    setError('');
    try {
      await onSendOtp(channel);
      if (channel === 'WHATSAPP') setWaTimer(60);
      if (channel === 'EMAIL') setEmailTimer(60);
    } catch (e) {
      // Error is handled by parent
    }
  };

  const handleVerify = () => {
    if (otp.length < 4) {
      setError(t('login.enterValidOtp', { defaultValue: 'Please enter the 4-digit verification code.' }));
      return;
    }
    onVerify(otp, otpChannel);
  };

  const currentTimer = otpChannel === 'EMAIL' ? emailTimer : waTimer;

  return (
    <div className="flex flex-col flex-1 animate-fade-in max-w-md w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--dark)] mb-2">
          {otpChannel === 'EMAIL'
            ? t('login.verifyEmail', { defaultValue: 'Verify your Email' })
            : t('login.verifyWa', { defaultValue: 'Verify your WhatsApp Number' })}
        </h1>
        <p className="text-sm text-gray-500">
          {t('login.otpSentTo', { defaultValue: 'Enter the 4-digit code sent to' })}{' '}
          <strong className="text-gray-900 font-semibold">
            {identifierType === 'EMAIL' ? identifierValue : `+91 ${identifierValue}`}
          </strong>
        </p>
      </div>

      {/* Channel active pill */}
      <div className="flex items-center gap-2 mb-6 p-3 rounded-xl border bg-gray-50">
        {otpChannel === 'WHATSAPP' ? (
          <>
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-[#25D366] flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900">Delivered via WhatsApp</p>
              <p className="text-[11px] text-gray-500">Check your WhatsApp incoming messages</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[#3C3985] flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900">Delivered via Zoho ZeptoMail</p>
              <p className="text-[11px] text-gray-500">Check your inbox and spam folder</p>
            </div>
          </>
        )}
      </div>

      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 block">
        {t('login.otpLabel', { defaultValue: 'One-Time Verification Code' })}
      </label>

      {/* 4-digit OTP input */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        maxLength={4}
        value={otp}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
          setOtp(val);
          setError('');
          if (val.length === 4) {
            onVerify(val, otpChannel);
          }
        }}
        placeholder="••••"
        className="w-full text-center text-3xl font-mono font-bold tracking-[0.5em] py-4 px-6 border-2 border-gray-200 rounded-xl focus:border-[#3C3985] focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:tracking-widest"
      />

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Resend Action */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 text-sm">
        <span className="text-gray-500 text-xs">
          {t('login.didntReceive', { defaultValue: "Didn't receive the code?" })}
        </span>

        {currentTimer > 0 ? (
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
            {t('login.resendIn', { defaultValue: 'Resend in' })} {Math.floor(currentTimer / 60)}:
            {(currentTimer % 60).toString().padStart(2, '0')}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => handleSend(otpChannel)}
            disabled={loading}
            className="text-xs font-bold text-[#3C3985] hover:underline"
          >
            ↻ {t('login.resendOtp', { defaultValue: 'Resend Code' })}
          </button>
        )}
      </div>

      <button
        onClick={handleVerify}
        disabled={loading || otp.length < 4}
        className={`w-full py-4 mt-6 rounded-xl font-bold text-white text-base shadow-sm transition-all flex items-center justify-center gap-2 ${
          loading || otp.length < 4
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-[#3C3985] hover:bg-[#322f73] active:scale-[0.99]'
        }`}
      >
        <span>
          {loading
            ? t('login.verifying', { defaultValue: 'Verifying...' })
            : t('login.verifyOtp', { defaultValue: 'Verify & Continue' })}
        </span>
        <span>➔</span>
      </button>

      <button
        type="button"
        onClick={onChangeIdentifier}
        className="w-full text-center text-sm font-semibold text-[#3C3985] hover:underline mt-4 py-2"
      >
        ← {identifierType === 'EMAIL'
          ? t('login.changeEmail', { defaultValue: 'Change Email Address' })
          : t('login.changeNumber', { defaultValue: 'Change WhatsApp Number' })}
      </button>
    </div>
  );
}
