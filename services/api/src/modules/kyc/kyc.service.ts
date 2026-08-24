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
    let token = '';
    const workflowId = 'kyc_workflow_1';

    const appId = process.env.HYPERVERGE_APP_ID;
    const appKey = process.env.HYPERVERGE_APP_KEY;

    if (!appId || !appKey) {
      this.logger.warn('HYPERVERGE_APP_ID or HYPERVERGE_APP_KEY missing, generating dummy token.');
      token = 'dummy_token_' + randomUUID();
    } else {
      try {
        const response = await fetch('https://auth.hyperverge.co/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appId, appKey, transactionId }),
        });
        const data = (await response.json()) as any;
        token = data?.result?.token || 'fallback_token';
      } catch (error) {
        this.logger.error('Failed to generate HyperVerge token', error);
        token = 'error_token_' + randomUUID();
      }
    }

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

  async handleHypervergeWebhook(payload: any) {
    const transactionId = payload.transactionId;
    if (!transactionId) {
      this.logger.error('No transactionId in webhook payload');
      return;
    }

    const application = await this.prisma.kYCApplication.findUnique({
      where: { providerTransactionId: transactionId },
    });

    if (!application) {
      this.logger.error(`KYCApplication not found for transactionId: ${transactionId}`);
      return;
    }

    const eventId = payload.eventId || randomUUID();
    const eventType = payload.event || 'UNKNOWN';

    // Log the event
    await this.prisma.kYCProviderEvent.create({
      data: {
        applicationId: application.id,
        eventId,
        eventType,
        payload: JSON.stringify(payload),
        status: payload.status || 'RECEIVED'
      }
    });

    // Update application based on payload
    const dataToUpdate: any = {};
    if (payload.event === 'pan_verification') {
       dataToUpdate.panStatus = payload.status;
    } else if (payload.event === 'face_liveness') {
       dataToUpdate.faceLivenessStatus = payload.status;
    } else if (payload.event === 'workflow_complete') {
       dataToUpdate.overallStatus = payload.status === 'success' ? 'VERIFIED' : 'FAILED';
       dataToUpdate.status = dataToUpdate.overallStatus;
    }

    if (Object.keys(dataToUpdate).length > 0) {
       await this.prisma.kYCApplication.update({
         where: { id: application.id },
         data: dataToUpdate
       });
    }
  }
}
