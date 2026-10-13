import { api } from './client';

export interface SupportQueryPayload {
  subject: string;
  message: string;
  email?: string;
  idempotencyKey?: string;
}

export interface SupportQueryResponse {
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

/**
 * Generate a client-side idempotency key to prevent accidental duplicate
 * query submissions on double-taps or rapid retries.
 */
function createIdempotencyKey(): string {
  return `mob-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const supportApi = {
  submitQuery: async (payload: SupportQueryPayload): Promise<SupportQueryResponse> => {
    const key = payload.idempotencyKey || createIdempotencyKey();
    return api.post<SupportQueryResponse>(
      '/support/queries',
      { ...payload, idempotencyKey: key },
      { headers: { 'Idempotency-Key': key } },
    );
  },

  getQueries: async (): Promise<SupportQueryResponse[]> => {
    return api.get<SupportQueryResponse[]>('/support/queries');
  },

  getQueryById: async (idOrRef: string): Promise<SupportQueryResponse> => {
    return api.get<SupportQueryResponse>(`/support/queries/${encodeURIComponent(idOrRef)}`);
  },
};
