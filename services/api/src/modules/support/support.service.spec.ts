import { BadRequestException } from '@nestjs/common';
import { SupportService, ACKNOWLEDGEMENT_MESSAGE, generateReferenceId } from './support.service';
import { SupportEmailService } from './email.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SupportService', () => {
  let service: SupportService;
  let mockPrisma: any;
  let mockEmailService: any;

  beforeEach(() => {
    mockPrisma = {
      supportTicket: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
      },
    };

    mockEmailService = {
      sendQueryAcknowledgementEmail: jest.fn().mockResolvedValue({
        provider: 'resend',
        success: true,
      }),
      buildAcknowledgementEmailHtml: jest.fn().mockReturnValue('<html>Acknowledgement</html>'),
    };

    service = new SupportService(mockPrisma as unknown as PrismaService, mockEmailService as unknown as SupportEmailService);
  });

  describe('1. Successful Submission', () => {
    it('saves query to DB, sends acknowledgement email, and returns immediate acknowledgement message and reference ID', async () => {
      const mockCreatedTicket = {
        id: 'c1b489a2-9214-41d3-9fcf-5231c5b8d210',
        userId: 'user-123',
        subject: 'KYC Verification Question',
        message: 'How long does Digilocker KYC verification usually take?',
        status: 'RECEIVED',
        createdAt: new Date('2026-10-13T12:00:00Z'),
        updatedAt: new Date('2026-10-13T12:00:00Z'),
        user: {
          id: 'user-123',
          email: 'investor@example.com',
          profile: {
            fullName: 'Neha Sharma',
            email: 'investor@example.com',
          },
        },
      };

      mockPrisma.supportTicket.findFirst.mockResolvedValue(null);
      mockPrisma.supportTicket.create.mockResolvedValue(mockCreatedTicket);

      const result = await service.createQuery('user-123', {
        subject: 'KYC Verification Question',
        message: 'How long does Digilocker KYC verification usually take?',
      });

      // 1. Verify DB persistence
      expect(mockPrisma.supportTicket.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.supportTicket.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          subject: 'KYC Verification Question',
          message: 'How long does Digilocker KYC verification usually take?',
          status: 'OPEN',
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });

      // 2. Verify acknowledgement email dispatched with correct details
      expect(mockEmailService.sendQueryAcknowledgementEmail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendQueryAcknowledgementEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'investor@example.com',
          userName: 'Neha Sharma',
          referenceId: expect.stringMatching(/^TA-[A-Z]-[A-Z0-9]+$/),
          subject: 'KYC Verification Question',
          status: 'Received',
        }),
      );

      // 3. Verify notification record created
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            channel: 'EMAIL',
            status: 'SENT',
          }),
        }),
      );

      // 4. Verify exact acknowledgement message and reference ID
      expect(result.acknowledgementMessage).toBe(ACKNOWLEDGEMENT_MESSAGE);
      expect(result.acknowledgementMessage).toBe(
        "We've received your query! Our team is looking into it, and we'll update you as soon as we have more information.",
      );
      expect(result.referenceId).toMatch(/^TA-[A-Z]-[A-Z0-9]+$/);
      expect(result.status).toBe('Received');
      expect(result.emailSent).toBe(true);
      expect(result.recipientEmail).toBe('investor@example.com');
      expect(result.isDuplicate).toBe(false);
    });

    it('validates minimum length for subject and message', async () => {
      await expect(
        service.createQuery('user-123', {
          subject: 'ab',
          message: 'valid message',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createQuery('user-123', {
          subject: 'Valid Subject',
          message: 'ab',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.supportTicket.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendQueryAcknowledgementEmail).not.toHaveBeenCalled();
    });
  });

  describe('2. Failed Submission (Database Error)', () => {
    it('does NOT send email if database persistence fails', async () => {
      mockPrisma.supportTicket.findFirst.mockResolvedValue(null);
      mockPrisma.supportTicket.create.mockRejectedValue(new Error('PostgreSQL connection timeout'));

      await expect(
        service.createQuery('user-123', {
          subject: 'Payment Issue',
          message: 'My SIP debit could not be verified.',
        }),
      ).rejects.toThrow('PostgreSQL connection timeout');

      // Email service must NOT be called if query was not saved
      expect(mockEmailService.sendQueryAcknowledgementEmail).not.toHaveBeenCalled();
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('3. Email Delivery Failure Handling', () => {
    it('gracefully handles email provider failure without losing the saved query', async () => {
      const mockCreatedTicket = {
        id: 'f87a32e1-4567-4890-abcd-112233445566',
        userId: 'user-456',
        subject: 'Mutual Fund SIP',
        message: 'Can I change my SIP date after registration?',
        status: 'RECEIVED',
        createdAt: new Date('2026-10-13T12:00:00Z'),
        updatedAt: new Date('2026-10-13T12:00:00Z'),
        user: {
          id: 'user-456',
          email: 'investor@test.com',
          profile: {
            fullName: 'Rajesh Patel',
            email: 'investor@test.com',
          },
        },
      };

      mockPrisma.supportTicket.findFirst.mockResolvedValue(null);
      mockPrisma.supportTicket.create.mockResolvedValue(mockCreatedTicket);

      // Simulate email provider failure (e.g. Resend rate limit or network error)
      mockEmailService.sendQueryAcknowledgementEmail.mockRejectedValue(
        new Error('Resend provider 500: Internal Server Error'),
      );

      const result = await service.createQuery('user-456', {
        subject: 'Mutual Fund SIP',
        message: 'Can I change my SIP date after registration?',
      });

      // Query WAS saved in DB
      expect(mockPrisma.supportTicket.create).toHaveBeenCalledTimes(1);

      // Email was attempted
      expect(mockEmailService.sendQueryAcknowledgementEmail).toHaveBeenCalledTimes(1);

      // Failed notification was logged
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-456',
            channel: 'EMAIL',
            status: 'FAILED',
          }),
        }),
      );

      // Saved query is safely returned to user, not lost
      expect(result.id).toBe('f87a32e1-4567-4890-abcd-112233445566');
      expect(result.referenceId).toMatch(/^TA-[A-Z]-[A-Z0-9]+$/);
      expect(result.status).toBe('Received');
      expect(result.emailSent).toBe(false);
      expect(result.emailDeliveryError).toContain('Resend provider 500');
      expect(result.acknowledgementMessage).toBe(ACKNOWLEDGEMENT_MESSAGE);
    });
  });

  describe('4. Duplicate Request / Idempotency Handling', () => {
    it('prevents sending duplicate emails on repeated requests via idempotency key', async () => {
      const existingTicket = {
        id: '8a2b3c4d-1111-2222-3333-444455556666',
        userId: 'user-789',
        subject: 'Tax Statement Query',
        message: 'Where do I download my capital gains statement?',
        status: 'RECEIVED',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-789',
          email: 'tax@example.com',
          profile: { fullName: 'Amit Verma' },
        },
      };

      // First call saves and sends email
      mockPrisma.supportTicket.findFirst.mockResolvedValue(null);
      mockPrisma.supportTicket.create.mockResolvedValue(existingTicket);

      const firstResult = await service.createQuery('user-789', {
        subject: 'Tax Statement Query',
        message: 'Where do I download my capital gains statement?',
        idempotencyKey: 'tx-req-unique-001',
      });

      expect(mockPrisma.supportTicket.create).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendQueryAcknowledgementEmail).toHaveBeenCalledTimes(1);
      expect(firstResult.emailSent).toBe(true);

      // Second call with same idempotency key
      mockPrisma.supportTicket.findUnique.mockResolvedValue(existingTicket);
      const secondResult = await service.createQuery('user-789', {
        subject: 'Tax Statement Query',
        message: 'Where do I download my capital gains statement?',
        idempotencyKey: 'tx-req-unique-001',
      });

      // Should NOT create new ticket or send duplicate email
      expect(mockPrisma.supportTicket.create).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendQueryAcknowledgementEmail).toHaveBeenCalledTimes(1); // Still 1!
      expect(secondResult.isDuplicate).toBe(true);
      expect(secondResult.emailSent).toBe(false);
      expect(secondResult.id).toBe(existingTicket.id);
      expect(secondResult.referenceId).toBeDefined();
    });

    it('prevents duplicate email on repeated content within 5 minutes', async () => {
      const existingTicket = {
        id: '99887766-5544-3322-1100-aabbccddeeff',
        userId: 'user-999',
        subject: 'Duplicate Test',
        message: 'Submitting same question repeatedly.',
        status: 'RECEIVED',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-999',
          email: 'dup@example.com',
          profile: { fullName: 'Pooja Roy' },
        },
      };

      // Mock finding recent duplicate in DB
      mockPrisma.supportTicket.findFirst.mockResolvedValue(existingTicket);

      const result = await service.createQuery('user-999', {
        subject: 'Duplicate Test',
        message: 'Submitting same question repeatedly.',
      });

      // No new DB record created, no email dispatched
      expect(mockPrisma.supportTicket.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendQueryAcknowledgementEmail).not.toHaveBeenCalled();
      expect(result.isDuplicate).toBe(true);
      expect(result.referenceId).toBe('TA-Q-99887766');
      expect(result.status).toBe('Received');
    });
  });

  describe('5. Query Retrieval and Status Tracking', () => {
    it('lists all queries for a user with accurate status', async () => {
      mockPrisma.supportTicket.findMany.mockResolvedValue([
        {
          id: 'ticket-1',
          userId: 'u1',
          subject: 'Query 1',
          message: 'Msg 1',
          status: 'RECEIVED',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { email: 'u1@test.com' },
        },
        {
          id: 'ticket-2',
          userId: 'u1',
          subject: 'Query 2',
          message: 'Msg 2',
          status: 'UNDER_REVIEW',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { email: 'u1@test.com' },
        },
      ]);

      const list = await service.getUserQueries('u1');
      expect(list.length).toBe(2);
      expect(list[0].status).toBe('Received');
      expect(list[1].status).toBe('Under Review');
    });

    it('retrieves single query by reference ID or ID', async () => {
      const ticket = {
        id: 'a1b2c3d4-1234-5678-90ab-cdef12345678',
        userId: 'u1',
        subject: 'Query Single',
        message: 'Msg Single',
        status: 'RESOLVED',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { email: 'u1@test.com' },
      };

      mockPrisma.supportTicket.findFirst.mockResolvedValue(ticket);

      const result = await service.getQueryById('u1', 'a1b2c3d4-1234-5678-90ab-cdef12345678');
      expect(result.referenceId).toBe('TA-Q-A1B2C3D4');
      expect(result.status).toBe('Resolved');
    });
  });
});
