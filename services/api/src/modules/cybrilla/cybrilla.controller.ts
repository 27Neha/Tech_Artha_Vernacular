import { Controller, Post, Body } from '@nestjs/common';
import { CybrillaService } from './cybrilla.service';

@Controller('cybrilla/sandbox')
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
