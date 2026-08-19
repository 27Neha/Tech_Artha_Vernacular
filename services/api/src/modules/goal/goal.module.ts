import { Module } from '@nestjs/common';
import { GoalController } from './goal.controller';
import { GoalService } from './goal.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { BucketsModule } from '../buckets/buckets.module';
import { GoalCalculatorService } from './goal-calculator.service';

@Module({
  imports: [PrismaModule, AuthModule, ConsentModule, BucketsModule],
  controllers: [GoalController],
  providers: [GoalService, GoalCalculatorService],
})
export class GoalModule {}
