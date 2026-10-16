import { Module } from '@nestjs/common';
import { NomineeController } from './nominee.controller';
import { NomineeService } from './nominee.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NomineeController],
  providers: [NomineeService],
})
export class NomineeModule {}
