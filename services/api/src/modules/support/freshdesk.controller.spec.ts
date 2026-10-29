import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { FreshdeskController } from './freshdesk.controller';
import { FreshdeskService } from './freshdesk.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../../integrations/whatsapp/whatsapp.service';

describe('FreshdeskController', () => {
  let controller: FreshdeskController;
  let prisma: any;
  let freshdeskService: any;
  let whatsappService: any;

  beforeEach(async () => {
    prisma = {
      supportTicket: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'ticket-123', status: 'RESOLVED' }),
      },
      supportMessage: {
        create: jest.fn().mockResolvedValue({ id: 'msg-123' }),
      },
      supportAuditEvent: {
        create: jest.fn().mockResolvedValue({ id: 'audit-123' }),
      },
    };

    freshdeskService = {
      isConfigured: jest.fn().mockReturnValue(true),
      verifyWebhookSecret: jest.fn().mockImplementation((token) => token === 'secret-123'),
    };

    whatsappService = {
      sendWhatsAppMessage: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FreshdeskController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: FreshdeskService, useValue: freshdeskService },
        { provide: WhatsappService, useValue: whatsappService },
      ],
    }).compile();

    controller = module.get<FreshdeskController>(FreshdeskController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns health status', () => {
    const health = controller.getHealth();
    expect(health.status).toBe('UP');
    expect(health.provider).toBe('FRESHDESK');
    expect(health.configured).toBe(true);
  });

  it('rejects webhooks with invalid secret token', async () => {
    await expect(
      controller.handleFreshdeskWebhook({
        ticketId: 10001,
        secretToken: 'wrong-token',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('processes agent reply and dispatches WhatsApp message back to customer', async () => {
    const mockTicket = {
      id: 'ticket-uuid-001',
      referenceId: 'TA-W-ABCDEF',
      freshdeskTicketId: BigInt(10001),
      customerPhone: '+918308816023',
      status: 'OPEN',
    };
    prisma.supportTicket.findFirst.mockResolvedValue(mockTicket);

    const result = await controller.handleFreshdeskWebhook({
      freshdeskTicketId: 10001,
      secretToken: 'secret-123',
      agentName: 'Aarav Sharma',
      agentEmail: 'aarav@techartha.com',
      replyBody: 'Hello! Your KYC verification has been approved.',
      customerPhone: '+918308816023',
    });

    expect(result.success).toBe(true);
    expect(result.whatsappDispatched).toBe(true);
    expect(prisma.supportMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          senderType: 'AGENT',
          senderName: 'Aarav Sharma',
          content: 'Hello! Your KYC verification has been approved.',
        }),
      }),
    );
    expect(whatsappService.sendWhatsAppMessage).toHaveBeenCalledWith(
      '+918308816023',
      'Hello! Your KYC verification has been approved.',
    );
  });

  it('maps ticket resolution status cleanly', async () => {
    const mockTicket = {
      id: 'ticket-uuid-002',
      referenceId: 'TA-W-XYZ123',
      freshdeskTicketId: BigInt(10002),
      customerPhone: '+919999999999',
      status: 'OPEN',
    };
    prisma.supportTicket.findFirst.mockResolvedValue(mockTicket);

    const result = await controller.handleFreshdeskWebhook({
      freshdeskTicketId: 10002,
      secretToken: 'secret-123',
      status: 4, // 4 = Resolved in Freshdesk
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('RESOLVED');
    expect(prisma.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ticket-uuid-002' },
        data: expect.objectContaining({
          status: 'RESOLVED',
        }),
      }),
    );
  });
});
