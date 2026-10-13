export class CreateSupportQueryDto {
  subject: string;
  message: string;
  email?: string;
  idempotencyKey?: string;
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
}
