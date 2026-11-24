import { Module } from '@nestjs/common';
import { ZohoCrmService } from './zoho.service';

@Module({
  providers: [ZohoCrmService],
  exports: [ZohoCrmService],
})
export class ZohoModule {}
