import {
  applyOtpInputChange,
  getPasswordChecks,
  isPasswordStrong,
  isValidEmailFormat,
  maskEmailAddress,
  normalizeEmailInput,
  validatePasswordMatchAndStrength,
} from '../passwordValidation';

describe('passwordValidation & OTP input helpers', () => {
  it('normalizes, validates, and safely masks email addresses', () => {
    expect(normalizeEmailInput('  Investor.Test@Example.COM  ')).toBe('investor.test@example.com');
    expect(isValidEmailFormat('investor@techartha.com')).toBe(true);
    expect(isValidEmailFormat('not-an-email')).toBe(false);
    expect(maskEmailAddress('investor@techartha.com')).toBe('in****r@techartha.com');
    expect(maskEmailAddress('ab@techartha.com')).toBe('a***@techartha.com');
  });

  it('evaluates all 5 password strength requirements', () => {
    expect(getPasswordChecks('weak')).toEqual({
      minLength: false,
      uppercase: false,
      lowercase: true,
      number: false,
      special: false,
    });
    expect(isPasswordStrong('weakpass1!')).toBe(false);
    expect(isPasswordStrong('StrongPass#2026')).toBe(true);
  });

  it('validates strength and confirmation with friendly messages', () => {
    expect(validatePasswordMatchAndStrength('', '')).toBe('Please enter a new password.');
    expect(validatePasswordMatchAndStrength('StrongPass#2026', 'Mismatch#2026')).toBe(
      "Your passwords don't match.",
    );
    expect(validatePasswordMatchAndStrength('StrongPass#2026', 'StrongPass#2026')).toBeNull();
  });

  it('handles 6-digit OTP typing, auto-advance, full paste, spaces, and clearing cleanly', () => {
    // Typing single digit advances focus
    expect(applyOtpInputChange('', 0, '4')).toEqual({ nextValue: '4', nextFocusIndex: 1 });
    expect(applyOtpInputChange('4', 1, '8')).toEqual({ nextValue: '48', nextFocusIndex: 2 });

    // Full 6-digit paste (even with spaces or while cell 0 had a digit)
    expect(applyOtpInputChange('', 0, '482 910')).toEqual({
      nextValue: '482910',
      nextFocusIndex: 5,
    });
    expect(applyOtpInputChange('9', 0, '9482910')).toEqual({
      nextValue: '482910',
      nextFocusIndex: 5,
    });

    // Clearing a cell
    expect(applyOtpInputChange('482910', 2, '')).toEqual({
      nextValue: '48910',
      nextFocusIndex: 2,
    });
  });
});
