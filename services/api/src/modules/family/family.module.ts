import { Module } from '@nestjs/common';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { BucketsModule } from '../buckets/buckets.module';

@Module({
  imports: [PrismaModule, BucketsModule],
  controllers: [FamilyController],
  providers: [FamilyService],
  exports: [FamilyService],
})
export class FamilyModule {}
