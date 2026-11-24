export interface PasswordChecks {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

export function normalizeEmailInput(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmailFormat(email: string): boolean {
  const normalized = normalizeEmailInput(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized);
}

/**
 * Masks an email address so full addresses are not unnecessarily displayed on OTP screens
 * (e.g. "investor@techartha.com" -> "in***r@techartha.com").
 */
export function maskEmailAddress(email: string): string {
  const normalized = normalizeEmailInput(email);
  const atIdx = normalized.indexOf('@');
  if (atIdx <= 0) return '';
  const local = normalized.slice(0, atIdx);
  const domain = normalized.slice(atIdx + 1);
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 2)}${'*'.repeat(Math.min(4, Math.max(2, local.length - 3)))}${local.slice(-1)}@${domain}`;
}

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function isPasswordStrong(password: string): boolean {
  const checks = getPasswordChecks(password);
  return (
    checks.minLength &&
    checks.uppercase &&
    checks.lowercase &&
    checks.number &&
    checks.special
  );
}

export function validatePasswordMatchAndStrength(
  password: string,
  confirmPassword: string,
): string | null {
  if (!password) {
    return 'Please enter a new password.';
  }
  if (!isPasswordStrong(password)) {
    return 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';
  }
  if (password !== confirmPassword) {
    return "Your passwords don't match.";
  }
  return null;
}

/**
 * Computes the next 6-digit OTP string and focus index for a segmented OTP input,
 * supporting single-digit entry, full-code paste (with or without spaces),
 * replacement when typing inside an already-filled cell, and clearing.
 */
export function applyOtpInputChange(
  currentValue: string,
  cellIndex: number,
  rawInput: string,
  length = 6,
): { nextValue: string; nextFocusIndex: number } {
  const slots = Array.from({ length }, (_, idx) => currentValue[idx] || '');
  const digitsOnly = (rawInput ?? '').replace(/\D/g, '');

  if (!digitsOnly) {
    slots[cellIndex] = '';
    return {
      nextValue: slots.join(''),
      nextFocusIndex: cellIndex,
    };
  }

  // Full code paste or autofill
  if (digitsOnly.length >= length) {
    const existing = slots[cellIndex];
    const sliced =
      existing && digitsOnly.startsWith(existing) && digitsOnly.length === length + 1
        ? digitsOnly.slice(1, length + 1)
        : digitsOnly.slice(0, length);
    return {
      nextValue: sliced,
      nextFocusIndex: length - 1,
    };
  }

  // User typed while focused cell already held 1 digit -> keep existing or advance newly typed digit
  if (digitsOnly.length === 2 && slots[cellIndex]) {
    const existing = slots[cellIndex];
    const typed = digitsOnly[0] === existing ? digitsOnly[1] : digitsOnly[0];
    if (cellIndex < length - 1) {
      slots[cellIndex + 1] = typed;
      return {
        nextValue: slots.join(''),
        nextFocusIndex: Math.min(length - 1, cellIndex + 2),
      };
    }
    slots[cellIndex] = typed;
    return {
      nextValue: slots.join(''),
      nextFocusIndex: cellIndex,
    };
  }

  // Partial paste (2-5 digits) starting at focused cell
  if (digitsOnly.length > 1) {
    let cursor = cellIndex;
    for (const ch of digitsOnly) {
      if (cursor >= length) break;
      slots[cursor] = ch;
      cursor++;
    }
    return {
      nextValue: slots.join(''),
      nextFocusIndex: Math.min(length - 1, cursor),
    };
  }

  // Standard single digit typed
  slots[cellIndex] = digitsOnly;
  return {
    nextValue: slots.join(''),
    nextFocusIndex: Math.min(length - 1, cellIndex + 1),
  };
}
