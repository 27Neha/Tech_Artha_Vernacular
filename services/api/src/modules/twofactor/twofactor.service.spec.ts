import { TwoFactorService } from './twofactor.service';
import type { TransactionPayload } from './twofactor.service';

/**
 * The fingerprint is what makes this a second factor rather than a formality: it is what
 * stops a code issued for one transaction from authorising another. It is computed twice
 * - when the code is sent and when the transaction runs - so it must be stable for an
 * unchanged request and different for anything that changes the money.
 */
const svc = new TwoFactorService(null as never, null as never);
const fp = (p: Partial<TransactionPayload>) => svc.fingerprint({ action: 'PURCHASE', ...p } as TransactionPayload);

describe('TwoFactorService.fingerprint stability', () => {
  it('is identical for the same transaction described twice', () => {
    const a = fp({ amount: 500, schemeIsin: 'INF109K01605', bucketId: 'balanced' });
    const b = fp({ amount: 500, schemeIsin: 'INF109K01605', bucketId: 'balanced' });
    expect(a).toBe(b);
  });

  it('treats 500 and 500.00 as the same amount', () => {
    // Otherwise a client that sends 500.00 where it first sent 500 would be told its
    // details changed, for a transaction that is identical.
    expect(fp({ amount: 500 })).toBe(fp({ amount: 500.0 }));
  });

  it('ignores case and surrounding space in identifiers', () => {
    expect(fp({ schemeIsin: 'inf109k01605' })).toBe(fp({ schemeIsin: '  INF109K01605 ' }));
  });

  it('does not depend on the order keys are written in', () => {
    const a = svc.fingerprint({ action: 'PURCHASE', amount: 500, bucketId: 'balanced' } as TransactionPayload);
    const b = svc.fingerprint({ bucketId: 'balanced', amount: 500, action: 'PURCHASE' } as TransactionPayload);
    expect(a).toBe(b);
  });
});

describe('TwoFactorService.fingerprint separation', () => {
  const base = { amount: 500, schemeIsin: 'INF109K01605', folioNumber: '12345678' };

  it.each([
    ['a larger amount', { ...base, amount: 50000 }],
    ['a different scheme', { ...base, schemeIsin: 'INF109KC19T7' }],
    ['a different folio', { ...base, folioNumber: '99999999' }],
    ['a different bucket', { ...base, bucketId: 'growth' }],
    ['a different frequency', { ...base, frequency: 'daily' }],
    ['a different instalment count', { ...base, numberOfInstallments: 24 }],
    ['a full exit instead of an amount', { ...base, fullExit: true }],
  ])('differs for %s', (_label, changed) => {
    expect(fp(changed)).not.toBe(fp(base));
  });

  it('differs across actions even with identical figures', () => {
    // A purchase code must never authorise a redemption of the same size.
    const purchase = svc.fingerprint({ action: 'PURCHASE', amount: 500 } as TransactionPayload);
    const redemption = svc.fingerprint({ action: 'REDEMPTION', amount: 500 } as TransactionPayload);
    const sip = svc.fingerprint({ action: 'SIP', amount: 500 } as TransactionPayload);
    expect(new Set([purchase, redemption, sip]).size).toBe(3);
  });

  it('does not confuse an amount with a unit count', () => {
    // Fields are positional in the canonical string, so an absent field has to occupy
    // its slot; otherwise {amount: 1} and {units: 1} would collide.
    expect(fp({ amount: 1 })).not.toBe(fp({ units: 1 }));
  });

  it('distinguishes a full exit from an equivalent unit redemption', () => {
    const full = svc.fingerprint({ action: 'REDEMPTION', folioNumber: 'F1', fullExit: true } as TransactionPayload);
    const units = svc.fingerprint({ action: 'REDEMPTION', folioNumber: 'F1', units: 10 } as TransactionPayload);
    expect(full).not.toBe(units);
  });

  it('never returns the parameters themselves', () => {
    // It is stored in a row an operator can read; it must not disclose the transaction.
    const out = fp({ amount: 500, folioNumber: '12345678' });
    expect(out).toMatch(/^[a-f0-9]{64}$/);
    expect(out).not.toContain('12345678');
  });
});

describe('TwoFactorService.describe', () => {
  it('states the amount being invested, so the code is not opaque', () => {
    expect(svc.describe({ action: 'PURCHASE', amount: 500 } as TransactionPayload)).toContain('Rs.500.00');
  });

  it('names the folio for a withdrawal', () => {
    const text = svc.describe({ action: 'REDEMPTION', amount: 500, folioNumber: 'F1' } as TransactionPayload);
    expect(text).toContain('withdrawal');
    expect(text).toContain('F1');
  });

  it('says a full withdrawal is full rather than quoting a figure', () => {
    const text = svc.describe({ action: 'REDEMPTION', fullExit: true, folioNumber: 'F1' } as TransactionPayload);
    expect(text).toContain('full withdrawal');
  });

  it('includes the frequency of a SIP', () => {
    expect(svc.describe({ action: 'SIP', amount: 1000, frequency: 'monthly' } as TransactionPayload)).toContain('monthly');
  });
});
