import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../common/auth';
import { CybrillaService } from './cybrilla.service';

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
    return this.cybrillaService.createBankAccount(body);
  }
}
