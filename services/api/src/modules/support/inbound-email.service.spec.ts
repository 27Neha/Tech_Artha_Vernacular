import { Test, TestingModule } from '@nestjs/testing';
import { InboundEmailService } from './inbound-email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SupportEmailService } from './email.service';

describe('InboundEmailService', () => {
  let service: InboundEmailService;
  let prisma: any;
  let emailService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-uuid-999',
          email: 'investor@example.com',
          mobile: '9876543210',
          profile: { fullName: 'Amitabh Sen' },
          kycApplication: { overallStatus: 'VERIFIED' },
          riskProfile: { category: 'AGGRESSIVE' },
        }),
      },
      supportMessage: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'msg-uuid-email-01' }),
      },
      supportTicket: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'ticket-uuid-email-01',
          referenceId: 'TA-E-EM001',
          status: 'OPEN',
          customerEmail: 'investor@example.com',
          createdAt: new Date(),
        }),
        update: jest.fn().mockResolvedValue({ id: 'ticket-uuid-email-01' }),
      },
      supportAuditEvent: {
        create: jest.fn().mockResolvedValue({ id: 'audit-email-01' }),
      },
      technicalAgent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    emailService = {
      sendQueryAcknowledgementEmail: jest.fn().mockResolvedValue({
        provider: 'zeptomail',
        success: true,
        messageId: 'zepto-ack-msg-001',
      }),
      sendAgentReplyEmail: jest.fn().mockResolvedValue({
        provider: 'zeptomail',
        success: true,
        messageId: 'zepto-reply-msg-001',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboundEmailService,
        { provide: PrismaService, useValue: prisma },
        { provide: SupportEmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<InboundEmailService>(InboundEmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates new support ticket and sends ZeptoMail acknowledgement when receiving new email', async () => {
    const payload = {
      from: 'Amitabh Sen <investor@example.com>',
      to: 'support@techartha.com',
      subject: 'Inquiry regarding SIP mandate timing',
      text: 'When will my automated monthly debit begin for the flexi cap fund?',
      messageId: '<msg-id-12345@mail.example.com>',
    };

    const result = await service.handleInboundEmail(payload);

    expect(result.accepted).toBe(true);
    expect(result.processed).toBe(true);
    expect(result.action).toBe('TICKET_CREATED');
    expect(prisma.supportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: 'EMAIL',
          customerEmail: 'investor@example.com',
          status: 'OPEN',
          subject: 'Inquiry regarding SIP mandate timing',
        }),
      }),
    );
    expect(prisma.supportMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          senderType: 'USER',
          channel: 'EMAIL',
          senderEmail: 'investor@example.com',
        }),
      }),
    );
    expect(emailService.sendQueryAcknowledgementEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'investor@example.com',
        subject: 'Inquiry regarding SIP mandate timing',
      }),
    );
  });

  it('threads follow-up email reply to existing ticket using subject reference ID', async () => {
    const existingTicket = {
      id: 'existing-ticket-email-01',
      referenceId: 'TA-E-ABC123',
      channel: 'EMAIL',
      customerEmail: 'investor@example.com',
      status: 'OPEN',
    };
    prisma.supportTicket.findFirst.mockResolvedValue(existingTicket);

    const payload = {
      from: 'investor@example.com',
      subject: 'Re: [TA-E-ABC123] Inquiry regarding SIP mandate timing',
      text: 'Thank you, here are the bank details you asked for.',
      messageId: '<reply-msg-4567@mail.example.com>',
      inReplyTo: '<original-msg-12345@mail.example.com>',
    };

    const result = await service.handleInboundEmail(payload);

    expect(result.accepted).toBe(true);
    expect(result.processed).toBe(true);
    expect(result.action).toBe('NOTE_APPENDED');
    expect(result.referenceId).toBe('TA-E-ABC123');
    expect(prisma.supportTicket.create).not.toHaveBeenCalled();
    expect(prisma.supportMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ticketId: 'existing-ticket-email-01',
          senderType: 'USER',
          channel: 'EMAIL',
        }),
      }),
    );
    expect(prisma.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'existing-ticket-email-01' },
        data: expect.objectContaining({
          lastCustomerMessage: 'Thank you, here are the bank details you asked for.',
          status: 'OPEN',
        }),
      }),
    );
  });

  it('deduplicates duplicate webhook deliveries using messageId', async () => {
    prisma.supportMessage.findFirst.mockResolvedValue({ id: 'existing-msg-001' });

    const payload = {
      from: 'investor@example.com',
      subject: 'Test query',
      text: 'Checking if duplicate',
      messageId: '<duplicate-msg-id@mail.example.com>',
    };

    const result = await service.handleInboundEmail(payload);

    expect(result.accepted).toBe(true);
    expect(result.processed).toBe(true);
    expect(result.action).toBe('DUPLICATE_IGNORED');
    expect(prisma.supportTicket.create).not.toHaveBeenCalled();
    expect(prisma.supportMessage.create).not.toHaveBeenCalled();
  });
});
