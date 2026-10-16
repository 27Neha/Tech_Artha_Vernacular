import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Relationships the AMC registrars accept on a nomination form. Free text is rejected
 * because the value is eventually sent to the gateway, which validates against its own
 * enum - catching it here gives the investor a usable message instead of a 400 from
 * three systems away.
 */
export const NOMINEE_RELATIONSHIPS = [
  'spouse',
  'son',
  'daughter',
  'father',
  'mother',
  'brother',
  'sister',
  'grandson',
  'granddaughter',
  'grandfather',
  'grandmother',
  'other',
] as const;

export class UpsertNomineeDto {
  @IsString()
  @MinLength(3)
  fullName: string;

  @IsIn(NOMINEE_RELATIONSHIPS as unknown as string[])
  relationship: string;

  /** ISO yyyy-mm-dd. Used to decide whether a guardian is required. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Enter the date of birth as YYYY-MM-DD.' })
  dateOfBirth: string;

  @IsInt()
  @Min(1)
  @Max(100)
  allocationPercentage: number;

  @IsIn(['pan', 'aadhaar'])
  @IsOptional()
  identityProofType?: 'pan' | 'aadhaar';

  @IsString()
  @IsOptional()
  identityProofNumber?: string;

  @IsString()
  @MinLength(3)
  @IsOptional()
  guardianName?: string;

  @IsIn(NOMINEE_RELATIONSHIPS as unknown as string[])
  @IsOptional()
  guardianRelationship?: string;
}
