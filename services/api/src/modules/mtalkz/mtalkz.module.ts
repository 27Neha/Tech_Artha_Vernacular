import { Module } from '@nestjs/common';
import { MtalkzService } from './mtalkz.service';

@Module({
  providers: [MtalkzService],
  exports: [MtalkzService],
})
export class MtalkzModule {}
