import { Module } from '@nestjs/common';
import { FundsController } from './funds.controller';
import { FundsService } from './funds.service';
import { MFAPIProvider } from './mfapi.provider';

@Module({
  controllers: [FundsController],
  providers: [FundsService, MFAPIProvider],
  exports: [FundsService],
})
export class FundsModule {}
