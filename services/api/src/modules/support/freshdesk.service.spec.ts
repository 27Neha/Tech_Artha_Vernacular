import { FreshdeskService } from './freshdesk.service';

describe('FreshdeskService', () => {
  let service: FreshdeskService;

  beforeEach(() => {
    service = new FreshdeskService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('operates in mock/safe mode when FRESHDESK_API_KEY is not configured', async () => {
    expect(service.isConfigured()).toBe(false);

    const ticket = await service.createTicket({
      subject: 'Test WhatsApp ticket',
      description: 'Need help with portfolio KYC',
      phone: '+919999999999',
    });

    expect(ticket).toBeDefined();
    expect(ticket.id).toBeGreaterThan(10000);
    expect(ticket.isMock).toBe(true);
    expect(ticket.subject).toBe('Test WhatsApp ticket');
  });

  it('appends note safely in mock mode', async () => {
    const note = await service.addCustomerReplyNote(10002, 'Customer reply follow up');
    expect(note).toBeDefined();
    expect(note.isMock).toBe(true);
    expect(note.body).toBe('Customer reply follow up');
  });

  it('verifies webhook secret correctly', () => {
    expect(service.verifyWebhookSecret('techartha_freshdesk_webhook_secret')).toBe(true);
    expect(service.verifyWebhookSecret('wrong-secret')).toBe(false);
  });
});
