import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { FundsService } from './funds.service';

@Controller('funds')
export class FundsController {
  constructor(private readonly fundsService: FundsService) {}

  @Get('search')
  searchFunds(@Query('q') query: string) {
    if (!query?.trim()) throw new BadRequestException('A fund search query is required.');
    return this.fundsService.searchFunds(query).then((items) => ({ source: 'MFAPI_PUBLIC_REFERENCE_ONLY', authoritativeForTransactions: false, items }));
  }
}
