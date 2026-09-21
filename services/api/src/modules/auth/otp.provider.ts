import { BadRequestException, Logger } from '@nestjs/common';
import { EmailOtpProvider } from './email.provider';

export type OtpChannel = 'SMS' | 'WHATSAPP' | 'EMAIL';

export interface OtpProvider {
  readonly mode: 'MOCK' | 'NOT_CONFIGURED' | 'CONNECTED' | 'ROUTED';
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
      console.log(`[DEV ONLY] Mock SMS OTP generated for test request.`);
      console.log(`[OTP] channel=${input.channel} mode=mock`);
      console.log(`Contact: ${input.mobile}`);
      console.log(`YOUR OTP CODE IS: ${input.code}`);
      console.log(`======================================================\n`);
    } else {
      console.error(`[SECURITY WARNING] Mock OTP called in production for channel ${input.channel}`);
    }
  }
}

/** MSG91 Integration for real SMS OTP. */
export class Msg91OtpProvider implements OtpProvider {
  readonly mode = 'CONNECTED' as const;
  private readonly logger = new Logger(Msg91OtpProvider.name);

  async send(input: { mobile: string; code: string; channel: OtpChannel }): Promise<void> {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;

    if (!authKey || authKey === 'your_msg91_auth_key_here') {
      throw new BadRequestException("MSG91_AUTH_KEY is not configured.");
    }
    if (!templateId || templateId === 'your_msg91_template_id_here') {
      throw new BadRequestException("MSG91_TEMPLATE_ID is not configured.");
    }

    // MSG91 requires mobile number with country code, usually without '+'. 
    // Example: input.mobile might be '+919876543210', convert to '919876543210'
    const formattedMobile = input.mobile.replace('+', '');

    try {
      const url = `https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${formattedMobile}&authkey=${authKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: input.code }),
      });

      const responseData = await response.json();

      if (responseData.type === 'error') {
        this.logger.error(`MSG91 API Error: ${JSON.stringify(responseData)}`);
        throw new Error(responseData.message || 'MSG91 provider rejected the request.');
      }

      this.logger.log(`[OTP] channel=SMS provider=MSG91 send=success to=${formattedMobile}`);
    } catch (error: any) {
      this.logger.error(`Failed to send SMS OTP to ${input.mobile} via MSG91`, error);
      throw new BadRequestException('Unable to send SMS OTP right now. Please try again.');
    }
  }
}

/** Live Integration for Interakt WhatsApp API. */
export class InteraktOtpProvider implements OtpProvider {
  readonly mode = 'CONNECTED' as const;

  constructor(private readonly interaktService: any) {}

  async send(input: { mobile: string; code: string; channel: OtpChannel }): Promise<void> {
    if (input.channel !== 'WHATSAPP') {
      console.log(`[InteraktOtpProvider] Skipping OTP delivery. Requested channel is ${input.channel}.`);
      return;
    }
    await this.interaktService.sendAuthenticationOtp(input.mobile, input.code);
    console.log(`[OTP] channel=WHATSAPP provider=INTERAKT send=success`);
  }
}

/** Router that selects provider based on the channel. */
export class ChannelRoutingOtpProvider implements OtpProvider {
  readonly mode = 'ROUTED' as const;

  constructor(
    private readonly interaktProvider: InteraktOtpProvider,
    private readonly mockProvider: MockOtpProvider,
    private readonly emailProvider: EmailOtpProvider,
    private readonly msg91Provider: Msg91OtpProvider = new Msg91OtpProvider(),
  ) {}

  async send(input: { mobile: string; code: string; channel: OtpChannel }): Promise<void> {
    if (input.channel === 'WHATSAPP') {
      return this.interaktProvider.send(input);
    }
    
    if (input.channel === 'EMAIL') {
      return this.emailProvider.send(input);
    }
    
    if (input.channel === 'SMS') {
      const smsMode = process.env.OTP_SMS_MODE; // 'mock' or 'msg91'

      if (smsMode === 'msg91') {
        return this.msg91Provider.send(input);
      }

      if (process.env.NODE_ENV === 'production' && smsMode === 'mock') {
         throw new BadRequestException("SMS Provider must be explicitly configured in production. Cannot use mock SMS silently.");
      }

      if (smsMode !== 'mock') {
         throw new BadRequestException("SMS Provider is not currently configured. Please set OTP_SMS_MODE to 'mock' or 'msg91'.");
      }

      return this.mockProvider.send(input);
    }
  }
}
