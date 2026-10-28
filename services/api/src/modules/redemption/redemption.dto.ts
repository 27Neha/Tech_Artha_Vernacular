import { IsBoolean, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateRedemptionDto {
  /** Second-factor authorisation. See TwoFactorService. */
  @IsString()
  @IsOptional()
  challengeId?: string;

  @IsString()
  @IsOptional()
  otp?: string;

  /** The investor ticked the consent statement shown with the code. See TwoFactorService. */
  @IsBoolean()
  @IsOptional()
  transactionConsent?: boolean;

  @IsString()
  @MinLength(6)
  folioNumber: string;

  /** ISIN of the scheme being redeemed, as returned by GET /redemptions/holdings. */
  @IsString()
  @MinLength(12)
  schemeIsin: string;

  /** Rupee value to withdraw. Mutually exclusive with units and fullExit. */
  @IsNumber()
  @Min(1)
  @IsOptional()
  amount?: number;

  @IsNumber()
  @Min(0.001)
  @IsOptional()
  units?: number;

  /** Exit the whole holding. Sent to the gateway as the folio's full unit balance. */
  @IsBoolean()
  @IsOptional()
  fullExit?: boolean;
}
