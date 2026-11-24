/**
 * The values Cybrilla accepts for the investor's own declarations, from the investor
 * profile, email address and phone number API references.
 *
 * Every one of these is the investor's answer. None may be defaulted: a value filled in
 * for everyone is a declaration the investor never made (Cybrilla compliance point 11).
 */

/** `belongs_to` on email_addresses and phone_numbers: whose contact detail this is. */
export const BELONGS_TO = [
  'self',
  'spouse',
  'dependent_children',
  'dependent_siblings',
  'dependent_parents',
  'guardian',
  'pms',
  'custodian',
  'poa',
] as const;

export const OCCUPATIONS = [
  'business',
  'professional',
  'retired',
  'house_wife',
  'student',
  'public_sector_service',
  'private_sector_service',
  'government_service',
  'agriculture',
  'doctor',
  'forex_dealer',
  'service',
  'others',
] as const;

export const INCOME_SLABS = [
  'upto_1lakh',
  'above_1lakh_upto_5lakh',
  'above_5lakh_upto_10lakh',
  'above_10lakh_upto_25lakh',
  'above_25lakh_upto_1cr',
  'above_1cr',
] as const;

export const SOURCES_OF_WEALTH = [
  'salary',
  'business',
  'gift',
  'ancestral_property',
  'rental_income',
  'prize_money',
  'royalty',
  'others',
] as const;

export const PEP_DETAILS = ['pep_exposed', 'pep_related', 'not_applicable'] as const;

/** Bank account types offered in the app. NRE/NRO are for non-residents, who are not supported. */
export const BANK_ACCOUNT_TYPES = ['savings', 'current'] as const;
