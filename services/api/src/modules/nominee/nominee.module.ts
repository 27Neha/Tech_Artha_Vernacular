import { Module } from '@nestjs/common';
import { NomineeController } from './nominee.controller';
import { NomineeService } from './nominee.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CybrillaModule } from '../cybrilla/cybrilla.module';

@Module({
  imports: [PrismaModule, AuthModule, CybrillaModule],
  controllers: [NomineeController],
  providers: [NomineeService],
  exports: [NomineeService],
})
export class NomineeModule {}
