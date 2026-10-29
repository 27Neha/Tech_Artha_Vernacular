import { KycService, describeKycFailure } from './kyc.service';

/**
 * Readiness is what decides whether the gateway will accept an order. A PAN, name and
 * date of birth that all match are not enough: an investor whose KYC is incomplete at
 * the KRA has every order failed with pan_kyc_incomplete.
 */
const evaluate = (result: unknown) => (KycService.prototype as any).evaluateVerification.call(null, result);

const verified = { status: 'verified', code: null, reason: null };
const completed = (overrides: Record<string, unknown> = {}) => ({
  status: 'completed',
  readiness: verified,
  pan: verified,
  name: verified,
  date_of_birth: verified,
  ...overrides,
});

describe('KycService.evaluateVerification', () => {
  it('is VERIFIED only when readiness and all identity checks pass', () => {
    expect(evaluate(completed())).toMatchObject({ overallStatus: 'VERIFIED', readinessStatus: 'VERIFIED', panStatus: 'VERIFIED' });
  });

  it('is FAILED when the PAN is valid but KYC is incomplete at the KRA', () => {
    const result = evaluate(completed({ readiness: { status: 'failed', code: 'kyc_incomplete', reason: 'x' } }));
    expect(result).toMatchObject({ overallStatus: 'FAILED', panStatus: 'VERIFIED', readinessStatus: 'FAILED', readinessCode: 'kyc_incomplete' });
  });

  it('is FAILED when readiness passes but the name does not match', () => {
    expect(evaluate(completed({ name: { status: 'failed', code: 'mismatch' } })).overallStatus).toBe('FAILED');
  });

  it('stays IN_PROGRESS until the pre-verification completes', () => {
    expect(evaluate({ status: 'accepted' })).toMatchObject({ overallStatus: 'IN_PROGRESS', readinessStatus: 'PENDING' });
  });

  it('records the failure codes, not the gateway prose', () => {
    const result = evaluate(completed({ pan: { status: 'failed', code: 'aadhaar_not_linked', reason: 'long text' } }));
    expect(result.failureReason).toBe('pan: aadhaar_not_linked');
  });
});

describe('describeKycFailure', () => {
  it('explains a readiness failure first, since it needs action outside the app', () => {
    expect(describeKycFailure('kyc_underprocess', 'readiness: kyc_underprocess; name: mismatch')).toMatch(/still being validated/);
  });

  it('explains an identity mismatch', () => {
    expect(describeKycFailure(null, 'date_of_birth: mismatch')).toMatch(/date of birth does not match/);
    expect(describeKycFailure(null, 'pan: aadhaar_not_linked')).toMatch(/not linked to Aadhaar/);
  });

  it('says to retry on an upstream error', () => {
    expect(describeKycFailure(null, 'pan: upstream_error')).toMatch(/try again/);
  });

  it('says nothing when there is nothing wrong', () => {
    expect(describeKycFailure(null, null)).toBeNull();
  });
});
