import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Replaces a `should be defined` stub that could not construct the service.
 *
 * normalizeMobile is the single most consequential pure function in the auth module:
 * it is applied to every /auth/send-otp and /auth/verify-otp request, BEFORE the
 * channel is even inspected. These tests pin that behaviour, including its rejection of
 * anything that is not a ten-digit Indian mobile number.
 */
describe('AuthService.normalizeMobile', () => {
  // Reaching the private method directly: it has no dependencies, and constructing the
  // full service would need Prisma, JWT and Interakt for no benefit.
  const normalize = (value: string) =>
    (AuthService.prototype as any).normalizeMobile.call(null, value) as string;

  it.each([
    ['9604610660', '+919604610660'],
    ['+919604610660', '+919604610660'],
    ['919604610660', '+919604610660'],
    ['96046 10660', '+919604610660'],
    ['+91 96046-10660', '+919604610660'],
  ])('normalises %s to %s', (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });

  it.each([
    ['too short', '96046'],
    ['too long', '96046106601234'],
    ['empty', ''],
    ['letters only', 'not-a-number'],
  ])('rejects %s', (_label, input) => {
    expect(() => normalize(input)).toThrow(BadRequestException);
  });

  it('rejects an email address', () => {
    // Which is why email verification has its own routes (/auth/email/send-otp and
    // /auth/email/verify-otp) going through normalizeEmail, rather than reusing
    // /auth/send-otp with channel: 'EMAIL' - that request would die here.
    expect(() => normalize('support@techartha.com')).toThrow(BadRequestException);
  });
});

/**
 * The email counterpart, used by both /auth/email/send-otp and /auth/email/verify-otp.
 *
 * Normalisation matters more here than it looks: the OTP is stored keyed by the
 * normalised address and looked up by it again on verify, so if the two calls disagreed
 * about casing or whitespace every verification would fail with a correct code. The
 * lowercasing is also what makes the User.email unique index meaningful - without it,
 * Foo@x.com and foo@x.com could both be verified against different accounts.
 */
describe('AuthService.normalizeEmail', () => {
  const normalize = (value: string) =>
    (AuthService.prototype as any).normalizeEmail.call(null, value) as string;

  it.each([
    ['swapna.walunj@chandrakamal.com', 'swapna.walunj@chandrakamal.com'],
    ['  Swapna.Walunj@Chandrakamal.com  ', 'swapna.walunj@chandrakamal.com'],
    ['USER+tag@example.co.in', 'user+tag@example.co.in'],
  ])('normalises %s to %s', (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });

  it.each([
    ['empty', ''],
    ['no @', 'nobody.example.com'],
    ['no domain', 'nobody@'],
    ['no local part', '@example.com'],
    ['no dot in domain', 'nobody@example'],
    ['single-character TLD', 'nobody@example.c'],
    ['two @ signs', 'a@b@example.com'],
    ['internal whitespace', 'no body@example.com'],
  ])('rejects %s', (_label, input) => {
    expect(() => normalize(input)).toThrow(BadRequestException);
  });

  it('is idempotent, so storing then looking up an OTP agrees on the key', () => {
    const once = normalize('  Swapna.Walunj@Chandrakamal.com ');
    expect(normalize(once)).toBe(once);
  });

  it('tolerates a missing value rather than throwing TypeError', () => {
    // The DTO should prevent this, but a BadRequestException is a 400 while a
    // TypeError on undefined.trim() would be a 500.
    expect(() => normalize(undefined as unknown as string)).toThrow(BadRequestException);
  });
});
