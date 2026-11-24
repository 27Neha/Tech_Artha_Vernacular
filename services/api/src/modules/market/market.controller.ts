import { Controller, Get, Query } from '@nestjs/common';
import { MarketService } from './market.service';
import type {
  DailyMoneyLesson,
  MarketNewsItem,
  MarketOverviewResponse,
  MarketQuiz,
  PersonalMarketBrief,
} from './market.interfaces';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('overview')
  getOverview(): MarketOverviewResponse {
    return this.marketService.getMarketOverview();
  }

  @Get('news')
  getNews(@Query('category') category?: string): MarketNewsItem[] {
    return this.marketService.getMarketNews(category);
  }

  @Get('brief')
  getBrief(
    @Query('riskProfile') riskProfile?: string,
    @Query('goalName') goalName?: string,
  ): PersonalMarketBrief {
    return this.marketService.getPersonalMarketBrief(riskProfile, goalName);
  }

  @Get('daily')
  getDailyContent(): { lesson: DailyMoneyLesson; quiz: MarketQuiz } {
    return this.marketService.getDailyContent();
  }
}
