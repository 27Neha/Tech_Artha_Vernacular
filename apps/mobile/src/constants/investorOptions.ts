/**
 * Answer options for the investor declarations collected when the investment account is
 * opened. Values are exactly what Cybrilla accepts (mirrored in the API's
 * investor-options.ts); labels are what the investor reads. None is pre-selected.
 */
export const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'transgender', label: 'Transgender' },
] as const;

export const OCCUPATION_OPTIONS = [
  { value: 'private_sector_service', label: 'Private sector' },
  { value: 'public_sector_service', label: 'Public sector' },
  { value: 'government_service', label: 'Government' },
  { value: 'business', label: 'Business' },
  { value: 'professional', label: 'Professional' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'house_wife', label: 'Homemaker' },
  { value: 'student', label: 'Student' },
  { value: 'retired', label: 'Retired' },
  { value: 'others', label: 'Other' },
] as const;

export const INCOME_OPTIONS = [
  { value: 'upto_1lakh', label: 'Up to ₹1L' },
  { value: 'above_1lakh_upto_5lakh', label: '₹1L – 5L' },
  { value: 'above_5lakh_upto_10lakh', label: '₹5L – 10L' },
  { value: 'above_10lakh_upto_25lakh', label: '₹10L – 25L' },
  { value: 'above_25lakh_upto_1cr', label: '₹25L – 1Cr' },
  { value: 'above_1cr', label: 'Above ₹1Cr' },
] as const;

export const WEALTH_SOURCE_OPTIONS = [
  { value: 'salary', label: 'Salary' },
  { value: 'business', label: 'Business' },
  { value: 'rental_income', label: 'Rental income' },
  { value: 'ancestral_property', label: 'Ancestral property' },
  { value: 'gift', label: 'Gift' },
  { value: 'royalty', label: 'Royalty' },
  { value: 'prize_money', label: 'Prize money' },
  { value: 'others', label: 'Other' },
] as const;

export const PEP_OPTIONS = [
  { value: 'not_applicable', label: 'Neither' },
  { value: 'pep_exposed', label: 'I am a PEP' },
  { value: 'pep_related', label: 'Related to a PEP' },
] as const;

export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'savings', label: 'Savings' },
  { value: 'current', label: 'Current' },
] as const;
