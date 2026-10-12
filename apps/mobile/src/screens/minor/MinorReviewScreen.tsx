import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../../services/api/client';
import { minorStyles as s } from './minorStyles';

/**
 * GET /api/v1/minor/onboarding/status - step 4.
 *
 * Shows the server's own view of the journey rather than anything the app tracked
 * locally, so a half-finished onboarding resumed on another device still reads correctly.
 */
type Status = {
  investorType?: string;
  hasGuardian?: boolean;
  guardianVerified?: boolean;
  hasConsent?: boolean;
  hasRiskAssessment?: boolean;
  riskCategory?: string;
  kycStatus?: string;
  majorityDate?: string;
};

const Tick = ({ done }: { done?: boolean }) => (
  <Text style={[s.rowValue, done ? s.ok : s.pending]}>{done ? 'Done' : 'Pending'}</Text>
);

export const MinorReviewScreen = () => {
  const navigation = useNavigation<any>();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      api
        .get<Status>('/api/v1/minor/onboarding/status')
        .then((data) => !cancelled && setStatus(data))
        .catch(() => undefined)
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const startKyc = async () => {
    setStarting(true);
    try {
      // For a minor, KycService ignores the PAN sent here and uses the guardian's,
      // provided a guardian record exists. The fields are still required by the
      // controller's signature, so placeholders are sent and the server overrides them.
      const result = await api.post<{ status?: string }>('/api/v1/kyc/start', {
        fullName: 'Minor account',
        pan: 'GUARDIAN',
        dob: '2000-01-01',
      });
      Alert.alert('KYC submitted', `Status: ${result?.status ?? 'in progress'}`, [
        { text: 'OK', onPress: () => navigation.navigate('RiskAssessment') },
      ]);
    } catch (e) {
      Alert.alert('Could not start KYC', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centre}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  const ready = status?.hasGuardian && status?.guardianVerified && status?.hasConsent;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.step}>STEP 4 OF 4</Text>
        <Text style={s.title}>Review</Text>
        <Text style={s.subtitle}>Everything we have for this minor account so far.</Text>
      </View>

      <ScrollView style={s.content}>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.rowLabel}>Guardian details</Text>
            <Tick done={status?.hasGuardian} />
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Guardian verified</Text>
            <Tick done={status?.guardianVerified} />
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Guardian consent</Text>
            <Tick done={status?.hasConsent} />
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Risk assessment</Text>
            <Tick done={status?.hasRiskAssessment} />
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>KYC</Text>
            <Text style={[s.rowValue, status?.kycStatus === 'VERIFIED' ? s.ok : s.pending]}>
              {status?.kycStatus ?? 'NOT_STARTED'}
            </Text>
          </View>
        </View>

        {status?.majorityDate ? (
          <Text style={s.hint}>
            This account converts to an adult account on {String(status.majorityDate).slice(0, 10)}.
          </Text>
        ) : null}

        {ready ? (
          <Pressable style={[s.button, starting && s.disabled]} onPress={startKyc} disabled={starting}>
            <Text style={s.buttonText}>{starting ? 'Submitting…' : 'Start KYC'}</Text>
          </Pressable>
        ) : (
          <Text style={s.error}>
            Complete the guardian steps above before KYC can be started.
          </Text>
        )}

        <Pressable style={s.outlineButton} onPress={() => navigation.navigate('MainTabs')}>
          <Text style={s.outlineText}>Back to app</Text>
        </Pressable>
        <View style={s.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
};
