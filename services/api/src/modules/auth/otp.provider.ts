import { BadRequestException, Logger } from '@nestjs/common';
import { EmailOtpProvider } from './email.provider';

export type OtpChannel = 'WHATSAPP' | 'EMAIL' | 'SMS';

export interface OtpProvider {
  readonly mode: 'MOCK' | 'NOT_CONFIGURED' | 'CONNECTED' | 'ROUTED';
  send(input: { mobile: string; code: string; channel: OtpChannel }): Promise<void>;
}

/** Development-only provider for testing when live messaging providers are not active. */
export class MockOtpProvider implements OtpProvider {
  readonly mode = 'MOCK' as const;

  async send(input: {
    mobile: string;
    code: string;
    channel: OtpChannel;
  }): Promise<void> {
    if (process.env.NODE_ENV !== 'production' || process.env.AUTH_DEV_BYPASS === 'true') {
      const maskedContact = input.mobile.includes('@')
        ? input.mobile.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(b.length)}${c}`)
        : input.mobile.replace(/(\d{2})\d+(\d{4})/, '$1****$2');

      console.log(`\n======================================================`);
      console.log(`[DEV ONLY] OTP generated for test request.`);
      console.log(`[OTP] channel=${input.channel} mode=mock`);
      console.log(`Contact: ${maskedContact}`);
      console.log(`YOUR OTP CODE IS: ${input.code}`);
      console.log(`======================================================\n`);
    } else {
      console.error(`[SECURITY WARNING] Mock OTP called in production for channel ${input.channel}`);
    }
  }
}

/** Live Integration for Interakt WhatsApp API. */
export class InteraktOtpProvider implements OtpProvider {
  readonly mode = 'CONNECTED' as const;

  constructor(private readonly interaktService: any) {}

  async send(input: { mobile: string; code: string; channel: OtpChannel }): Promise<void> {
    if (input.channel !== 'WHATSAPP') {
      throw new BadRequestException(`Interakt only delivers WHATSAPP OTP. Requested channel: ${input.channel}`);
    }
    await this.interaktService.sendAuthenticationOtp(input.mobile, input.code);
    console.log(`[OTP] channel=WHATSAPP provider=INTERAKT send=success`);
  }
}

/** Live Integration for Mtalkz DLT SMS API. */
export class MtalkzOtpProvider implements OtpProvider {
  readonly mode = 'CONNECTED' as const;
  private readonly logger = new Logger(MtalkzOtpProvider.name);

  async send(input: { mobile: string; code: string; channel: OtpChannel }): Promise<void> {
    if (input.channel !== 'SMS') {
      this.logger.warn(`Skipping Mtalkz delivery. Requested channel is ${input.channel}.`);
      return;
    }
    try {
      const { MtalkzService } = require('../mtalkz/mtalkz.service');
      const service = new MtalkzService();
      await service.sendTemplateSms(input.mobile, [input.code]);
      console.log(`[OTP] channel=SMS provider=MTALKZ send=success`);
    } catch (e: any) {
      this.logger.error(`Mtalkz SMS send failed: ${e?.message}`);
      throw e;
    }
  }
}

/** Router that selects provider based on the channel. */
export class ChannelRoutingOtpProvider implements OtpProvider {
  readonly mode = 'ROUTED' as const;
  private readonly mtalkzProvider = new MtalkzOtpProvider();

  constructor(
    private readonly interaktProvider: InteraktOtpProvider,
    private readonly mockProvider: MockOtpProvider,
    private readonly emailProvider: EmailOtpProvider,
  ) {}

  async send(input: { mobile: string; code: string; channel: OtpChannel }): Promise<void> {
    if (input.channel === 'SMS') {
      const smsMode = (process.env.OTP_SMS_MODE || 'mock').toLowerCase();
      if (smsMode === 'mtalkz' && process.env.MTALKZ_API_KEY) {
        return this.mtalkzProvider.send(input);
      }
      return this.mockProvider.send(input);
    }

    if (input.channel === 'WHATSAPP') {
      const useMock = (process.env.OTP_PROVIDER ?? '').toLowerCase() === 'mock';
      if (useMock && process.env.NODE_ENV !== 'production') {
        return this.mockProvider.send(input);
      }
      return this.interaktProvider.send(input);
    }

    if (input.channel === 'EMAIL') {
      const useMock = (process.env.OTP_PROVIDER ?? '').toLowerCase() === 'mock';
      if (useMock && process.env.NODE_ENV !== 'production') {
        return this.mockProvider.send(input);
      }
      return this.emailProvider.send(input);
    }

    throw new BadRequestException('Unsupported OTP channel. Please choose WhatsApp, SMS, or Email.');
  }
}
