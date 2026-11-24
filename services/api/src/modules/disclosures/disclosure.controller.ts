import { Controller, Get, Query } from '@nestjs/common';
import { DisclosureService } from './disclosure.service';

@Controller('disclosures')
export class DisclosureController {
  constructor(private readonly disclosures: DisclosureService) {}

  @Get('terms')
  terms(@Query('locale') locale?: string) {
    return this.disclosures.terms(locale);
  }

  @Get('market-risk')
  marketRisk(@Query('locale') locale?: string) {
    return this.disclosures.marketRisk(locale);
  }
}
