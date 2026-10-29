import { BadRequestException } from '@nestjs/common';
import { NomineeService } from './nominee.service';

/**
 * The pure rules, reached through the prototype so the test does not need Prisma.
 *
 * These are the parts where being wrong is expensive rather than merely annoying: a
 * nomination that does not total 100% is not executable by the registrar, a minor
 * without a guardian cannot receive units, and a nominee's PAN belongs to a third party
 * who never consented to it being echoed back to someone's phone in full.
 */
const svc = NomineeService.prototype as any;

describe('NomineeService allocation rules', () => {
  const fits = (allocatedByOthers: number, requested: number) =>
    svc.assertAllocationFits.call(null, allocatedByOthers, requested);

  it.each([
    [0, 100],
    [0, 1],
    [60, 40],
    [99, 1],
  ])('accepts %i%% already allocated plus %i%%', (others, requested) => {
    expect(() => fits(others, requested)).not.toThrow();
  });

  it.each([
    [60, 60],
    [100, 1],
    [1, 100],
  ])('refuses %i%% already allocated plus %i%%', (others, requested) => {
    expect(() => fits(others, requested)).toThrow(BadRequestException);
  });

  it('says how much is left rather than only that it failed', () => {
    expect(() => fits(60, 60)).toThrow(/40% left to allocate/);
  });

  it('tells a fully-allocated investor to reduce an existing share', () => {
    // "0% left" would be true but useless - there is no way forward from it.
    expect(() => fits(100, 10)).toThrow(/Reduce an existing allocation/);
  });
});

describe('NomineeService.isMinor', () => {
  const isMinor = (dob: string, now: string) =>
    svc.isMinor.call(null, new Date(`${dob}T00:00:00.000Z`), new Date(`${now}T00:00:00.000Z`)) as boolean;

  it.each([
    ['2015-03-10', '2026-10-16', true],
    ['2008-10-17', '2026-10-16', true],
    ['2008-10-16', '2026-10-16', false],
    ['2008-10-15', '2026-10-16', false],
    ['1992-08-15', '2026-10-16', false],
  ])('born %s, on %s minor=%s', (dob, now, expected) => {
    expect(isMinor(dob, now)).toBe(expected);
  });

  it('turns 18 on the birthday, not a day either side', () => {
    // Counted in whole years off the calendar rather than via 365.25-day arithmetic,
    // which drifts for anyone born on 29 February.
    expect(isMinor('2008-02-29', '2026-02-28')).toBe(true);
    expect(isMinor('2008-02-29', '2026-03-01')).toBe(false);
  });
});

describe('NomineeService identity proof handling', () => {
  const normalize = (dto: Record<string, unknown>) => svc.normalizeProofNumber.call(null, dto) as string | null;

  it('uppercases a PAN so storage is canonical', () => {
    expect(normalize({ identityProofType: 'pan', identityProofNumber: ' abcde1234f ' })).toBe('ABCDE1234F');
  });

  it('validates a spaced Aadhaar but keeps only its last four digits', () => {
    // The gateway takes the last four; a third party's full Aadhaar is not stored.
    expect(normalize({ identityProofType: 'aadhaar', identityProofNumber: '1234 5678 9012' })).toBe('9012');
  });

  it.each([
    ['pan', 'ABCD1234F'],
    ['pan', 'ABCDE1234'],
    ['aadhaar', '12345'],
    ['aadhaar', '12345678901a'],
  ])('rejects a malformed %s: %s', (type, value) => {
    expect(() => normalize({ identityProofType: type, identityProofNumber: value })).toThrow(BadRequestException);
  });

  it('returns null when no proof was given, since it is optional', () => {
    expect(normalize({ identityProofType: 'pan', identityProofNumber: '   ' })).toBeNull();
    expect(normalize({})).toBeNull();
  });

  it('refuses a number with no stated document type', () => {
    expect(() => normalize({ identityProofNumber: 'ABCDE1234F' })).toThrow(BadRequestException);
  });
});

describe('NomineeService.present', () => {
  const base = {
    id: 'n1',
    fullName: 'Priya Walunj',
    relationship: 'spouse',
    dateOfBirth: new Date('1992-08-15T00:00:00.000Z'),
    allocationPercentage: 60,
    identityProofType: 'pan',
    identityProofNumber: 'ABCDE1234F',
    guardianName: null,
    guardianRelationship: null,
    fpSyncStatus: 'NOT_SUPPORTED',
  };

  it('never returns the full identity number', () => {
    const out = svc.present.call(svc, base);
    expect(out.identityProofMasked).toBe('••••••234F');
    expect(JSON.stringify(out)).not.toContain('ABCDE1234F');
  });

  it('leaves the mask null when there is nothing to mask', () => {
    expect(svc.present.call(svc, { ...base, identityProofNumber: null }).identityProofMasked).toBeNull();
  });

  it('only claims AMC registration once the gateway has accepted it', () => {
    // The whole point of fpSyncStatus: an investor must not be shown "registered" for a
    // nomination that exists only in our database.
    expect(svc.present.call(svc, base).registeredWithAmc).toBe(false);
    expect(svc.present.call(svc, { ...base, fpSyncStatus: 'SYNCED' }).registeredWithAmc).toBe(true);
  });
});

describe('NomineeService.parseDateOfBirth', () => {
  const parse = (value: string) => svc.parseDateOfBirth.call(null, value) as Date;

  it('reads an ISO date as UTC midnight', () => {
    expect(parse('1992-08-15').toISOString()).toBe('1992-08-15T00:00:00.000Z');
  });

  it('rejects a future date of birth', () => {
    const nextYear = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    expect(() => parse(nextYear)).toThrow(BadRequestException);
  });

  it('rejects a date that does not exist', () => {
    expect(() => parse('2015-13-45')).toThrow(BadRequestException);
  });
});
