import { SupportEmailService } from './email.service';

describe('SupportEmailService', () => {
  let emailService: SupportEmailService;
  const originalEnv = process.env;

  beforeEach(() => {
    emailService = new SupportEmailService();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('buildAcknowledgementEmailHtml', () => {
    it('generates branded HTML containing reference ID, exact message, user name and TechArtha disclaimer', () => {
      const html = emailService.buildAcknowledgementEmailHtml({
        to: 'user@example.com',
        userName: 'Priya Sharma',
        referenceId: 'TA-Q-99AA88BB',
        subject: 'KYC Document Status',
        message: 'Has my Aadhaar verification completed?',
        status: 'Received',
        createdAt: new Date('2026-10-13T10:00:00Z'),
      });

      expect(html).toContain('TechArtha');
      expect(html).toContain('Hello Priya Sharma');
      expect(html).toContain("We've received your query! Our team is looking into it, and we'll update you as soon as we have more information.");
      expect(html).toContain('TA-Q-99AA88BB');
      expect(html).toContain('KYC Document Status');
      expect(html).toContain('Has my Aadhaar verification completed?');
      expect(html).toContain('Received');
      expect(html).toContain('+91 83088 16023');
      expect(html).toContain('AMFI Registered Mutual Fund Distributor');
    });

    it('sanitizes user input to prevent HTML injection in email', () => {
      const html = emailService.buildAcknowledgementEmailHtml({
        to: 'user@example.com',
        referenceId: 'TA-Q-12345678',
        subject: 'Test <script>alert(1)</script>',
        message: 'Message with <b>bold</b> and <img src="x" onerror="steal()"/>',
      });

      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
    });
  });

  describe('sendQueryAcknowledgementEmail', () => {
    it('uses Resend API when RESEND_API_KEY is configured', async () => {
      process.env.RESEND_API_KEY = 're_test_key_123456';
      process.env.RESEND_FROM = 'TechArtha <support@techartha.com>';

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'resend-email-msg-999' }),
      });
      global.fetch = mockFetch as any;

      const result = await emailService.sendQueryAcknowledgementEmail({
        to: 'user@example.com',
        referenceId: 'TA-Q-RESEND01',
        subject: 'Question on Mutual Funds',
        message: 'Details here',
      });

      expect(result.provider).toBe('resend');
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('resend-email-msg-999');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer re_test_key_123456',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('falls back to mock provider in development/test when no API keys configured', async () => {
      delete process.env.RESEND_API_KEY;
      delete process.env.ZEPTOMAIL_SEND_MAIL_TOKEN;
      delete process.env.ZEPTOMAIL_ENABLED;
      delete process.env.EMAIL_HOST;

      const result = await emailService.sendQueryAcknowledgementEmail({
        to: 'test@example.com',
        referenceId: 'TA-Q-MOCK0001',
        subject: 'Test Subject',
        message: 'Test Message',
      });

      expect(result.provider).toBe('mock');
      expect(result.success).toBe(true);
      expect(result.messageId).toContain('mock-');
    });

    it('validates email format before attempting delivery', async () => {
      await expect(
        emailService.sendQueryAcknowledgementEmail({
          to: 'invalid-email',
          referenceId: 'TA-Q-ERR0001',
          subject: 'Test',
          message: 'Message',
        }),
      ).rejects.toThrow('Invalid recipient email address');
    });
  });
});
