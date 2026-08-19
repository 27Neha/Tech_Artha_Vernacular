import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { BucketsController } from './buckets.controller';
import { BucketsService } from './buckets.service';

@Module({ imports: [AuthModule, PrismaModule], controllers: [BucketsController], providers: [BucketsService], exports: [BucketsService] })
export class BucketsModule {}
