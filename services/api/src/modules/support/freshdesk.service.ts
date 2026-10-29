import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface CreateFreshdeskTicketParams {
  subject: string;
  description: string;
  phone?: string;
  email?: string;
  name?: string;
  priority?: number; // 1: Low, 2: Medium, 3: High, 4: Urgent
  status?: number;   // 2: Open, 3: Pending, 4: Resolved, 5: Closed
  source?: number;   // 7: Chat, 9: Feedback Widget / WhatsApp
  customFields?: Record<string, any>;
}

export interface FreshdeskTicketResponse {
  id: number;
  subject: string;
  status: number;
  priority: number;
  description_text?: string;
  responder_id?: number | null;
  created_at: string;
  updated_at: string;
  isMock?: boolean;
}

@Injectable()
export class FreshdeskService {
  private readonly logger = new Logger(FreshdeskService.name);
  private readonly domain: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly httpClient: AxiosInstance | null = null;
  private mockTicketCounter = 10001;

  constructor() {
    this.domain = (process.env.FRESHDESK_DOMAIN || 'techartha').trim().replace(/\.freshdesk\.com$/i, '');
    this.apiKey = (process.env.FRESHDESK_API_KEY || '').trim();
    this.webhookSecret = (process.env.FRESHDESK_WEBHOOK_SECRET || 'techartha_freshdesk_webhook_secret').trim();

    if (this.apiKey) {
      const authHeader = `Basic ${Buffer.from(`${this.apiKey}:X`).toString('base64')}`;
      this.httpClient = axios.create({
        baseURL: `https://${this.domain}.freshdesk.com/api/v2`,
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      this.logger.log(`Freshdesk REST API client initialized for domain "${this.domain}.freshdesk.com"`);
    } else {
      this.logger.warn(
        'FRESHDESK_API_KEY is not set. FreshdeskService will operate in safe development fallback mode with realistic ticket IDs.',
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(this.httpClient && this.apiKey);
  }

  /**
   * Create a new ticket in Freshdesk.
   */
  async createTicket(params: CreateFreshdeskTicketParams): Promise<FreshdeskTicketResponse> {
    if (!this.isConfigured() || !this.httpClient) {
      const mockId = ++this.mockTicketCounter;
      this.logger.log(
        `[MOCK FRESHDESK] Created simulated ticket #${mockId} for phone: "${params.phone || 'N/A'}", subject: "${params.subject}"`,
      );
      return {
        id: mockId,
        subject: params.subject,
        status: params.status || 2,
        priority: params.priority || 2,
        description_text: params.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isMock: true,
      };
    }

    try {
      const payload: Record<string, any> = {
        subject: params.subject,
        description: params.description,
        priority: params.priority || 2,
        status: params.status || 2,
        source: params.source || 7, // 7 = Chat
      };

      if (params.phone) {
        payload.phone = params.phone;
      }
      if (params.email) {
        payload.email = params.email;
      }
      if (params.name) {
        payload.name = params.name;
      }
      if (params.customFields) {
        payload.custom_fields = params.customFields;
      }

      this.logger.log(`Dispatching ticket creation to Freshdesk API for ${params.phone || params.email}`);
      const res = await this.httpClient.post('/tickets', payload);
      this.logger.log(`Successfully created Freshdesk ticket #${res.data.id}`);
      return res.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      this.logger.error(
        `Failed to create ticket on Freshdesk: ${status} ${JSON.stringify(errorData || error.message)}`,
      );
      throw error;
    }
  }

  /**
   * Find the most recent open or pending ticket for a given customer phone number.
   */
  async findOpenTicketByPhone(phone: string): Promise<FreshdeskTicketResponse | null> {
    if (!this.isConfigured() || !this.httpClient || !phone) {
      return null;
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    try {
      // Freshdesk Search API query: phone:'...' AND (status:2 OR status:3)
      const query = encodeURIComponent(`"phone:'${cleanPhone}'"`);
      const res = await this.httpClient.get(`/search/tickets?query=${query}`);
      const results = res.data?.results || [];
      const openTicket = results.find(
        (t: any) => t.status === 2 || t.status === 3, // Open or Pending
      );
      return openTicket || null;
    } catch (error: any) {
      this.logger.warn(
        `Failed to query Freshdesk tickets by phone: ${error?.response?.status || error.message}. Continuing with fallback.`,
      );
      return null;
    }
  }

  /**
   * Add an incoming customer note (appends customer reply to the ticket).
   */
  async addCustomerReplyNote(ticketId: number | string, body: string): Promise<any> {
    if (!this.isConfigured() || !this.httpClient) {
      this.logger.log(`[MOCK FRESHDESK] Appended customer note to ticket #${ticketId}: "${body}"`);
      return { id: Date.now(), ticket_id: Number(ticketId), body, incoming: true, isMock: true };
    }

    try {
      const res = await this.httpClient.post(`/tickets/${ticketId}/notes`, {
        body,
        incoming: true,
        private: false,
      });
      this.logger.log(`Appended customer reply note to Freshdesk ticket #${ticketId}`);
      return res.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to add customer note to Freshdesk ticket #${ticketId}: ${error?.response?.status || error.message}`,
      );
      throw error;
    }
  }

  /**
   * Add an agent reply to the Freshdesk ticket.
   */
  async addAgentReply(ticketId: number | string, body: string): Promise<any> {
    if (!this.isConfigured() || !this.httpClient) {
      this.logger.log(`[MOCK FRESHDESK] Added agent reply to ticket #${ticketId}: "${body}"`);
      return { id: Date.now(), ticket_id: Number(ticketId), body, incoming: false, isMock: true };
    }

    try {
      const res = await this.httpClient.post(`/tickets/${ticketId}/reply`, {
        body,
      });
      this.logger.log(`Sent agent reply on Freshdesk ticket #${ticketId}`);
      return res.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to add agent reply to Freshdesk ticket #${ticketId}: ${error?.response?.status || error.message}`,
      );
      throw error;
    }
  }

  /**
   * Update the status of a ticket in Freshdesk.
   */
  async updateTicketStatus(ticketId: number | string, status: number): Promise<any> {
    if (!this.isConfigured() || !this.httpClient) {
      this.logger.log(`[MOCK FRESHDESK] Updated ticket #${ticketId} status to ${status}`);
      return { id: Number(ticketId), status, isMock: true };
    }

    try {
      const res = await this.httpClient.put(`/tickets/${ticketId}`, { status });
      this.logger.log(`Updated Freshdesk ticket #${ticketId} status to ${status}`);
      return res.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to update Freshdesk ticket #${ticketId} status: ${error?.response?.status || error.message}`,
      );
      throw error;
    }
  }

  /**
   * Verify incoming webhook token / secret from Freshdesk automations.
   */
  verifyWebhookSecret(token?: string): boolean {
    if (!this.webhookSecret) return true;
    return token === this.webhookSecret;
  }
}
