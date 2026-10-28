import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { MandatesService } from './mandates.service';

@Controller('mandates')
@UseGuards(AccessTokenGuard)
export class MandatesController {
  constructor(private readonly mandates: MandatesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.mandates.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: { mandateType?: string; mandateLimit?: number }) {
    return this.mandates.create(user.id, { mandateType: body.mandateType, mandateLimit: body.mandateLimit });
  }

  @Post(':id/authorize')
  reauthorize(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.mandates.reauthorize(user.id, id);
  }
}
