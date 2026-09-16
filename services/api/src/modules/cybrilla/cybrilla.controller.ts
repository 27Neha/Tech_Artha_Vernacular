import { Controller, Post, Get, Body, Param, BadRequestException } from '@nestjs/common';
import { CybrillaService } from './cybrilla.service';

@Controller('cybrilla/sandbox')
export class CybrillaController {
  constructor(private readonly cybrillaService: CybrillaService) {}

  @Post('kyc-status')
  async checkKycStatus(@Body() body: { pan: string }) {
    if (!body?.pan || typeof body.pan !== 'string' || !/^[a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1}$/.test(body.pan)) {
      throw new BadRequestException('A valid 10-character PAN is required');
    }
    return this.cybrillaService.testKycStatusCheck(body.pan.toUpperCase());
  }

  @Post('investor-profile')
  async createInvestorProfile(@Body() body: any) {
    return this.cybrillaService.createInvestorProfile(body);
  }

  @Post('bank-account')
  async createBankAccount(@Body() body: any) {
    return this.cybrillaService.createBankAccount(body);
  }

  @Get('bank-accounts/:profileId')
  async getBankAccounts(@Param('profileId') profileId: string) {
    return this.cybrillaService.getBankAccounts(profileId);
  }

  @Post('mandates')
  async createMandate(@Body() body: any) {
    return this.cybrillaService.createMandate(body);
  }

  @Get('mandates/:profileId')
  async getMandates(@Param('profileId') profileId: string) {
    return this.cybrillaService.getMandates(profileId);
  }
}

