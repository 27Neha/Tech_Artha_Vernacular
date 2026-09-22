'use client';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface OtpVerificationProps {
  identifierType: 'MOBILE' | 'EMAIL';
  identifierValue: string;
  onSendOtp: (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => Promise<void>;
  onVerify: (otp: string, channel: 'SMS' | 'WHATSAPP' | 'EMAIL' | null) => Promise<void>;
  onChangeIdentifier: () => void;
  loading: boolean;
  error: string;
  setError: (error: string) => void;
  otpHint?: string;
}

export default function OtpVerification({
  identifierType,
  identifierValue,
  onSendOtp,
  onVerify,
  onChangeIdentifier,
  loading,
  error,
  setError,
  otpHint
}: OtpVerificationProps) {
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');
  const [otpChannel, setOtpChannel] = useState<'SMS' | 'WHATSAPP' | 'EMAIL' | null>(identifierType === 'EMAIL' ? 'EMAIL' : null);
  
  const [smsTimer, setSmsTimer] = useState(0);
  const [waTimer, setWaTimer] = useState(0);
  const [emailTimer, setEmailTimer] = useState(0);

  useEffect(() => {
    let sInt: NodeJS.Timeout, wInt: NodeJS.Timeout, eInt: NodeJS.Timeout;
    if (smsTimer > 0) sInt = setInterval(() => setSmsTimer(s => s - 1), 1000);
    if (waTimer > 0) wInt = setInterval(() => setWaTimer(w => w - 1), 1000);
    if (emailTimer > 0) eInt = setInterval(() => setEmailTimer(e => e - 1), 1000);
    return () => { clearInterval(sInt); clearInterval(wInt); clearInterval(eInt); };
  }, [smsTimer, waTimer, emailTimer]);

  const handleSend = async (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => {
    setOtpChannel(channel);
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

      {otpHint && <p className="text-sm font-mono bg-blue-50 text-blue-800 p-2 rounded mb-4">{otpHint}</p>}

      <label className="label">{t('login.otpLabel') || 'One-Time Password (OTP)'}</label>
      
      <input
        type="number"
        value={otp}
        onChange={(e) => {
          if (identifierType === 'MOBILE' && !otpChannel) {
            setError(t('signup.selectChannel') || 'Please select SMS or WhatsApp first.');
            return;
          }
          setOtp(e.target.value.slice(0, 6));
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
            disabled={loading || smsTimer > 0}
            className={`flex-1 py-3 flex flex-col items-center justify-center rounded-xl border-2 font-bold transition-all ${otpChannel === 'SMS' ? 'border-[var(--primary)] text-[var(--dark)] bg-[var(--primary-light)]' : 'border-gray-100 text-gray-400 bg-white hover:border-gray-200'} ${smsTimer > 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <span className="text-sm">{t('login.sendSms') || 'Send via SMS'}</span>
            {smsTimer > 0 && <span className="text-[10px] mt-0.5 opacity-80">{t('login.resendIn', { time: `${Math.floor(smsTimer / 60)}:${(smsTimer % 60).toString().padStart(2, '0')}` }) || `Resend in ${Math.floor(smsTimer / 60)}:${(smsTimer % 60).toString().padStart(2, '0')}`}</span>}
          </button>
          <button 
            onClick={() => handleSend('WHATSAPP')}
            disabled={loading || waTimer > 0}
            className={`flex-1 py-3 flex flex-col items-center justify-center rounded-xl border-2 font-bold transition-all ${otpChannel === 'WHATSAPP' ? 'border-[#25D366] text-[#128C7E] bg-[#dcf8c6]' : 'border-gray-100 text-gray-400 bg-white hover:border-gray-200'} ${waTimer > 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <span className="text-sm">{t('login.sendWa') || 'Send via WhatsApp'}</span>
            {waTimer > 0 && <span className="text-[10px] mt-0.5 opacity-80">{t('login.resendIn', { time: `${Math.floor(waTimer / 60)}:${(waTimer % 60).toString().padStart(2, '0')}` }) || `Resend in ${Math.floor(waTimer / 60)}:${(waTimer % 60).toString().padStart(2, '0')}`}</span>}
          </button>
        </div>
      ) : (
        <div className="flex gap-4 mt-6">
          <button 
            onClick={() => handleSend('EMAIL')}
            disabled={loading || emailTimer > 0}
            className={`flex-1 py-3 flex flex-col items-center justify-center rounded-xl border-2 font-bold transition-all ${otpChannel === 'EMAIL' ? 'border-[var(--primary)] text-[var(--dark)] bg-[var(--primary-light)]' : 'border-[var(--primary)] text-[var(--primary)] bg-white hover:bg-gray-50'} ${emailTimer > 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <span className="text-sm">{t('login.sendOtp') || 'Send OTP'}</span>
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
