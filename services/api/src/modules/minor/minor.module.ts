import { Module } from '@nestjs/common';
import { MinorController } from './minor.controller';
import { MinorService } from './minor.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module'; // To use OtpProvider

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MinorController],
  providers: [MinorService],
  exports: [MinorService]
})
export class MinorModule {}
