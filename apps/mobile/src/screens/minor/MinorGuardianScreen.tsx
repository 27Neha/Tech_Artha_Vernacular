import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api/client';
import { minorStyles as s } from './minorStyles';

/**
 * POST /api/v1/minor/guardian - step 1 of the guardian journey.
 *
 * Condenses the web's separate welcome and guardian pages into one form. The guardian's
 * PAN matters more than it looks: KycService.startKyc substitutes it for the minor's own
 * PAN when investorType is MINOR, so this is the identity that actually gets verified.
 */
const RELATIONSHIPS = ['Father', 'Mother', 'Legal guardian'];

const formatDob = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
};

export const MinorGuardianScreen = () => {
  const navigation = useNavigation<any>();
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0]);
  const [mobile, setMobile] = useState('');
  const [pan, setPan] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const validate = (): string | null => {
    if (fullName.trim().length < 3) return "Enter the guardian's full name.";
    if (!/^\d{10}$/.test(mobile)) return "Enter the guardian's 10-digit mobile number.";
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return "Enter the guardian's PAN, for example ABCDE1234F.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter the guardian's email address.";
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return 'Enter the date of birth as YYYY-MM-DD.';
    if (address.trim().length < 3) return "Enter the guardian's address.";
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) return Alert.alert('Check the details', problem);
    setSaving(true);
    try {
      await api.post('/api/v1/minor/guardian', {
        fullName: fullName.trim(),
        relationship,
        mobile,
        pan,
        email: email.trim(),
        ...(dateOfBirth ? { dateOfBirth } : {}),
        address: address.trim(),
      });
      // The next step sends an OTP to this number, and the server rejects a mismatch,
      // so it is carried forward rather than re-entered.
      navigation.navigate('MinorVerify', { mobile });
    } catch (e) {
      Alert.alert('Could not save guardian details', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.step}>STEP 1 OF 4</Text>
        <Text style={s.title}>Guardian details</Text>
        <Text style={s.subtitle}>
          A parent or legal guardian must be verified before a minor&apos;s account can be opened.
        </Text>
      </View>

      <ScrollView style={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Guardian&apos;s full name (as on PAN)</Text>
        <TextInput value={fullName} onChangeText={setFullName} autoCapitalize="words" style={s.input} />

        <Text style={s.label}>Relationship to the minor</Text>
        <View style={s.chipRow}>
          {RELATIONSHIPS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setRelationship(option)}
              style={[s.chip, relationship === option && s.chipSelected]}
            >
              <Text style={relationship === option ? s.chipTextSelected : s.chipText}>{option}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>Guardian&apos;s mobile number</Text>
        <TextInput
          value={mobile}
          onChangeText={(v) => setMobile(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="10-digit number"
          style={s.input}
        />

        <Text style={s.label}>Guardian&apos;s PAN</Text>
        <TextInput
          value={pan}
          onChangeText={(v) => setPan(v.toUpperCase())}
          autoCapitalize="characters"
          maxLength={10}
          placeholder="ABCDE1234F"
          style={s.input}
        />
        <Text style={s.hint}>KYC for a minor is verified against the guardian&apos;s PAN.</Text>

        <Text style={s.label}>Guardian&apos;s email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="you@example.com"
          style={s.input}
        />

        <Text style={s.label}>Guardian&apos;s date of birth (optional)</Text>
        <TextInput
          value={dateOfBirth}
          onChangeText={(v) => setDateOfBirth(formatDob(v))}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="YYYY-MM-DD"
          style={s.input}
        />

        <Text style={s.label}>Address</Text>
        <TextInput value={address} onChangeText={setAddress} multiline style={[s.input, s.multiline]} />

        <Pressable style={[s.button, saving && s.disabled]} onPress={save} disabled={saving}>
          <Text style={s.buttonText}>{saving ? 'Saving…' : 'Continue'}</Text>
        </Pressable>
        <View style={s.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
};
