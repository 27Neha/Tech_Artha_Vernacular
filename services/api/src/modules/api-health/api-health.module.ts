import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ApiHealthController } from './api-health.controller';
import { ApiHealthService } from './api-health.service';

@Module({ imports: [PrismaModule], controllers: [ApiHealthController], providers: [ApiHealthService], exports: [ApiHealthService] })
export class ApiHealthModule {}
