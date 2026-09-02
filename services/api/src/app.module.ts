import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KycModule } from './modules/kyc/kyc.module';
import { FundsModule } from './modules/funds/funds.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { HypervergeModule } from './integrations/hyperverge/hyperverge.module';
import { RiskModule } from './modules/risk/risk.module';
import { GoalModule } from './modules/goal/goal.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { ConsentModule } from './modules/consent/consent.module';
import { DisclosureModule } from './modules/disclosures/disclosure.module';
import { BucketsModule } from './modules/buckets/buckets.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { LearningModule } from './modules/learning/learning.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { VoiceModule } from './modules/voice/voice.module';
import { ApiHealthModule } from './modules/api-health/api-health.module';
import { WhatsappModule } from './integrations/whatsapp/whatsapp.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { InteraktModule } from './integrations/interakt/interakt.module';
import { CybrillaModule } from './modules/cybrilla/cybrilla.module';

@Module({
  imports: [
    KycModule,
    FundsModule,
    AuthModule,
    PrismaModule,
    HypervergeModule,
    RiskModule,
    GoalModule,
    PortfolioModule,
    ConsentModule,
    DisclosureModule,
    BucketsModule,
    ExpensesModule,
    LearningModule,
    AssistantModule,
    VoiceModule,
    ApiHealthModule,
    WhatsappModule,
    RecommendationsModule,
    InteraktModule,
    CybrillaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
