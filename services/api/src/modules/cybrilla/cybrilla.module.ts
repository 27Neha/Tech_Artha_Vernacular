import { Module } from '@nestjs/common';
import { CybrillaService } from './cybrilla.service';
import { CybrillaController } from './cybrilla.controller';

@Module({
  controllers: [CybrillaController],
  providers: [CybrillaService],
  exports: [CybrillaService],
})
export class CybrillaModule {}
