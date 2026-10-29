import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CybrillaService } from '../cybrilla/cybrilla.service';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cybrilla: CybrillaService,
  ) {}

  async startKyc(userId: string, fullName: string, pan: string, dob: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true, guardian: true } });
    const isMinor = user?.profile?.investorType === 'MINOR';

    let targetPan = pan;
    let targetDob = dob;

    if (isMinor) {
      if (!user?.guardian || !user.guardian.pan) {
        throw new BadRequestException('Guardian PAN is required for minor KYC verification.');
      }
      targetPan = user.guardian.pan;
    } else {
      if (!fullName || !pan || !dob) {
        throw new BadRequestException('fullName, pan, and dob are required to start KYC.');
      }
    }

    let application = await this.prisma.kYCApplication.findUnique({ where: { userId } });
    if (!application) {
      application = await this.prisma.kYCApplication.create({
        data: { userId, provider: 'CYBRILLA', status: 'IN_PROGRESS' },
      });
    }

    let result: any;
    try {
      result = await this.cybrilla.verifyPan(targetPan, fullName, targetDob);
    } catch (e: any) {
      // Every failure has to land the application in a terminal state, not just a
      // provider outage. The row is created as IN_PROGRESS before this call and the
      // providerTransactionId is only set on success, so a rejected PAN used to leave a
      // row that was IN_PROGRESS with no transaction id - which getKycStatus can never
      // poll, because its polling branch requires that id. The user was then shown
      // "verification in progress" forever for what was actually a rejection, and
      // /buckets/:id/invest kept refusing because panStatus never reached VERIFIED.
      const isProviderOutage =
        e.response?.code === 'KYC_PROVIDER_ERROR' || e.message?.includes('temporarily unavailable');

      await this.prisma.kYCApplication.update({
        where: { id: application.id },
        data: {
          status: 'FAILED',
          failureReason: isProviderOutage ? 'Provider unavailable' : (e?.message ?? 'Verification failed'),
        },
      });

      throw e;
    }

    const evaluated = this.evaluateVerification(result);

    application = await this.prisma.kYCApplication.update({
      where: { id: application.id },
      data: { provider: 'CYBRILLA', providerTransactionId: result.id, ...evaluated },
    });

    // Retain the submitted identity details so later steps (e.g. investing) don't need to ask again.
    await this.prisma.userProfile.upsert({
      where: { userId },
      update: { fullName, pan, dateOfBirth: new Date(dob) },
      create: { userId, fullName, pan, dateOfBirth: new Date(dob) },
    });

    // The status is reported as it is. Pre-verification is asynchronous, so the first
    // answer is usually IN_PROGRESS; the app polls GET /kyc/status until it settles.
    return {
      transactionId: result.id,
      status: evaluated.overallStatus,
      readinessStatus: evaluated.readinessStatus,
      message: describeKycFailure(evaluated.readinessCode, evaluated.failureReason),
      providerResponse: result,
    };
  }

  async getKycStatus(userId: string) {
    let application = await this.prisma.kYCApplication.findUnique({
      where: { userId },
      include: { verifications: true },
    });

    if (application?.status === 'IN_PROGRESS' && application.providerTransactionId) {
      try {
        const result = await this.cybrilla.fetchPreVerification(application.providerTransactionId);
        const evaluated = this.evaluateVerification(result);

        if (evaluated.overallStatus !== application.status) {
          application = await this.prisma.kYCApplication.update({
            where: { id: application.id },
            data: evaluated,
            include: { verifications: true },
          });
        }
      } catch (error) {
        this.logger.warn(`Could not poll pre-verification status for user ${userId}: ${(error as Error).message}`);
      }
    }

    return application
      ? { ...application, message: describeKycFailure(application.readinessCode, application.failureReason) }
      : application;
  }

  /**
   * Maps a Cybrilla pre-verification response onto our KYCApplication fields.
   *
   * `readiness` is the check that matters for investing: it says whether the investor's
   * KYC is complete at the KRA. PAN, name and date of birth can all match while readiness
   * fails, and the gateway then fails every order with pan_kyc_incomplete - so an
   * investor is VERIFIED only when all four pass.
   */
  evaluateVerification(result: any) {
    const fields = ['readiness', 'pan', 'name', 'date_of_birth'];
    const allVerified = fields.every((field) => result[field]?.status === 'verified');
    const overallStatus = result.status === 'completed' ? (allVerified ? 'VERIFIED' : 'FAILED') : 'IN_PROGRESS';
    const failureReason = allVerified
      ? null
      : fields
          .map((field) => (result[field]?.status === 'failed' ? `${field}: ${result[field]?.code ?? result[field]?.reason}` : null))
          .filter(Boolean)
          .join('; ') || null;

    return {
      panStatus: result.pan?.status === 'verified' ? 'VERIFIED' : result.pan?.status === 'failed' ? 'FAILED' : 'PENDING',
      readinessStatus: result.readiness?.status === 'verified' ? 'VERIFIED' : result.readiness?.status === 'failed' ? 'FAILED' : 'PENDING',
      readinessCode: result.readiness?.code ?? null,
      overallStatus,
      status: overallStatus,
      failureReason,
      completedAt: result.status === 'completed' ? new Date(result.completed_at ?? Date.now()) : null,
    };
  }
}

/**
 * What the investor is told for each failed check, using the codes Cybrilla documents
 * for pre-verification. `reason` from the gateway is for diagnosis, not for display.
 */
const READINESS_MESSAGES: Record<string, string> = {
  kyc_unavailable: 'We could not find a KYC record for your PAN. You need to complete KYC with a KRA before investing.',
  kyc_rejected: 'Your KYC was rejected by the KRA. You need to complete KYC again before investing.',
  kyc_incomplete: 'Your KYC record at the KRA is incomplete. It must be updated before you can invest.',
  kyc_onhold: 'Your KYC record at the KRA is on hold. It must be updated before you can invest.',
  kyc_legacy: 'Your KYC was done under an older process and must be updated before you can invest.',
  kyc_underprocess: 'Your KYC is still being validated by the KRA. Please check again later.',
  kyc_deactivated: 'Your KYC has been deactivated, so investments cannot be accepted.',
  unknown: 'We could not confirm your KYC status with the KRA. Please contact support so we can check it.',
  upstream_error: 'Your KYC status could not be checked right now. Please try again shortly.',
};

const CHECK_MESSAGES: Record<string, string> = {
  'pan:invalid': 'This PAN is not valid.',
  'pan:aadhaar_not_linked': 'Your PAN is not linked to Aadhaar. Link them on the Income Tax portal, then try again.',
  'name:mismatch': 'The name does not match the name on your PAN.',
  'date_of_birth:mismatch': 'The date of birth does not match the one on your PAN.',
};

/**
 * One plain sentence for the app, from the stored failure reason. Readiness comes first
 * because it is the one the investor usually has to act on outside the app.
 */
export function describeKycFailure(readinessCode: string | null, failureReason: string | null): string | null {
  if (readinessCode && READINESS_MESSAGES[readinessCode]) return READINESS_MESSAGES[readinessCode];
  for (const part of (failureReason ?? '').split(';').map((p) => p.trim())) {
    const [field, code] = part.split(':').map((p) => p.trim());
    if (CHECK_MESSAGES[`${field}:${code}`]) return CHECK_MESSAGES[`${field}:${code}`];
  }
  if (failureReason?.includes('upstream_error')) return 'Verification could not be completed right now. Please try again shortly.';
  return failureReason ? 'Your details could not be verified.' : null;
}
