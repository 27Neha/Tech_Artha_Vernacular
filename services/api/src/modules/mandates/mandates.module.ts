import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CybrillaModule } from '../cybrilla/cybrilla.module';
import { MandatesController } from './mandates.controller';
import { MandatesService } from './mandates.service';

@Module({
  imports: [PrismaModule, AuthModule, CybrillaModule],
  controllers: [MandatesController],
  providers: [MandatesService],
  exports: [MandatesService],
})
export class MandatesModule {}
