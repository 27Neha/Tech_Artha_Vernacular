import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CybrillaModule } from '../cybrilla/cybrilla.module';

@Module({
  imports: [PrismaModule, CybrillaModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
