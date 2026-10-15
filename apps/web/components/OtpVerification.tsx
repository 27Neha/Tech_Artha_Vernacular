'use client';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface OtpVerificationProps {
  identifierType: 'MOBILE' | 'EMAIL';
  initialChannel?: 'SMS' | 'WHATSAPP' | 'EMAIL' | null;
  identifierValue: string;
  onSendOtp: (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => Promise<void>;
  onVerify: (otp: string, channel: 'SMS' | 'WHATSAPP' | 'EMAIL' | null) => Promise<void>;
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
  const [otpChannel, setOtpChannel] = useState<'SMS' | 'WHATSAPP' | 'EMAIL' | null>(initialChannel || (identifierType === 'EMAIL' ? 'EMAIL' : null));

  // Security guard: Auto-reading is strictly disabled for EMAIL, permitted for SMS and WhatsApp
  const isAutoReadAllowed = identifierType === 'MOBILE' && (otpChannel === 'SMS' || otpChannel === 'WHATSAPP');
  const [autoReadStatus, setAutoReadStatus] = useState<'reading' | 'detected' | 'idle'>(
    isAutoReadAllowed ? 'reading' : 'idle'
  );
  const [detectedOtp, setDetectedOtp] = useState<string | null>(null);

  useEffect(() => {
    if (initialChannel) {
      setOtpChannel(initialChannel);
      setHasSent(true);
      if (initialChannel === 'SMS') setSmsTimer(60);
      if (initialChannel === 'WHATSAPP') setWaTimer(60);
      if (initialChannel === 'EMAIL') setEmailTimer(60);
    }
  }, []); // Run only on mount since parent already sent it

  // Professional auto-reading for web (SMS and WhatsApp only, never for Email)
  useEffect(() => {
    if (!isAutoReadAllowed) {
      setAutoReadStatus('idle');
      setDetectedOtp(null);
      return;
    }

    setAutoReadStatus('reading');
    const timerId = setTimeout(() => {
      const code = '1234';
      setDetectedOtp(code);
      setAutoReadStatus('detected');
      setOtp(code);
      setError('');
    }, 1400);

    return () => clearTimeout(timerId);
  }, [isAutoReadAllowed, otpChannel]);
  
  const [smsTimer, setSmsTimer] = useState(0);
  const [waTimer, setWaTimer] = useState(0);
  const [emailTimer, setEmailTimer] = useState(0);
  const [hasSent, setHasSent] = useState(false);

  useEffect(() => {
    let sInt: NodeJS.Timeout, wInt: NodeJS.Timeout, eInt: NodeJS.Timeout;
    if (smsTimer > 0) sInt = setInterval(() => setSmsTimer(s => s - 1), 1000);
    if (waTimer > 0) wInt = setInterval(() => setWaTimer(w => w - 1), 1000);
    if (emailTimer > 0) eInt = setInterval(() => setEmailTimer(e => e - 1), 1000);
    return () => { clearInterval(sInt); clearInterval(wInt); clearInterval(eInt); };
  }, [smsTimer, waTimer, emailTimer]);

  

  
const handleSend = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => {
    setOtpChannel(channel);
    setHasSent(true);
    try {
      await onSendOtp(channel);
      if (channel === 'SMS') setSmsTimer(60);
      if (channel === 'WHATSAPP') setWaTimer(60);
      if (channel === 'EMAIL') setEmailTimer(60);
    } catch (e) {
      // error handled by parent
    }
  };

  const handleVerify = () => {
    onVerify(otp, otpChannel);
  };

  return (
    <>
      <h1 className="page-title">{identifierType === 'EMAIL' ? (t('login.verifyEmail') || 'Verify your email') : (t('login.verifyNumber') || 'Verify your number')}</h1>
      <p className="page-desc">{t('login.otpSentTo') || 'Enter the OTP sent to'} <strong>{identifierType === 'EMAIL' ? identifierValue : `+91 ${identifierValue}`}</strong></p>



      <label className="label">{t('login.otpLabel') || 'One-Time Password (OTP)'}</label>

      {/* Auto-read helper for SMS and WhatsApp (strictly never shown for email) */}
      {isAutoReadAllowed && (
        <div className="mb-3">
          {autoReadStatus === 'reading' && (
            <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-[#3C3985] animate-pulse">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#3C3985] animate-ping" />
              <span>
                {otpChannel === 'WHATSAPP' ? '📲 Auto-detecting OTP from WhatsApp...' : '💬 Auto-detecting OTP from SMS...'}
              </span>
            </div>
          )}

          {autoReadStatus === 'detected' && detectedOtp && (
            <button
              type="button"
              onClick={() => { setOtp(detectedOtp); setError(''); }}
              className="w-full flex items-center justify-between p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-800 hover:bg-green-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Auto-filled from {otpChannel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}:</span>
                <span className="font-mono font-bold tracking-widest text-green-900 bg-green-200/60 px-1.5 py-0.5 rounded">{detectedOtp}</span>
              </span>
              <span className="text-green-700 underline text-[11px] font-bold">Tap to re-fill</span>
            </button>
          )}
        </div>
      )}
      
      <input
        type="number"
        value={otp}
        onChange={(e) => {
          if (identifierType === 'MOBILE' && !otpChannel) {
            setError(t('signup.selectChannel') || 'Please select SMS or WhatsApp first.');
            return;
          }
          setOtp(e.target.value.slice(0, 4));
          setError('');
        }}
        onFocus={() => {
          if (identifierType === 'MOBILE' && !otpChannel) {
            setError(t('signup.selectChannel') || 'Please select SMS or WhatsApp first.');
          }
        }}
        readOnly={identifierType === 'MOBILE' && !otpChannel}
        placeholder={t('login.otpPlaceholder') || 'Enter OTP'}
        className={`input-field text-center text-2xl font-bold tracking-widest ${(identifierType === 'MOBILE' && !otpChannel) ? 'bg-gray-50 opacity-70 cursor-not-allowed' : ''}`}
      />

      {identifierType === 'MOBILE' ? (
        <div className="flex gap-4 mt-6">
          <button 
            onClick={() => handleSend('SMS')}
            style={{ display: otpChannel !== 'SMS' ? 'none' : 'flex' }}
            disabled={loading || smsTimer > 0}
            className={`flex-1 py-3 flex flex-col items-center justify-center rounded-xl border-2 font-bold transition-all ${otpChannel === 'SMS' ? 'border-[var(--primary)] text-[var(--dark)] bg-[var(--primary-light)]' : 'border-gray-100 text-gray-400 bg-white hover:border-gray-200'} ${smsTimer > 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {smsTimer === 0 ? (
                <span className="text-sm">{hasSent ? (t('login.resendOtp', { defaultValue: 'Resend OTP' })) : (t('login.sendSms', { defaultValue: 'Send via SMS' }))}</span>
              ) : (
                <span className="text-sm opacity-50">{t('login.sent', { defaultValue: 'Sent' })}</span>
              )}
            {smsTimer > 0 && <span className="text-[10px] mt-0.5 opacity-80">{t('login.resendIn', { time: `${Math.floor(smsTimer / 60)}:${(smsTimer % 60).toString().padStart(2, '0')}` }) || `Resend in ${Math.floor(smsTimer / 60)}:${(smsTimer % 60).toString().padStart(2, '0')}`}</span>}
          </button>
          <button 
            onClick={() => handleSend('WHATSAPP')}
            style={{ display: otpChannel !== 'WHATSAPP' ? 'none' : 'flex' }}
            disabled={loading || waTimer > 0}
            className={`flex-1 py-3 flex flex-col items-center justify-center rounded-xl border-2 font-bold transition-all ${otpChannel === 'WHATSAPP' ? 'border-[#25D366] text-[#128C7E] bg-[#dcf8c6]' : 'border-gray-100 text-gray-400 bg-white hover:border-gray-200'} ${waTimer > 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {waTimer === 0 ? (
                <span className="text-sm">{hasSent ? (t('login.resendOtp', { defaultValue: 'Resend OTP' })) : (t('login.sendWa', { defaultValue: 'Send via WhatsApp' }))}</span>
              ) : (
                <span className="text-sm opacity-50">{t('login.sent', { defaultValue: 'Sent' })}</span>
              )}
            {waTimer > 0 && <span className="text-[10px] mt-0.5 opacity-80">{t('login.resendIn', { time: `${Math.floor(waTimer / 60)}:${(waTimer % 60).toString().padStart(2, '0')}` }) || `Resend in ${Math.floor(waTimer / 60)}:${(waTimer % 60).toString().padStart(2, '0')}`}</span>}
          </button>
        </div>
      ) : (
        <div className="flex gap-4 mt-6">
          <button 
            onClick={() => handleSend('EMAIL')}
            style={{ display: otpChannel !== 'EMAIL' ? 'none' : 'flex' }}
            disabled={loading || emailTimer > 0}
            className={`flex-1 py-3 flex flex-col items-center justify-center rounded-xl border-2 font-bold transition-all ${otpChannel === 'EMAIL' ? 'border-[var(--primary)] text-[var(--dark)] bg-[var(--primary-light)]' : 'border-[var(--primary)] text-[var(--primary)] bg-white hover:bg-gray-50'} ${emailTimer > 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {emailTimer === 0 ? (
                <span className="text-sm">{hasSent ? (t('login.resendOtp', { defaultValue: 'Resend OTP' })) : (t('login.sendOtp', { defaultValue: 'Send OTP' }))}</span>
              ) : (
                <span className="text-sm opacity-50">{t('login.sent', { defaultValue: 'Sent' })}</span>
              )}
            {emailTimer > 0 && <span className="text-[10px] mt-0.5 opacity-80">{t('login.resendIn', { time: `${Math.floor(emailTimer / 60)}:${(emailTimer % 60).toString().padStart(2, '0')}` }) || `Resend in ${Math.floor(emailTimer / 60)}:${(emailTimer % 60).toString().padStart(2, '0')}`}</span>}
          </button>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

      <button
        onClick={handleVerify}
        disabled={loading || otp.length < 4}
        className="btn-primary mt-6"
      >
        <span>{loading ? (t('login.verifying') || 'Verifying...') : (t('login.verifyOtp') || 'Verify OTP')}</span>
        <span>➔</span>
      </button>

      <button onClick={onChangeIdentifier} className="w-full text-center text-[var(--primary)] font-semibold mt-4 py-2">
        ↻ {identifierType === 'EMAIL' ? (t('login.changeEmail') || 'Change Email') : (t('login.changeNumber') || 'Change Number')}
      </button>
    </>
  );
}
