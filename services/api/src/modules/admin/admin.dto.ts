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

export class InviteMemberDto {
  @IsNotEmpty()
  @IsString()
  email!: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  role!: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  department?: string;
}

export class UpdateMemberRoleDto {
  @IsNotEmpty()
  @IsString()
  role!: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  permissions?: string[];
}

export class ActivateMemberDto {
  @IsNotEmpty()
  @IsString()
  token!: string;

  @IsNotEmpty()
  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateAdminProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class ChangeAdminPasswordDto {
  @IsNotEmpty()
  @IsString()
  currentPassword!: string;

  @IsNotEmpty()
  @IsString()
  newPassword!: string;
}

