import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FreshdeskService } from '../../modules/support/freshdesk.service';

describe('WhatsappService', () => {
  let service: WhatsappService;
  let prisma: any;
  let freshdeskService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-uuid-123',
          mobile: '9876543210',
          email: 'investor@example.com',
          profile: { fullName: 'Rashi Jain' },
          kycApplication: { overallStatus: 'VERIFIED' },
          riskProfile: { category: 'MODERATE' },
        }),
      },
      supportMessage: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'msg-uuid-001' }),
      },
      supportTicket: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'ticket-uuid-001',
          referenceId: 'TA-W-TEST01',
          freshdeskTicketId: BigInt(20001),
          status: 'OPEN',
          customerPhone: '+919876543210',
        }),
        update: jest.fn().mockResolvedValue({ id: 'ticket-uuid-001' }),
      },
      supportAuditEvent: {
        create: jest.fn().mockResolvedValue({ id: 'audit-001' }),
      },
    };

    freshdeskService = {
      isConfigured: jest.fn().mockReturnValue(true),
      createTicket: jest.fn().mockResolvedValue({ id: 20001, status: 2 }),
      addCustomerReplyNote: jest.fn().mockResolvedValue({ id: 30001 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: PrismaService, useValue: prisma },
        { provide: FreshdeskService, useValue: freshdeskService },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a freshdesk ticket and persists SupportTicket when new customer message arrives', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: 'Rashi Jain' } }],
                messages: [
                  {
                    from: '919876543210',
                    id: 'wamid.12345',
                    text: { body: 'Hello, I need help with my portfolio goal.' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = await service.handleWhatsAppMessage(payload);

    expect(result.accepted).toBe(true);
    expect(result.processed).toBe(true);
    expect(result.action).toBe('TICKET_CREATED');
    expect(freshdeskService.createTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '+919876543210',
        name: 'Rashi Jain',
        priority: 2,
        status: 2,
      }),
    );
    expect(prisma.supportTicket.create).toHaveBeenCalled();
    expect(prisma.supportMessage.create).toHaveBeenCalled();
    expect(prisma.supportAuditEvent.create).toHaveBeenCalled();
  });

  it('threads follow-up message to existing open ticket without creating duplicate ticket', async () => {
    const existingTicket = {
      id: 'existing-ticket-001',
      referenceId: 'TA-W-ACTIVE1',
      freshdeskTicketId: BigInt(20001),
      customerPhone: '+919876543210',
      status: 'OPEN',
    };
    prisma.supportTicket.findFirst.mockResolvedValue(existingTicket);

    const payload = {
      phone: '919876543210',
      text: 'Following up on my previous query',
      senderName: 'Rashi Jain',
    };

    const result = await service.handleWhatsAppMessage(payload);

    expect(result.accepted).toBe(true);
    expect(result.processed).toBe(true);
    expect(result.action).toBe('NOTE_APPENDED');
    expect(freshdeskService.createTicket).not.toHaveBeenCalled();
    expect(freshdeskService.addCustomerReplyNote).toHaveBeenCalledWith('20001', 'Following up on my previous query');
    expect(prisma.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'existing-ticket-001' },
      }),
    );
  });

  it('correctly processes official Interakt message_received webhook payload with customer traits', async () => {
    prisma.supportTicket.findFirst.mockResolvedValue(null);

    const interaktPayload = {
      type: 'message_received',
      data: {
        customer: {
          id: 45678,
          phone_number: '9876543210',
          country_code: '+91',
          channel_phone_number: '+919876543210',
          traits: {
            Name: 'Rashi Jain',
            Email: 'rashi@example.com',
          },
        },
        message: {
          id: 'interakt-msg-999888',
          type: 'text',
          text: {
            body: 'How do I download my capital gains statement?',
          },
          timestamp: '1673856000',
        },
      },
    };

    const result = await service.handleWhatsAppMessage(interaktPayload);

    expect(result.accepted).toBe(true);
    expect(result.processed).toBe(true);
    expect(result.action).toBe('TICKET_CREATED');
    expect(prisma.supportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: 'WHATSAPP',
          customerName: 'Rashi Jain',
          customerPhone: '+919876543210',
          message: 'How do I download my capital gains statement?',
        }),
      }),
    );
  });

  it('updates SupportMessage delivery status when Interakt delivery and read receipts arrive', async () => {
    prisma.supportMessage.updateMany = jest.fn().mockResolvedValue({ count: 1 });

    const deliveredReceipt = {
      type: 'message_api_delivered',
      data: {
        message: { id: 'interakt-msg-999888' },
      },
    };

    const delResult = await service.handleWhatsAppMessage(deliveredReceipt);
    expect(delResult.accepted).toBe(true);
    expect(delResult.status).toBe('DELIVERED');
    expect(prisma.supportMessage.updateMany).toHaveBeenCalledWith({
      where: { channelMessageId: 'interakt-msg-999888' },
      data: { deliveryStatus: 'DELIVERED' },
    });

    const readReceipt = {
      type: 'message_api_read',
      data: {
        message: { id: 'interakt-msg-999888' },
      },
    };

    const readResult = await service.handleWhatsAppMessage(readReceipt);
    expect(readResult.accepted).toBe(true);
    expect(readResult.status).toBe('READ');
    expect(prisma.supportMessage.updateMany).toHaveBeenCalledWith({
      where: { channelMessageId: 'interakt-msg-999888' },
      data: { deliveryStatus: 'READ' },
    });
  });
});
