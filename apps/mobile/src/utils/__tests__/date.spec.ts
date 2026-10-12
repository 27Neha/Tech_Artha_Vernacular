import { formatDobInput, isValidDob } from '../date';

/**
 * The date field was the most common reason KYC validation failed: the server requires
 * YYYY-MM-DD, and users typed hyphens by hand or entered DD/MM/YYYY. These tests pin
 * the auto-formatting and, importantly, that a plausible-looking but invalid date is
 * still rejected.
 */
describe('formatDobInput', () => {
  it.each([
    ['', ''],
    ['1', '1'],
    ['1990', '1990'],
    ['19900', '1990-0'],
    ['199004', '1990-04'],
    ['1990042', '1990-04-2'],
    ['19900423', '1990-04-23'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatDobInput(input)).toBe(expected);
  });

  it('is idempotent, so re-editing an already formatted value is stable', () => {
    expect(formatDobInput('1990-04-23')).toBe('1990-04-23');
    expect(formatDobInput(formatDobInput('19900423'))).toBe('1990-04-23');
  });

  it('strips any non-digit the user types or pastes', () => {
    expect(formatDobInput('1990/04/23')).toBe('1990-04-23');
    expect(formatDobInput('23 Apr 1990')).toBe('2319-90');
  });

  it('caps at 8 digits so a long paste cannot overflow the field', () => {
    expect(formatDobInput('1990042319900423')).toBe('1990-04-23');
  });

  it('turns a DD/MM/YYYY entry into something the validity check will reject', () => {
    // 23/04/1990 becomes 2304-19-90: right shape, impossible date. This is why
    // formatting alone is not enough and isValidDob exists.
    const formatted = formatDobInput('23/04/1990');
    expect(formatted).toBe('2304-19-90');
    expect(isValidDob(formatted)).toBe(false);
  });
});

describe('isValidDob', () => {
  it('accepts a real past date', () => {
    expect(isValidDob('1990-04-23')).toBe(true);
  });

  it.each([
    ['wrong shape', '23-04-1990'],
    ['incomplete', '1990-04'],
    ['month 19', '2304-19-90'],
    ['month 00', '1990-00-10'],
    ['day 00', '1990-04-00'],
    ['31 February', '2024-02-31'],
    ['31 April', '1990-04-31'],
    ['empty', ''],
  ])('rejects %s', (_label, value) => {
    expect(isValidDob(value)).toBe(false);
  });

  it('rejects a future date', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    expect(isValidDob(future)).toBe(false);
  });

  it('accepts a leap day in an actual leap year', () => {
    expect(isValidDob('2024-02-29')).toBe(true);
    expect(isValidDob('2023-02-29')).toBe(false);
  });
});
