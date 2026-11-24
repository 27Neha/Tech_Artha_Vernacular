import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  type TextInputInstance,
  StyleSheet,
} from 'react-native';
import { applyOtpInputChange } from '../utils/passwordValidation';

interface ResetOtpInputProps {
  value: string;
  onChange: (nextOtp: string) => void;
  editable?: boolean;
  hasError?: boolean;
  length?: number;
}

export const ResetOtpInput: React.FC<ResetOtpInputProps> = ({
  value,
  onChange,
  editable = true,
  hasError = false,
  length = 6,
}) => {
  const inputRefs = useRef<(TextInputInstance | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const handleChangeText = (text: string, index: number) => {
    const { nextValue, nextFocusIndex } = applyOtpInputChange(value, index, text, length);
    onChange(nextValue);

    const digitsOnly = text.replace(/\D/g, '');
    if (digitsOnly.length > 0 && nextFocusIndex !== index && nextFocusIndex < length) {
      inputRefs.current[nextFocusIndex]?.focus();
    }
  };

  const handleKeyPress = (
    event: { nativeEvent: { key: string } },
    index: number,
  ) => {
    if (event.nativeEvent.key === 'Backspace') {
      const currentChar = value[index] || '';
      if (!currentChar && index > 0) {
        const slots = Array.from({ length }, (_, idx) => value[idx] || '');
        slots[index - 1] = '';
        onChange(slots.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  return (
    <View style={otpStyles.row} testID="reset-otp-boxes">
      {Array.from({ length }).map((_, index) => {
        const digit = value[index] || '';
        const isFocused = focusedIndex === index;
        return (
          <TextInput
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            testID={`reset-otp-box-${index}`}
            value={digit}
            onChangeText={(text) => handleChangeText(text, index)}
            onKeyPress={(event) => handleKeyPress(event, index)}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex((prev) => (prev === index ? null : prev))}
            keyboardType="number-pad"
            returnKeyType={index === length - 1 ? 'done' : 'next'}
            textContentType={index === 0 ? 'oneTimeCode' : 'none'}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            selectTextOnFocus
            editable={editable}
            accessibilityLabel={`Verification code digit ${index + 1} of ${length}`}
            style={[
              otpStyles.box,
              digit ? otpStyles.boxFilled : null,
              isFocused ? otpStyles.boxFocused : null,
              hasError ? otpStyles.boxError : null,
            ]}
          />
        );
      })}
    </View>
  );
};

const otpStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  box: {
    flex: 1,
    minWidth: 40,
    maxWidth: 52,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#102A54',
    includeFontPadding: false,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  boxFilled: {
    borderColor: '#3C3985',
    backgroundColor: '#F8FAFF',
  },
  boxFocused: {
    borderColor: '#3C3985',
    borderWidth: 2,
  },
  boxError: {
    borderColor: '#E53E3E',
    backgroundColor: '#FFF5F5',
  },
});
