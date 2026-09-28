import { Module } from '@nestjs/common';
import { ZohoTokenService } from './zoho-token.service';
import { ZohoCrmProvider } from './zoho-crm.provider';

/**
 * Zoho CRM integration. No controller by design - nothing should reach the CRM from the
 * public API surface; other modules inject ZohoCrmProvider and sync as a side effect of
 * their own domain events.
 */
@Module({
  providers: [ZohoTokenService, ZohoCrmProvider],
  exports: [ZohoCrmProvider, ZohoTokenService],
})
export class CrmModule {}
