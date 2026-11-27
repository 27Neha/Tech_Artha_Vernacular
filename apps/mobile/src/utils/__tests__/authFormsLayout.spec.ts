/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';

const mobileRoot = join(__dirname, '../../..');

describe('Auth forms, Email OTP Forgot Password & layout contracts', () => {
  it('places TermsConsentBlock directly before primary CTAs and includes KeyboardAvoidingView & ForgotPassword link in LoginScreen', () => {
    const loginSrc = readFileSync(join(mobileRoot, 'src/screens/LoginScreen.tsx'), 'utf8');
    const termsIdx = loginSrc.indexOf('<TermsConsentBlock');
    const pwdCtaIdx = loginSrc.indexOf('testID="login-password-submit"');
    const emailCtaIdx = loginSrc.indexOf('testID="login-email-continue"');
    const smsCtaIdx = loginSrc.indexOf('testID="login-sms-continue"');

    expect(termsIdx).toBeGreaterThan(-1);
    expect(pwdCtaIdx).toBeGreaterThan(termsIdx);
    expect(emailCtaIdx).toBeGreaterThan(termsIdx);
    expect(smsCtaIdx).toBeGreaterThan(termsIdx);

    expect(loginSrc).toContain('<KeyboardAvoidingView');
    expect(loginSrc).toContain('ForgotPassword');
    expect(loginSrc).toContain("type: 'TERMS_AND_CONDITIONS'");
  });

  it('places TermsConsentBlock directly before Continue CTAs, persists consent, and uses strong password checks in SignupScreen', () => {
    const signupSrc = readFileSync(join(mobileRoot, 'src/screens/SignupScreen.tsx'), 'utf8');
    const termsIdx = signupSrc.indexOf('<TermsConsentBlock');
    const emailCtaIdx = signupSrc.indexOf('testID="signup-email-continue"');
    const smsCtaIdx = signupSrc.indexOf('testID="signup-sms-continue"');

    expect(termsIdx).toBeGreaterThan(-1);
    expect(emailCtaIdx).toBeGreaterThan(termsIdx);
    expect(smsCtaIdx).toBeGreaterThan(termsIdx);

    expect(signupSrc).toContain('<KeyboardAvoidingView');
    expect(signupSrc).toContain("type: 'TERMS_AND_CONDITIONS'");
    expect(signupSrc).toContain('validatePasswordMatchAndStrength');
  });

  it('implements Email OTP ForgotPasswordScreen (no reset links, no AsyncStorage auth storage) cleanly in App.tsx', () => {
    const forgotSrc = readFileSync(
      join(mobileRoot, 'src/screens/ForgotPasswordScreen.tsx'),
      'utf8',
    );
    const appSrc = readFileSync(join(mobileRoot, 'App.tsx'), 'utf8');

    expect(forgotSrc).toContain('<Header');
    expect(forgotSrc).toContain('<KeyboardAvoidingView');
    expect(forgotSrc).toContain('<ResetOtpInput');
    expect(forgotSrc).toContain('/auth/forgot-password');
    expect(forgotSrc).toContain('/auth/verify-password-reset-otp');
    expect(forgotSrc).toContain('/auth/reset-password');
    expect(forgotSrc).toContain('Forgot Password?');
    expect(forgotSrc).toContain('Verify Your Email');
    expect(forgotSrc).toContain('Create New Password');
    expect(forgotSrc).toContain('Password Updated!');
    expect(forgotSrc).not.toMatch(/import.*AsyncStorage|AsyncStorage\./);
    expect(forgotSrc).not.toMatch(/import.*SafeAreaView|<SafeAreaView/);
    expect(forgotSrc).not.toContain('techartha://');

    expect(appSrc).toContain('<Stack.Screen name="ForgotPassword"');
    expect(appSrc).not.toContain('ResetPasswordScreen');
  });
});
