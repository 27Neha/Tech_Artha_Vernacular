import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('WhatsappService', () => {
  let service: WhatsappService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        {
          provide: PrismaService,
          useValue: {
            user: { findMany: jest.fn().mockResolvedValue([]) },
            signupReminder: { upsert: jest.fn().mockResolvedValue({}) },
            auditLog: { create: jest.fn().mockResolvedValue({}) },
          },
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('initializes with sandbox mock provider when no credentials set', () => {
    expect(service.getProviderName()).toBe('mock');
  });

  it('sends reminder using approved template and mock provider', async () => {
    const res = await service.sendIncompleteSignupReminder({
      mobile: '+919876543210',
      userName: 'Rahul',
      resumeToken: 'test-token-123',
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe('MOCK_SENT');
    expect(res.messageId).toMatch(/^wamid\./);
  });
});
