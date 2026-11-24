import { Controller, Post, Body, UseGuards, ServiceUnavailableException } from '@nestjs/common';
import { AccessTokenGuard } from '../../common/auth';
import { CybrillaService } from './cybrilla.service';
import { isBankLinkingEnabled } from '../../common/feature-flags';

@Controller('cybrilla/sandbox')
@UseGuards(AccessTokenGuard)
export class CybrillaController {
  constructor(private readonly cybrillaService: CybrillaService) {}

  @Post('investor-profile')
  async createInvestorProfile(@Body() body: any) {
    return this.cybrillaService.createInvestorProfile(body);
  }

  @Post('bank-account')
  async createBankAccount(@Body() body: any) {
    if (!isBankLinkingEnabled()) {
      throw new ServiceUnavailableException({
        code: 'FEATURE_DISABLED',
        message: 'Bank linking is currently unavailable pending regulatory clearances.',
      });
    }
    return this.cybrillaService.createBankAccount(body);
  }
}
