import { BadRequestException } from '@nestjs/common';
import axios from 'axios';

export type OtpChannel = 'SMS' | 'WHATSAPP' | 'EMAIL';

export interface OtpProvider {
  readonly mode: 'MOCK' | 'NOT_CONFIGURED' | 'CONNECTED';
  send(input: { mobile: string; code: string; channel: OtpChannel }): Promise<void>;
}

/** Development-only provider. */
export class MockOtpProvider implements OtpProvider {
  readonly mode = 'MOCK' as const;

  async send(input: {
    mobile: string;
    code: string;
    channel: OtpChannel;
  }): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n======================================================`);
      console.log(`[DEV MODE] OTP generated for ${input.mobile} via ${input.channel}`);
      console.log(`YOUR OTP CODE IS: ${input.code}`);
      console.log(`======================================================\n`);
    }
  }
}

/** Live Integration for Interakt WhatsApp API. */
export class InteraktOtpProvider implements OtpProvider {
  readonly mode = 'CONNECTED' as const;

  // Uses any to avoid strict DI coupling inside this simple provider layer, 
  // but will receive the injected InteraktService from AuthService.
  constructor(private readonly interaktService: any) {}

  async send(input: { mobile: string; code: string; channel: OtpChannel }): Promise<void> {
    if (input.channel === 'SMS') {
      throw new BadRequestException('SMS OTP is not available yet. Please use WhatsApp.');
    }
    
    if (input.channel !== 'WHATSAPP') {
      console.log(`[InteraktOtpProvider] Skipping OTP delivery. Requested channel is ${input.channel}, but Interakt handles WHATSAPP.`);
      return;
    }
    await this.interaktService.sendAuthenticationOtp(input.mobile, input.code);
  }
}
