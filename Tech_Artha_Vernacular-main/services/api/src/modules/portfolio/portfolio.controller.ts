import { Controller, Get, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { PortfolioService } from './portfolio.service';

@Controller('portfolio')
@UseGuards(AccessTokenGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  getPortfolio(@CurrentUser() user: AuthenticatedUser) {
    return this.portfolioService.getPortfolio(user.id);
  }
}
