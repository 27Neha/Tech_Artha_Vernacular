import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles as globalStyles } from '../theme/styles';

interface OtpVerificationProps {
  identifierType: 'MOBILE' | 'EMAIL';
  initialChannel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  identifierValue: string;
  onSendOtp: (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => Promise<void>;
  onVerify: (otp: string, overrideChannel?: 'SMS' | 'WHATSAPP' | 'EMAIL' | null) => Promise<void>;
  onChangeIdentifier: () => void;
  loading: boolean;
  error: string;
  setError: (err: string) => void;
}

export const OtpVerification = ({
  identifierType,
  initialChannel,
  identifierValue,
  onSendOtp,
  onVerify,
  onChangeIdentifier,
  loading,
  error,
  setError
}: OtpVerificationProps) => {
  const { t } = useTranslation('common');
  const [otp, setOtp] = useState('');
  const [activeChannel, setActiveChannel] = useState(initialChannel);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let int: any;
    if (timer > 0) {
      int = setInterval(() => setTimer(p => p - 1), 1000);
    }
    return () => clearInterval(int);
  }, [timer]);

  useEffect(() => {
    setTimer(120);
  }, []);

  const handleResend = async () => {
    try {
      await onSendOtp(activeChannel);
      setTimer(120);
    } catch (e) {
      // error handled in parent
    }
  };

  const getTimerText = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const displayIdentifier = identifierType === 'EMAIL' ? identifierValue : `+91\u00A0${identifierValue}`;

  return (
    <View style={styles.container}>
      <Text style={globalStyles.title}>{t('login.verifyTitle', { defaultValue: 'Verify it\'s you' })}</Text>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 12}}>
        <Text style={[globalStyles.description, { marginTop: 0, marginRight: 8 }]}>
          {t('login.enterOtpSentTo', { defaultValue: 'Enter the verification code sent to' })} <Text style={{fontWeight: '800', color: '#102A54'}}>{displayIdentifier}</Text>
        </Text>
        <Pressable onPress={onChangeIdentifier} hitSlop={10}>
          <Text style={{color: '#3C3985', fontWeight: '800', fontSize: 14, textDecorationLine: 'underline'}}>{t('login.changeNumber', { defaultValue: 'Change' })}</Text>
        </Pressable>
      </View>

      <Text style={[globalStyles.label, { marginTop: 24 }]}>{t('login.otpLabel', { defaultValue: 'Verification Code' })}</Text>
      
      <TextInput
        value={otp}
        onChangeText={(text) => {
          setOtp(text);
          setError('');
        }}
        keyboardType="number-pad"
        maxLength={4}
        
        style={globalStyles.field}
        editable={!loading}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable 
        style={[globalStyles.primaryButton, { marginTop: 24 }, (loading || otp.length < 4) && globalStyles.primaryDisabled]} 
        onPress={() => onVerify(otp, activeChannel)}
        disabled={loading || otp.length < 4}
      >
        <Text style={globalStyles.primaryText}>{loading ? t('common.verifying', { defaultValue: 'Verifying...' }) : t('login.verifyOtpBtn', { defaultValue: 'Verify & Continue' })}</Text>
        {!loading && <Text style={globalStyles.primaryText}>&gt;</Text>}
      </Pressable>

      <View style={styles.resendContainer}>
        <Text style={styles.resendDesc}>{t('login.didntReceive', { defaultValue: 'Didn\'t receive the code?' })}</Text>
        <Pressable onPress={handleResend} disabled={timer > 0 || loading} style={styles.resendBtn}>
          <Text style={[styles.resendText, (timer > 0 || loading) && styles.disabledText]}>
            {timer > 0 ? (t('login.resendIn', { defaultValue: 'Resend in {{time}}', time: getTimerText(timer) })).replace(/\{\{?time\}\}?/g, getTimerText(timer)) : t('login.resendSms', { defaultValue: 'Resend Code' })}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  changeBtn: { alignSelf: 'flex-start', marginTop: 4 },
  changeText: { color: '#3C3985', fontWeight: '600', fontSize: 14 },
  errorText: { color: '#E53E3E', fontSize: 12, marginTop: 8, fontWeight: '500' },
  resendContainer: { marginTop: 32, alignItems: 'center' },
  resendDesc: { color: '#718096', fontSize: 14, marginBottom: 12 },
  resendBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#EBEBFA' },
  resendText: { color: '#3C3985', fontWeight: '600', fontSize: 14 },
  disabledText: { color: '#A0AEC0' }
});
