import { Module } from '@nestjs/common';
import { BSEAuthService } from './bse-auth.service';
import { BSEClientService } from './bse-client.service';
import { BSEProvider } from './bse.provider';
import { PrismaModule } from '../../prisma/prisma.module';
import { BseController } from './bse.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BseController],
  providers: [BSEAuthService, BSEClientService, BSEProvider],
  exports: [BSEAuthService, BSEClientService, BSEProvider],
})
export class BseModule {}
