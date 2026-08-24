import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { ConsentService } from './consent.service';

@Controller('consents')
@UseGuards(AccessTokenGuard)
export class ConsentController {
  constructor(private readonly consents: ConsentService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.consents.list(user.id);
  }

  @Post()
  @HttpCode(201)
  grant(@CurrentUser() user: AuthenticatedUser, @Body() body: { type?: string; provider?: string; deviceId?: string }) {
    return this.consents.grant({ userId: user.id, type: body.type ?? '', provider: body.provider, deviceId: body.deviceId, source: 'APP' });
  }

  @Post(':id/revoke')
  @HttpCode(200)
  revoke(@CurrentUser() user: AuthenticatedUser, @Param('id') consentId: string) {
    return this.consents.revoke(user.id, consentId, 'APP');
  }
}
