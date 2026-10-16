import { Module } from '@nestjs/common';
import { RedemptionController } from './redemption.controller';
import { RedemptionService } from './redemption.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CybrillaModule } from '../cybrilla/cybrilla.module';

@Module({
  imports: [PrismaModule, AuthModule, CybrillaModule],
  controllers: [RedemptionController],
  providers: [RedemptionService],
})
export class RedemptionModule {}
