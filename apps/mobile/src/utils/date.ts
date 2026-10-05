/**
 * Keeps a date-of-birth field in YYYY-MM-DD as the user types, inserting the hyphens.
 *
 * Shared because it was copied into three screens (KYC, Edit Profile, Minor Guardian)
 * and the server rejects anything that is not YYYY-MM-DD. Typing hyphens by hand on a
 * phone keypad was the most common reason KYC validation failed - the web form avoids
 * the problem entirely with <input type="date">.
 */
export function formatDobInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/** True when the value is a real, non-future calendar date in YYYY-MM-DD form. */
export function isValidDob(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  // Guards against rolled-over dates like 2024-02-31, which Date silently accepts.
  if (parsed.toISOString().slice(0, 10) !== value) return false;
  return parsed <= new Date();
}
