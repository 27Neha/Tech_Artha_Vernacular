import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { FamilyService } from './family.service';

@Controller('family')
@UseGuards(AccessTokenGuard)
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get()
  getFamilyPortfolio(@CurrentUser() user: AuthenticatedUser) {
    return this.familyService.getFamilyPortfolio(user.id);
  }

  @Post()
  createFamilyPortfolio(@CurrentUser() user: AuthenticatedUser, @Body('name') name: string) {
    return this.familyService.createFamilyPortfolio(user.id, name);
  }

  @Post('members')
  addFamilyMember(@CurrentUser() user: AuthenticatedUser, @Body('mobile') mobile: string) {
    return this.familyService.addFamilyMember(user.id, mobile);
  }
}
