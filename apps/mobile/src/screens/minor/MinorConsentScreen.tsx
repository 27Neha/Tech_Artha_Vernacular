import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api/client';
import { minorStyles as s } from './minorStyles';

/**
 * POST /api/v1/minor/guardian/consent - step 3.
 *
 * The server owns the consent wording, hashes it and stores the hash with the guardian's
 * IP and method, which is what makes the record auditable. The text shown here is a
 * plain-language restatement for the person tapping the box; the authoritative version
 * is the one MinorService hashes. The endpoint takes no body for exactly this reason -
 * the client cannot influence what was agreed to.
 */
export const MinorConsentScreen = () => {
  const navigation = useNavigation<any>();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api.post('/api/v1/minor/guardian/consent', {});
      navigation.navigate('MinorReview');
    } catch (e) {
      Alert.alert('Could not record consent', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.step}>STEP 3 OF 4</Text>
        <Text style={s.title}>Guardian consent</Text>
        <Text style={s.subtitle}>The guardian must confirm they authorise this account.</Text>
      </View>

      <ScrollView style={s.content}>
        <View style={s.card}>
          <Text style={s.cardTitle}>What the guardian is confirming</Text>
          <Text style={s.bodyText}>
            I confirm that I am the parent or legal guardian of the minor named in this application. I
            authorise the opening and operation of this investment account on their behalf, and I
            understand that all transactions will be made in my name as guardian until the minor reaches
            majority.
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>What this means</Text>
          <Text style={s.bodyText}>
            KYC will be carried out against the guardian&apos;s PAN, not the minor&apos;s. Investments are
            subject to market risks and are not guaranteed. Consent is recorded with a timestamp and the
            device&apos;s IP address for audit purposes.
          </Text>
        </View>

        <Pressable style={s.consentRow} onPress={() => setAgreed(!agreed)}>
          <View style={[s.checkbox, agreed && s.checkboxChecked]}>
            {agreed ? <Text style={s.checkIcon}>✓</Text> : null}
          </View>
          <Text style={s.consentText}>
            I am the parent or legal guardian, and I give my consent as described above.
          </Text>
        </Pressable>

        <Pressable style={[s.button, (!agreed || saving) && s.disabled]} onPress={submit} disabled={!agreed || saving}>
          <Text style={s.buttonText}>{saving ? 'Recording…' : 'Give consent'}</Text>
        </Pressable>
        <View style={s.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
};
