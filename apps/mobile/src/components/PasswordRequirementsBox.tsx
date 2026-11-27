import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getPasswordChecks } from '../utils/passwordValidation';

interface PasswordRequirementsBoxProps {
  password: string;
}

export const PasswordRequirementsBox: React.FC<PasswordRequirementsBoxProps> = ({ password }) => {
  const checks = getPasswordChecks(password);

  const items = [
    { key: 'minLength', label: 'Minimum 8 characters', met: checks.minLength },
    { key: 'uppercase', label: 'At least 1 uppercase letter (A-Z)', met: checks.uppercase },
    { key: 'lowercase', label: 'At least 1 lowercase letter (a-z)', met: checks.lowercase },
    { key: 'number', label: 'At least 1 number (0-9)', met: checks.number },
    { key: 'special', label: 'At least 1 special character (!@#$...)', met: checks.special },
  ];

  return (
    <View style={reqStyles.box}>
      <Text style={reqStyles.title}>Password Requirements</Text>
      <View style={reqStyles.list}>
        {items.map((item) => (
          <View key={item.key} style={reqStyles.item}>
            <Text style={[reqStyles.icon, item.met ? reqStyles.met : reqStyles.unmet]}>
              {item.met ? '✓' : '✕'}
            </Text>
            <Text style={[reqStyles.label, item.met && reqStyles.labelMet]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const reqStyles = StyleSheet.create({
  box: {
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#102A54',
    marginBottom: 10,
  },
  list: {
    gap: 7,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 13.5,
    fontWeight: '900',
    marginRight: 8,
    width: 16,
    textAlign: 'center',
  },
  met: {
    color: '#2F855A',
  },
  unmet: {
    color: '#C53030',
  },
  label: {
    flex: 1,
    fontSize: 13,
    color: '#4A5568',
  },
  labelMet: {
    color: '#22543D',
    fontWeight: '600',
  },
});
