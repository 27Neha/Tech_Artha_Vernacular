import { BadRequestException, Logger } from '@nestjs/common';
import { EmailOtpProvider } from './email.provider';

export type OtpChannel = 'WHATSAPP' | 'EMAIL' | 'SMS';

export interface OtpProvider {
  readonly mode: 'MOCK' | 'NOT_CONFIGURED' | 'CONNECTED' | 'ROUTED';
  send(input: {
    mobile: string;
    code: string;
    channel: OtpChannel;
    subject?: string;
    heading?: string;
    description?: string;
  }): Promise<void>;
}

/** Development-only provider for testing when live messaging providers are not active. */
export class MockOtpProvider implements OtpProvider {
  readonly mode = 'MOCK' as const;

  async send(input: {
    mobile: string;
    code: string;
    channel: OtpChannel;
    subject?: string;
    heading?: string;
    description?: string;
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
    }
  }
}

/**
 * Interakt WhatsApp OTP provider.
 *
 * Interakt is a WhatsApp-only platform: sendOtpHelper() maps to an approved WhatsApp
 * template. It cannot deliver SMS or email.
 */
export class InteraktOtpProvider implements OtpProvider {
  readonly mode = 'CONNECTED' as const;
  private readonly logger = new Logger(InteraktOtpProvider.name);

  constructor(private readonly interaktService: any) {}

  async send(input: {
    mobile: string;
    code: string;
    channel: OtpChannel;
    subject?: string;
    heading?: string;
    description?: string;
  }): Promise<void> {
    if (input.channel !== 'WHATSAPP') {
      return;
    }

    try {
      await this.interaktService.sendOtpHelper(input.mobile, input.code);
    } catch (err: any) {
      this.logger.error(`[OTP] Interakt delivery failed for ${input.mobile}: ${err.message}`);
      throw err;
    }
  }
}

/**
 * Routes each OTP dispatch to the provider built for that channel.
 *
 * WhatsApp -> Interakt
 * Email    -> EmailOtpProvider (ZeptoMail / mock in dev)
 * SMS      -> msg91 when live; MockOtpProvider when OTP_SMS_MODE=mock
 */
export class ChannelRoutingOtpProvider implements OtpProvider {
  readonly mode = 'ROUTED' as const;
  private readonly logger = new Logger(ChannelRoutingOtpProvider.name);

  constructor(
    private readonly whatsappProvider: OtpProvider,
    private readonly smsProvider: OtpProvider,
    private readonly emailProvider: OtpProvider,
  ) {}

  async send(input: {
    mobile: string;
    code: string;
    channel: OtpChannel;
    subject?: string;
    heading?: string;
    description?: string;
  }): Promise<void> {
    switch (input.channel) {
      case 'WHATSAPP':
        return this.whatsappProvider.send(input);

      case 'SMS':
        return this.smsProvider.send(input);

      case 'EMAIL':
        return this.emailProvider.send(input);

      default:
        this.logger.error(`[OTP] No provider registered for channel ${input.channel}`);
        throw new BadRequestException(`Delivery channel ${input.channel} is not supported.`);
    }
  }
}
