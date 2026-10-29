import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsEmail,
  IsArray,
  IsNumber,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';

export class AdminLoginDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  password!: string;
}

export class InviteTeamMemberDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  role!: string; // SUPER_ADMIN, ADMIN, SUPPORT, OPERATIONS, FINANCE, COMPLIANCE, ANALYST, or custom role name

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class AcceptInvitationDto {
  @IsNotEmpty()
  @IsString()
  token!: string;

  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class UpdateTeamMemberRoleDto {
  @IsNotEmpty()
  @IsString()
  role!: string;
}

export class UpdateTeamMemberStatusDto {
  @IsNotEmpty()
  @IsIn(['ACTIVE', 'SUSPENDED', 'DEACTIVATED'])
  status!: string;
}

export class CreateCustomRoleDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsArray()
  permissions?: string[]; // array of permission slugs
}

export class UpdateCustomRoleDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsArray()
  permissions?: string[];

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}

export class UpdateRolePermissionsDto {
  @IsNotEmpty()
  @IsArray()
  permissions!: string[];
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

  @IsOptional()
  @IsString()
  assignedAgentName?: string;

  @IsOptional()
  @IsString()
  assignedAgentEmail?: string;
}

export class CreateSupportReplyDto {
  @IsNotEmpty()
  @IsString()
  reply!: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

export class CreateSupportTicketDto {
  @IsNotEmpty()
  @IsString()
  subject!: string;

  @IsNotEmpty()
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  channel?: string;
}

export class UpdateSettingCategoryDto {
  @IsNotEmpty()
  settings!: Record<string, any>;
}

export class CreateOperationalTaskDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  priority?: string; // HIGH, MEDIUM, LOW

  @IsOptional()
  @IsString()
  category?: string; // KYC, BANK, MANDATE, SYSTEM, RECONCILIATION

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;
}

export class UpdateOperationalTaskDto {
  @IsOptional()
  @IsString()
  status?: string; // PENDING, IN_PROGRESS, RESOLVED, CANCELLED

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;
}
