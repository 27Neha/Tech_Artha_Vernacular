import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RequestTransactionOtpDto {
  @IsIn(['PURCHASE', 'REDEMPTION', 'SIP'])
  action: 'PURCHASE' | 'REDEMPTION' | 'SIP';

  @IsNumber()
  @Min(1)
  @IsOptional()
  amount?: number;

  @IsNumber()
  @IsOptional()
  units?: number;

  @IsString()
  @IsOptional()
  schemeIsin?: string;

  @IsString()
  @IsOptional()
  folioNumber?: string;

  @IsString()
  @IsOptional()
  bucketId?: string;

  @IsString()
  @IsOptional()
  frequency?: string;

  @IsNumber()
  @IsOptional()
  numberOfInstallments?: number;

  @IsBoolean()
  @IsOptional()
  fullExit?: boolean;

  @IsIn(['SMS', 'WHATSAPP', 'EMAIL'])
  @IsOptional()
  channel?: 'SMS' | 'WHATSAPP' | 'EMAIL';
}

/**
 * Mixed into every transaction DTO. Both fields are optional at the validation layer so
 * the service can reject a missing authorisation with a message about 2FA, rather than
 * class-validator returning "challengeId should not be empty", which tells the investor
 * nothing about what to do.
 */
export class TransactionAuthorisationFields {
  @IsString()
  @IsOptional()
  challengeId?: string;

  @IsString()
  @IsOptional()
  otp?: string;
}
