import { IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { BANK_ACCOUNT_TYPES, INCOME_SLABS, OCCUPATIONS, PEP_DETAILS, SOURCES_OF_WEALTH } from '../cybrilla/investor-options';

export class InvestInBucketDto {
  /** Second-factor authorisation. See TwoFactorService. */
  @IsString()
  @IsOptional()
  challengeId?: string;

  @IsString()
  @IsOptional()
  otp?: string;

  /**
   * The investor ticked the consent statement shown with the code. Required for the
   * code to be accepted; optional here so the service can say what is missing.
   */
  @IsBoolean()
  @IsOptional()
  transactionConsent?: boolean;

  @IsNumber()
  @Min(100)
  amount: number;

  @IsInt()
  @Min(1)
  @Max(28)
  @IsOptional()
  installmentDay?: number;

  // Everything below is needed only for the first order, which opens the investment
  // account; later orders reuse it. Optional at validation so a returning investor is
  // not asked again, and so BucketsService can list exactly what a first order lacks.
  // None of these has a default: each is the investor's own answer (compliance point 11).

  @IsIn(['male', 'female', 'transgender'])
  @IsOptional()
  gender?: 'male' | 'female' | 'transgender';

  @IsIn(OCCUPATIONS as unknown as string[])
  @IsOptional()
  occupation?: (typeof OCCUPATIONS)[number];

  @IsIn(INCOME_SLABS as unknown as string[])
  @IsOptional()
  incomeSlab?: (typeof INCOME_SLABS)[number];

  @IsIn(SOURCES_OF_WEALTH as unknown as string[])
  @IsOptional()
  sourceOfWealth?: (typeof SOURCES_OF_WEALTH)[number];

  @IsIn(PEP_DETAILS as unknown as string[])
  @IsOptional()
  pepDetails?: (typeof PEP_DETAILS)[number];

  /** City of birth. Sent to Cybrilla as place_of_birth. */
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @IsOptional()
  placeOfBirth?: string;

  /**
   * The investor's declaration that they are an Indian citizen, born in India and a tax
   * resident of India only. This is what the profile's tax status, nationality, country
   * of birth and tax residency are set from; investors it does not describe are not
   * supported yet, rather than being enrolled on assumed values.
   */
  @IsBoolean()
  @IsOptional()
  residentIndianDeclaration?: boolean;

  /**
   * Ignored. The order is placed against the email address verified on the User record,
   * because Cybrilla requires a verified address for folio communications and a value
   * supplied in the request body cannot be one. Kept optional so older clients that
   * still send it are not rejected.
   *
   * @deprecated
   */
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(3)
  @IsOptional()
  bankAccountHolderName?: string;

  @IsString()
  @MinLength(5)
  @IsOptional()
  bankAccountNumber?: string;

  @IsString()
  @MinLength(11)
  @IsOptional()
  ifscCode?: string;

  @IsIn(BANK_ACCOUNT_TYPES as unknown as string[])
  @IsOptional()
  accountType?: (typeof BANK_ACCOUNT_TYPES)[number];

  @IsString()
  @MinLength(3)
  @IsOptional()
  addressLine1?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  postalCode?: string;
}
