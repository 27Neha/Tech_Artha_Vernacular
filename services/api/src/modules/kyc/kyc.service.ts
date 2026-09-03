import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(private readonly prisma: PrismaService) {}

  async startKyc(userId: string) {
    let application = await this.prisma.kYCApplication.findUnique({
      where: { userId },
    });

    if (!application) {
      application = await this.prisma.kYCApplication.create({
        data: {
          userId,
          status: 'IN_PROGRESS',
        },
      });
    }

    const transactionId = randomUUID();
    const token = 'cybrilla_token_' + randomUUID();
    const workflowId = 'kyc_workflow_1';

    // Update the transaction id
    await this.prisma.kYCApplication.update({
      where: { id: application.id },
      data: {
        providerTransactionId: transactionId,
        workflowId
      }
    });

    return {
      transactionId,
      token,
      workflowId,
    };
  }

  async getKycStatus(userId: string) {
    return this.prisma.kYCApplication.findUnique({
      where: { userId },
      include: {
        verifications: true,
      },
    });
  }
}
