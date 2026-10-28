import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../services/api/client';

/**
 * Second-factor confirmation for money movement - Cybrilla compliance points 5 to 7.
 *
 * Shared by the purchase, SIP and withdrawal flows so all three authorise the same way.
 * The payload given here is sent verbatim to the transaction endpoint afterwards: the
 * server fingerprints it when issuing the code and again when executing, and refuses the
 * transaction if the two differ. Changing an amount between the two calls therefore
 * fails closed rather than going through on an old code.
 */
export type TransactionPayload = {
  action: 'PURCHASE' | 'REDEMPTION' | 'SIP';
  amount?: number;
  units?: number;
  schemeIsin?: string;
  folioNumber?: string;
  bucketId?: string;
  frequency?: string;
  numberOfInstallments?: number;
  fullExit?: boolean;
};

type Challenge = {
  challengeId: string;
  summary: string;
  /** The server's wording; it stores this same text with the authorisation. */
  consentStatement?: string;
  expiresInSeconds: number;
  devOtp?: string;
};

/** Sent with the transaction: the code, and the investor's consent given with it. */
export type TransactionAuth = { challengeId: string; otp: string; transactionConsent: true };

export const TransactionOtpModal = ({
  visible,
  payload,
  onCancel,
  onAuthorised,
}: {
  visible: boolean;
  payload: TransactionPayload | null;
  onCancel: () => void;
  /** Called with the fields the transaction endpoint needs alongside the payload. */
  onAuthorised: (auth: TransactionAuth) => void;
}) => {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  // Never pre-ticked: consent is the investor's act at the moment of entering the code.
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (!visible || !payload) {
      setChallenge(null);
      setOtp('');
      setError('');
      setConsented(false);
      return;
    }
    let active = true;
    setSending(true);
    api
      .post<Challenge>('/transactions/2fa/challenge', payload)
      .then((data) => {
        if (!active) return;
        setChallenge(data);
        // Mirrors the login screen: in development the server returns the code so the
        // flow can be exercised without waiting on delivery. Stripped from release.
        if (__DEV__ && data?.devOtp) setOtp(data.devOtp);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Could not send the code.'))
      .finally(() => active && setSending(false));
    return () => {
      active = false;
    };
  }, [visible, payload]);

  const confirm = () => {
    if (!challenge) return;
    if (otp.trim().length < 4) return setError('Enter the 4-digit code.');
    if (!consented) return setError('Tick the box to confirm you authorise this transaction.');
    onAuthorised({ challengeId: challenge.challengeId, otp: otp.trim(), transactionConsent: true });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Confirm this transaction</Text>

          {sending ? (
            <ActivityIndicator style={{ marginVertical: 24 }} color="#3C3985" />
          ) : (
            <>
              {/* The server's wording, so the investor approves a described action
                  rather than an opaque code. */}
              <Text style={styles.summary}>
                {challenge?.summary
                  ? `You are authorising a ${challenge.summary}.`
                  : 'You are authorising this transaction.'}
              </Text>
              <Text style={styles.hint}>We have sent a 4-digit code to your registered mobile number.</Text>

              <TextInput
                value={otp}
                onChangeText={(t) => {
                  setOtp(t);
                  setError('');
                }}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="4-digit code"
                placeholderTextColor="#A0AEC0"
                style={styles.input}
              />
              {__DEV__ && challenge?.devOtp ? (
                <Text style={styles.devNote}>Dev bypass: code {challenge.devOtp} filled in automatically.</Text>
              ) : null}
              {challenge ? (
                <Pressable
                  style={styles.consentRow}
                  onPress={() => {
                    setConsented((v) => !v);
                    setError('');
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: consented }}
                >
                  <View style={[styles.checkbox, consented && styles.checkboxChecked]}>
                    {consented ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                  <Text style={styles.consentText}>
                    {challenge.consentStatement ?? 'I authorise TechArtha to place this transaction on my behalf.'}
                  </Text>
                </Pressable>
              ) : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                style={[styles.button, (!challenge || otp.trim().length < 4 || !consented) && styles.disabled]}
                onPress={confirm}
                disabled={!challenge || otp.trim().length < 4 || !consented}
              >
                <Text style={styles.buttonText}>Authorise</Text>
              </Pressable>
            </>
          )}

          <Pressable style={styles.cancel} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,42,84,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 22 },
  title: { color: '#102A54', fontSize: 18, fontWeight: '800' },
  summary: { color: '#102A54', fontSize: 14, fontWeight: '600', marginTop: 12, lineHeight: 20 },
  hint: { color: '#718096', fontSize: 12, marginTop: 8, lineHeight: 18 },
  input: { backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 18, letterSpacing: 4, color: '#102A54', marginTop: 16, textAlign: 'center' },
  devNote: { color: '#7A5B00', fontSize: 11, marginTop: 8, fontWeight: '600' },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#3C3985', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  checkboxChecked: { backgroundColor: '#3C3985' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  consentText: { flex: 1, color: '#102A54', fontSize: 12, lineHeight: 18 },
  error: { color: '#C53030', fontSize: 12, marginTop: 8, fontWeight: '600' },
  button: { backgroundColor: '#3C3985', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 18 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  cancel: { paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  cancelText: { color: '#718096', fontSize: 14, fontWeight: '600' },
});
