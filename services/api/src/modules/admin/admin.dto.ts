import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class AdminLoginDto {
  @IsNotEmpty()
  @IsString()
  email!: string;

  @IsNotEmpty()
  @IsString()
  password!: string;
}

export class UpdateKycStatusDto {
  @IsOptional()
  @IsString()
  overallStatus?: string;

  @IsOptional()
  @IsBoolean()
  manualReviewRequired?: boolean;

  @IsOptional()
  @IsString()
  failureReason?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateSupportTicketDto {
  @IsNotEmpty()
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
