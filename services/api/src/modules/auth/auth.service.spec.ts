import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Replaces a `should be defined` stub that could not construct the service.
 *
 * normalizeMobile is the single most consequential pure function in the auth module:
 * it is applied to every /auth/send-otp and /auth/verify-otp request, BEFORE the
 * channel is even inspected. That ordering is why email OTP cannot work - an email
 * address has no ten digits, so it is rejected before EmailOtpProvider is reached.
 * These tests pin the current behaviour so that fixing email is a deliberate change
 * rather than an accident.
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

  it('rejects an email address, which is why the EMAIL channel cannot work', () => {
    // Documented, not endorsed. sendOtp calls this before branching on channel, so an
    // EMAIL request dies here with "Enter a valid 10-digit Indian mobile number".
    expect(() => normalize('support@techartha.com')).toThrow(BadRequestException);
  });
});
