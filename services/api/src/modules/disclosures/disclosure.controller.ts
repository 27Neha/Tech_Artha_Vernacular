import { Controller, Get, Query } from '@nestjs/common';
import { DisclosureService } from './disclosure.service';

@Controller('disclosures')
export class DisclosureController {
  constructor(private readonly disclosures: DisclosureService) {}

  @Get('market-risk')
  marketRisk(@Query('locale') locale?: string) {
    return this.disclosures.marketRisk(locale);
  }
}
