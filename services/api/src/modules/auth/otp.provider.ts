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

/** Live Integration for Gupshup Enterprise SMS API. */
export class GupshupOtpProvider implements OtpProvider {
  readonly mode = 'CONNECTED' as const;

  async send(input: { mobile: string; code: string; channel: OtpChannel }): Promise<void> {
    const userid = process.env.GUPSHUP_USER_ID;
    const password = process.env.GUPSHUP_PASSWORD;

    if (!userid || !password) {
      throw new Error('Gupshup SMS delivery is NOT CONFIGURED \u2014 Missing GUPSHUP_USER_ID or GUPSHUP_PASSWORD in .env');
    }

    const destination = input.mobile.replace('+', '');
    const messageText = encodeURIComponent(`Welcome to TechArtha! Your one-time verification code is ${input.code}. Do not share this with anyone.`);

    try {
      const url = `http://enterprise.smsgupshup.com/GatewayAPI/rest?userid=${userid}&password=${password}&send_to=${destination}&msg=${messageText}&method=SendMessage&msg_type=text&format=text&auth_scheme=plain&v=1.1`;
      
      const response = await axios.get(url);
      
      if (response.data && response.data.includes('error')) {
         throw new Error(`Gupshup API Error: ${response.data}`);
      }
      
      console.log(`Successfully sent Gupshup SMS message to ${destination}`);
    } catch (error: any) {
      console.error('Failed to send Gupshup SMS message:', error.message);
      throw new Error('Failed to send SMS OTP via Gupshup API');
    }
  }
}

/** Placeholder until a company-approved SMS/WhatsApp/email provider is configured. */
export class ProductionOtpProvider implements OtpProvider {
  readonly mode = 'NOT_CONFIGURED' as const;

  async send(): Promise<void> {
    throw new Error('OTP delivery is NOT CONFIGURED \u2014 CREDENTIAL REQUIRED.');
  }
}
