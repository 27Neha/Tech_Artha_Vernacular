import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CybrillaService } from '../cybrilla/cybrilla.service';
import { TwoFactorService } from '../twofactor/twofactor.service';
import { CreateRedemptionDto } from './redemption.dto';

/**
 * Redemptions - Cybrilla compliance points 6 and 9.
 *
 * Holdings come from GET /v2/mf_folios, never from our own tables: the gateway rejects a
 * folio_number it does not recognise with `invalid_folio`, so anything we invented would
 * fail at the point of sale anyway. If that call fails we say we could not read the
 * holdings, which is different from saying there are none - showing "nothing to redeem"
 * because of a network error would tell an investor their money is gone.
 */
@Injectable()
export class RedemptionService {
  private readonly logger = new Logger(RedemptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cybrilla: CybrillaService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  /** The folios this investor can sell from, with what is actually redeemable. */
  async holdings(userId: string) {
    const account = await this.accountFor(userId);
    if (!account) {
      return {
        holdings: [],
        canRedeem: false,
        message: 'You do not have an investment account yet, so there is nothing to redeem.',
      };
    }

    const folios = await this.cybrilla.fetchFolios(account.fpAccountId);
    if (folios === null) {
      return {
        holdings: [],
        canRedeem: false,
        // Deliberately not "you have no holdings": we do not know that.
        message: 'We could not read your holdings just now. Please try again in a moment.',
      };
    }

    const holdings = folios
      .map((folio: any) => ({
        folioNumber: folio.folio_number ?? folio.number,
        schemeIsin: folio.scheme ?? folio.isin,
        schemeName: folio.scheme_name ?? folio.name ?? null,
        units: Number(folio.units ?? folio.unit_balance ?? 0),
        redeemableUnits: Number(folio.redeemable_units ?? folio.units ?? folio.unit_balance ?? 0),
        currentValue: folio.current_value != null ? Number(folio.current_value) : null,
      }))
      .filter((h: any) => h.folioNumber && h.redeemableUnits > 0);

    return {
      holdings,
      canRedeem: holdings.length > 0,
      message:
        holdings.length > 0
          ? 'Select a holding to withdraw from.'
          : 'You have no units available to redeem yet. Holdings appear here once a purchase has been allotted by the AMC.',
    };
  }

  async create(userId: string, dto: CreateRedemptionDto, userIp: string) {
    const account = await this.accountFor(userId);
    if (!account) throw new BadRequestException('You do not have an investment account yet.');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) {
      // Same rule as a purchase: the AMC emails the contract note for this trade.
      throw new BadRequestException('Verify your email address before withdrawing.');
    }

    const { amount, units } = await this.resolveQuantity(account.fpAccountId, dto);

    // Authorised before anything is written or sent. The code is checked against these
    // exact figures, so a code issued for a different folio or amount is refused.
    await this.twoFactor.verifyAndConsume(
      userId,
      {
        action: 'REDEMPTION',
        amount,
        units,
        schemeIsin: dto.schemeIsin,
        folioNumber: dto.folioNumber,
        fullExit: dto.fullExit,
      },
      dto.challengeId,
      dto.otp,
    );

    // Written before the call so a gateway failure still leaves a record the investor
    // and support can see, rather than a withdrawal that simply never happened.
    const record = await this.prisma.fpRedemptionOrder.create({
      data: {
        accountId: account.id,
        schemeIsin: dto.schemeIsin,
        folioNumber: dto.folioNumber,
        amount: amount ?? null,
        units: units ?? null,
        isFullExit: !!dto.fullExit,
        status: 'PENDING',
      },
    });

    try {
      const result = await this.cybrilla.createRedemption({
        mfInvestmentAccount: account.fpAccountId,
        scheme: dto.schemeIsin,
        folioNumber: dto.folioNumber,
        userIp,
        amount,
        units,
      });

      const fpId = result?.id ?? result?.data?.id ?? null;

      // A created redemption sits unconfirmed and never progresses on its own - the same
      // step that left every early purchase stuck at `confirmed_at: null`.
      let state = result?.state ?? 'under_review';
      try {
        const confirmed = await this.cybrilla.confirmRedemption(
          fpId,
          user.email,
          user.mobile.replace(/^\+?91/, ''),
        );
        state = confirmed?.state ?? state;
      } catch {
        this.logger.warn(`Redemption ${fpId} created but could not be confirmed.`);
      }

      const updated = await this.prisma.fpRedemptionOrder.update({
        where: { id: record.id },
        data: { fpRedemptionId: fpId, status: this.mapState(state) },
      });

      return {
        redemptionId: updated.id,
        status: updated.status,
        folioNumber: updated.folioNumber,
        amount: updated.amount,
        units: updated.units,
        message:
          'Your withdrawal has been placed. Settlement usually takes 2-4 working days, and the amount is credited to your registered bank account.',
      };
    } catch (error) {
      await this.prisma.fpRedemptionOrder.update({
        where: { id: record.id },
        data: {
          status: 'FAILED',
          failureReason: error instanceof Error ? error.message.slice(0, 480) : 'Unknown error',
        },
      });
      throw error;
    }
  }

  async list(userId: string) {
    const account = await this.accountFor(userId);
    if (!account) return { redemptions: [] };

    const redemptions = await this.prisma.fpRedemptionOrder.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      redemptions: redemptions.map((r) => ({
        id: r.id,
        schemeIsin: r.schemeIsin,
        folioNumber: r.folioNumber,
        amount: r.amount,
        units: r.units,
        isFullExit: r.isFullExit,
        status: r.status,
        failureReason: r.failureReason,
        placedAt: r.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Turns the request into exactly one of amount or units, which is all the gateway
   * accepts. A full exit is resolved against the live folio balance rather than a number
   * the client supplied, so it cannot overshoot into a rejected order.
   */
  private async resolveQuantity(fpAccountId: string, dto: CreateRedemptionDto) {
    const specified = [dto.amount != null, dto.units != null, !!dto.fullExit].filter(Boolean).length;
    if (specified !== 1) {
      throw new BadRequestException('Choose either an amount, a number of units, or a full withdrawal.');
    }

    if (!dto.fullExit) return { amount: dto.amount, units: dto.units };

    const folios = await this.cybrilla.fetchFolios(fpAccountId);
    if (folios === null) {
      throw new BadRequestException('We could not read your holdings just now. Please try again in a moment.');
    }
    const folio = folios.find(
      (f: any) => (f.folio_number ?? f.number) === dto.folioNumber && (f.scheme ?? f.isin) === dto.schemeIsin,
    );
    const balance = Number(folio?.redeemable_units ?? folio?.units ?? folio?.unit_balance ?? 0);
    if (!folio || balance <= 0) {
      throw new BadRequestException('That holding has no units available to redeem.');
    }
    return { amount: undefined, units: balance };
  }

  private async accountFor(userId: string) {
    const investorProfile = await this.prisma.fpInvestorProfile.findUnique({ where: { userId } });
    if (!investorProfile) return null;
    return this.prisma.fpMfInvestmentAccount.findFirst({
      where: { investorProfileId: investorProfile.id },
    });
  }

  /** Gateway states collapsed to the three an investor needs to understand. */
  private mapState(state: string) {
    const normalized = (state ?? '').toLowerCase();
    if (['succeeded', 'success', 'completed', 'confirmed'].includes(normalized)) return 'CONFIRMED';
    if (['failed', 'rejected', 'cancelled', 'reversed'].includes(normalized)) return 'FAILED';
    return 'PENDING';
  }
}
