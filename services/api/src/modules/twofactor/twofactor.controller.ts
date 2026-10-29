import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { TwoFactorService } from './twofactor.service';
import { RequestTransactionOtpDto } from './twofactor.dto';

@Controller('transactions/2fa')
@UseGuards(AccessTokenGuard)
export class TwoFactorController {
  constructor(private readonly twoFactor: TwoFactorService) {}

  /**
   * Issues a code for the transaction described in the body. The same parameters must
   * then be sent to the transaction endpoint, or the authorisation will not match.
   */
  @Post('challenge')
  challenge(@CurrentUser() user: AuthenticatedUser, @Body() dto: RequestTransactionOtpDto) {
    const { channel, ...payload } = dto;
    return this.twoFactor.challenge(user.id, payload, channel ?? 'WHATSAPP');
  }
}
