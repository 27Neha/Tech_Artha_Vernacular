/**
 * Mobile numbers in the TechArtha Zoho org are stored inconsistently. The Contacts that
 * were bulk-imported on 2026-07-27 carry a mix of E.164 and bare local forms:
 *
 *   +919920422889     7738008563     8999133486
 *
 * AuthService.normalizeMobile, meanwhile, always stores +91XXXXXXXXXX. Comparing raw
 * strings would therefore miss every bare-format record and create a duplicate CRM
 * contact for a client who is already there - the one outcome the sync must never
 * produce. Every comparison goes through the 10-digit form instead.
 */

/**
 * Reduces any Indian mobile representation to its 10 significant digits, or null when
 * the input is not a usable number. Handles +91, 91, 0091 and 0-prefixed spellings.
 */
export function toLocalMobile(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '').replace(/^0+/, '');
  const last10 = digits.length > 10 ? digits.slice(-10) : digits;
  // Deliberately mirrors AuthService.normalizeMobile's /^\d{10}$/ rather than the
  // stricter [6-9] prefix rule: anything the app accepted must stay matchable here.
  return /^\d{10}$/.test(last10) ? last10 : null;
}

/** The canonical form written back to Zoho, matching what the app stores. */
export function toE164Mobile(value: string | null | undefined): string | null {
  const local = toLocalMobile(value);
  return local ? `+91${local}` : null;
}

/** True when two values refer to the same subscriber, whatever their formatting. */
export function isSameMobile(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = toLocalMobile(a);
  return left !== null && left === toLocalMobile(b);
}

/**
 * The spellings a stored Zoho value might plausibly take for one subscriber. COQL has
 * no normalising function, so a lookup has to ask for each candidate explicitly.
 * Every element is digits-only by construction, which keeps them safe to interpolate.
 */
export function mobileQueryCandidates(value: string | null | undefined): string[] {
  const local = toLocalMobile(value);
  if (!local) return [];
  return [`+91${local}`, local, `91${local}`, `0${local}`];
}
