import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { BSEAuthService } from './bse-auth.service';
import { BSEClientService } from './bse-client.service';

@Controller('api/v1/bse')
@UseGuards(AccessTokenGuard)
export class BseController {
  constructor(
    private readonly bseAuthService: BSEAuthService,
    private readonly bseClientService: BSEClientService
  ) {}

  @Get('test-auth')
  async testAuth() {
    // Fetches the session token using SOAP XML
    const token = await this.bseAuthService.getSessionToken();
    return { success: true, message: "Successfully authenticated with BSE StAR MF", token };
  }

  @Post('test-register')
  async testRegister(@CurrentUser() user: AuthenticatedUser) {
    // Generates the massive 75-field pipe string and hits the JSON ClientMaster API
    return this.bseClientService.registerClient(user.id);
  }
}
