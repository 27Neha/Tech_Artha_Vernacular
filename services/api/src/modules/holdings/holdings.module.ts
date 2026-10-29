import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CybrillaModule } from '../cybrilla/cybrilla.module';
import { HoldingsService } from './holdings.service';

@Module({
  imports: [PrismaModule, CybrillaModule],
  providers: [HoldingsService],
  exports: [HoldingsService],
})
export class HoldingsModule {}
