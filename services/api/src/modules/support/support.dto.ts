import { IsOptional, IsString } from 'class-validator';

export class CreateSupportQueryDto {
  @IsString()
  subject: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  channel?: string;
}

export interface SupportQueryResponseDto {
  id: string;
  referenceId: string;
  subject: string;
  message: string;
  status: string;
  rawStatus: string;
  createdAt: string;
  updatedAt: string;
  emailSent: boolean;
  recipientEmail: string | null;
  isDuplicate?: boolean;
  acknowledgementMessage: string;
  emailDeliveryError?: string | null;
  channel?: string;
  lastCustomerMessage?: string | null;
  lastAgentReply?: string | null;
  assignedAgentName?: string | null;
  freshdeskTicketId?: string | null;
}
