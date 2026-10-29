import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupportEmailService } from './email.service';
import { CreateSupportQueryDto, SupportQueryResponseDto } from './support.dto';

export const ACKNOWLEDGEMENT_MESSAGE =
  "We've received your query! Our team is looking into it, and we'll update you as soon as we have more information.";

export function generateReferenceId(ticketId: string): string {
  const clean = ticketId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const shortCode = clean.length >= 8 ? clean.slice(0, 8) : clean.padEnd(8, '0');
  return `TA-Q-${shortCode}`;
}

export function formatTicketStatus(rawStatus: string): string {
  switch (rawStatus?.toUpperCase()) {
    case 'RECEIVED':
      return 'Received';
    case 'UNDER_REVIEW':
      return 'Under Review';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'RESOLVED':
      return 'Resolved';
    case 'CLOSED':
      return 'Closed';
    case 'OPEN':
    default:
      return 'Received';
  }
}

interface IdempotencyRecord {
  ticketId: string;
  timestamp: number;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  // In-memory idempotency cache (keyed by idempotencyKey or user+content hash)
  private readonly idempotencyCache = new Map<string, IdempotencyRecord>();
  private readonly IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: SupportEmailService,
  ) {}

  /**
   * Submit a support query.
   * 1. Validates inputs.
   * 2. Checks idempotency (preventing duplicate requests and duplicate emails).
   * 3. Persists query to database.
   * 4. Dispatches acknowledgement email to verified email address.
   * 5. Returns immediate acknowledgement message, query status, and reference ID.
   */
  async createQuery(
    userId: string | null,
    dto: CreateSupportQueryDto,
  ): Promise<SupportQueryResponseDto> {
    const subject = dto.subject?.trim();
    const message = dto.message?.trim();

    if (!subject || subject.length < 3) {
      throw new BadRequestException('Subject must be at least 3 characters long.');
    }
    if (!message || message.length < 5) {
      throw new BadRequestException('Message must be at least 5 characters long.');
    }

    // 1. Idempotency Check:
    // Determine idempotency key from explicit key or normalized hash
    const cleanKey = dto.idempotencyKey?.trim();
    const compoundKey = cleanKey
      ? `key:${cleanKey}`
      : `hash:${userId || 'guest'}:${subject.toLowerCase()}:${message.toLowerCase()}`;

    const cached = this.idempotencyCache.get(compoundKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.IDEMPOTENCY_TTL_MS) {
      this.logger.warn(`Duplicate support query detected via in-memory key "${compoundKey}". Returning existing ticket.`);
      const existing = await this.prisma.supportTicket.findUnique({
        where: { id: cached.ticketId },
        include: { user: { include: { profile: true } } },
      });
      if (existing) {
        return this.mapToResponse(existing, false, null, true);
      }
    }

    // Fallback DB check for repeated identical submission in the last 5 minutes
    const fiveMinutesAgo = new Date(now - this.IDEMPOTENCY_TTL_MS);
    const recentDuplicate = await this.prisma.supportTicket.findFirst({
      where: {
        ...(userId ? { userId } : {}),
        subject,
        message,
        createdAt: { gte: fiveMinutesAgo },
      },
      include: { user: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (recentDuplicate) {
      this.logger.warn(`Duplicate support query detected in DB within 5 min window for user ${userId || 'guest'}. Returning existing ticket.`);
      this.idempotencyCache.set(compoundKey, { ticketId: recentDuplicate.id, timestamp: now });
      return this.mapToResponse(recentDuplicate, false, null, true);
    }

    // 2. Persist Support Ticket to Database FIRST.
    // If database save fails, an exception is thrown here and NO email is ever dispatched.
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId: userId || null,
        subject,
        message,
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

    // Record in idempotency cache
    this.idempotencyCache.set(compoundKey, { ticketId: ticket.id, timestamp: now });
    this.cleanupIdempotencyCache();

    // 3. Resolve user email, full name, phone and reference ID
    const targetChannel = (dto.channel || 'APP').toUpperCase();
    const resolvedEmail =
      dto.email?.trim() ||
      ticket.user?.email ||
      ticket.user?.profile?.email ||
      null;

    const resolvedName =
      dto.customerName?.trim() ||
      ticket.user?.profile?.fullName ||
      (targetChannel === 'WHATSAPP' ? 'WhatsApp Investor' : 'Valued Investor');

    const resolvedPhone =
      dto.customerPhone?.trim() ||
      ticket.user?.mobile ||
      null;

    const shortRef = Math.random().toString(36).substring(2, 8).toUpperCase();
    const prefix = targetChannel === 'WHATSAPP' ? 'TA-W-' : targetChannel === 'EMAIL' ? 'TA-E-' : targetChannel === 'SMS' ? 'TA-S-' : 'TA-A-';
    const referenceId = `${prefix}${shortRef}`;

    // Enrich ticket with channel, customer details, and conversation thread
    ticket.referenceId = referenceId;
    ticket.channel = targetChannel;
    ticket.customerName = resolvedName;
    ticket.customerPhone = resolvedPhone;
    ticket.customerEmail = resolvedEmail;

    if (this.prisma?.supportTicket?.update) {
      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          referenceId,
          channel: targetChannel,
          customerName: resolvedName,
          customerPhone: resolvedPhone,
          customerEmail: resolvedEmail,
          lastCustomerMessage: ticket.message,
        },
      }).catch(() => {});
    }

    if (this.prisma?.supportMessage?.create) {
      await this.prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderType: 'USER',
          senderName: resolvedName,
          senderEmail: resolvedEmail,
          content: ticket.message,
          channel: targetChannel,
          deliveryStatus: 'DELIVERED',
        },
      }).catch(() => {});
    }

    // 4. Notify all active Technical Support Agents
    if ((this.prisma as any)?.technicalAgent?.findMany) {
      try {
        const activeAgents = await (this.prisma as any).technicalAgent.findMany({
          where: { isActive: true, notifyOnTickets: true },
        });

        const targetUserId = ticket.userId || (await this.prisma.user.findFirst({ select: { id: true } }))?.id;

        if (targetUserId) {
          for (const agent of activeAgents) {
            await this.prisma.notification.create({
              data: {
                userId: targetUserId,
                type: 'AGENT_NEW_TICKET_ALERT',
                title: `New ${targetChannel} Ticket: ${referenceId}`,
                body: `${resolvedName} (${resolvedPhone || ticket.user?.mobile || 'Investor'}): "${ticket.subject}"`,
                channel: 'ADMIN_PORTAL',
                status: 'SENT',
              },
            }).catch(() => {});
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to notify technical agents: ${err?.message}`);
      }
    }

    // 5. Send Automatic Acknowledgement Email (isolated with graceful error handling)
    let emailSent = false;
    let emailDeliveryError: string | null = null;

    if (resolvedEmail && resolvedEmail.includes('@')) {
      try {
        await this.emailService.sendQueryAcknowledgementEmail({
          to: resolvedEmail,
          userName: resolvedName,
          referenceId,
          subject: ticket.subject,
          message: ticket.message,
          status: formatTicketStatus(ticket.status),
          createdAt: ticket.createdAt,
        });
        emailSent = true;
        this.logger.log(`Automatic acknowledgement email sent for ticket ${referenceId} to ${resolvedEmail}`);

        const notifUserId = ticket.userId || (await this.prisma.user.findFirst({ select: { id: true } }))?.id;
        if (notifUserId) {
          await this.prisma.notification.create({
            data: {
              userId: notifUserId,
              type: 'SUPPORT_ACKNOWLEDGEMENT',
              title: `Query Received: ${referenceId}`,
              body: `We have received your query "${ticket.subject}". Reference ID: ${referenceId}`,
              channel: 'EMAIL',
              status: 'SENT',
            },
          }).catch((err) => this.logger.warn(`Failed to create notification record: ${err?.message}`));
        }
      } catch (err: any) {
        // If email fails, the saved ticket is NEVER lost.
        emailDeliveryError = err?.message || 'Email delivery failed';
        this.logger.error(`Graceful email delivery failure for ticket ${ticket.id}: ${emailDeliveryError}`);

        const notifUserId = ticket.userId || (await this.prisma.user.findFirst({ select: { id: true } }))?.id;
        if (notifUserId) {
          await this.prisma.notification.create({
            data: {
              userId: notifUserId,
              type: 'SUPPORT_ACKNOWLEDGEMENT',
              title: `Query Received: ${referenceId}`,
              body: `We have received your query "${ticket.subject}". Reference ID: ${referenceId}`,
              channel: 'EMAIL',
              status: 'FAILED',
            },
          }).catch((e) => this.logger.warn(`Failed to log notification error: ${e?.message}`));
        }
      }
    } else {
      this.logger.log(`No verified email address on file for ticket ${referenceId}. Skipping email dispatch.`);
    }

    return this.mapToResponse(ticket, emailSent, resolvedEmail, false, emailDeliveryError);
  }

  /**
   * Get all queries for a given user.
   */
  /**
   * Get all queries for a given user (including WhatsApp and Freshdesk tickets).
   */
  async getUserQueries(userId: string): Promise<SupportQueryResponseDto[]> {
    const user = this.prisma?.user?.findUnique
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, mobile: true, email: true },
        })
      : null;

    const userPhones: string[] = [];
    if (user?.mobile) {
      const clean = user.mobile.replace(/[^0-9]/g, '');
      const last10 = clean.slice(-10);
      userPhones.push(user.mobile, clean, last10, `+91${last10}`, `91${last10}`);
    }

    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        OR: [
          { userId },
          ...(userPhones.length > 0 ? [{ customerPhone: { in: userPhones } }] : []),
        ],
      },
      include: { user: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((t) =>
      this.mapToResponse(
        t,
        false,
        t.user?.email || t.user?.profile?.email || t.customerEmail || null,
        false,
      ),
    );
  }

  /**
   * Get a specific query by ID or Reference ID.
   */
  async getQueryById(userId: string, idOrRef: string): Promise<SupportQueryResponseDto> {
    const user = this.prisma?.user?.findUnique
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, mobile: true },
        })
      : null;

    const userPhones: string[] = [];
    if (user?.mobile) {
      const clean = user.mobile.replace(/[^0-9]/g, '');
      const last10 = clean.slice(-10);
      userPhones.push(user.mobile, clean, last10, `+91${last10}`, `91${last10}`);
    }

    let ticket = await this.prisma.supportTicket.findFirst({
      where: {
        AND: [
          {
            OR: [
              { id: idOrRef },
              { referenceId: idOrRef },
              { referenceId: { equals: idOrRef, mode: 'insensitive' } },
            ],
          },
          {
            OR: [
              { userId },
              ...(userPhones.length > 0 ? [{ customerPhone: { in: userPhones } }] : []),
            ],
          },
        ],
      },
      include: { user: { include: { profile: true } } },
    });

    if (!ticket) {
      // Fallback check for short code
      const clean = idOrRef.toUpperCase().replace('TA-Q-', '').replace('TA-W-', '');
      const allUserTickets = await this.prisma.supportTicket.findMany({
        where: {
          OR: [
            { userId },
            ...(userPhones.length > 0 ? [{ customerPhone: { in: userPhones } }] : []),
          ],
        },
        include: { user: { include: { profile: true } } },
      });
      ticket =
        allUserTickets.find(
          (t) =>
            t.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) === clean ||
            (t.referenceId && t.referenceId.toUpperCase().includes(clean)),
        ) ?? null;
    }

    if (!ticket) {
      throw new NotFoundException(`Support query "${idOrRef}" not found.`);
    }

    return this.mapToResponse(
      ticket,
      false,
      ticket.user?.email || ticket.user?.profile?.email || ticket.customerEmail || null,
      false,
    );
  }

  private mapToResponse(
    ticket: any,
    emailSent: boolean,
    recipientEmail: string | null = null,
    isDuplicate = false,
    emailDeliveryError: string | null = null,
  ): SupportQueryResponseDto {
    return {
      id: ticket.id,
      referenceId: ticket.referenceId || generateReferenceId(ticket.id),
      subject: ticket.subject,
      message: ticket.message,
      status: formatTicketStatus(ticket.status),
      rawStatus: ticket.status,
      createdAt: ticket.createdAt?.toISOString ? ticket.createdAt.toISOString() : new Date(ticket.createdAt).toISOString(),
      updatedAt: ticket.updatedAt?.toISOString ? ticket.updatedAt.toISOString() : new Date(ticket.updatedAt).toISOString(),
      emailSent,
      recipientEmail: recipientEmail || ticket.user?.email || ticket.user?.profile?.email || ticket.customerEmail || null,
      isDuplicate,
      acknowledgementMessage: ACKNOWLEDGEMENT_MESSAGE,
      emailDeliveryError,
      channel: ticket.channel || 'WHATSAPP',
      lastCustomerMessage: ticket.lastCustomerMessage || null,
      lastAgentReply: ticket.lastAgentReply || null,
      assignedAgentName: ticket.assignedAgentName || null,
      freshdeskTicketId: ticket.freshdeskTicketId ? ticket.freshdeskTicketId.toString() : null,
    };
  }

  private cleanupIdempotencyCache() {
    const now = Date.now();
    for (const [key, record] of this.idempotencyCache.entries()) {
      if (now - record.timestamp > this.IDEMPOTENCY_TTL_MS) {
        this.idempotencyCache.delete(key);
      }
    }
  }
}
