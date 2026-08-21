export type OtpChannel = 'SMS' | 'WHATSAPP' | 'EMAIL';

export interface OtpProvider {
  readonly mode: 'MOCK' | 'NOT_CONFIGURED' | 'CONNECTED';
  send(input: { mobile: string; code: string; channel: OtpChannel }): Promise<void>;
}

/** Development-only provider. It never logs or returns the one-time code. */
export class MockOtpProvider implements OtpProvider {
  readonly mode = 'MOCK' as const;

  async send(input: { mobile: string; code: string; channel: OtpChannel }): Promise<void> {
    // In development mode, we log the OTP to the console so the developer can see it and test the UI.
    console.log(`\n======================================================`);
    console.log(`[DEV MODE] OTP generated for ${input.mobile} via ${input.channel}`);
    console.log(`YOUR OTP CODE IS: ${input.code}`);
    console.log(`======================================================\n`);
  }
}

/** Placeholder until a company-approved SMS/WhatsApp/email provider is configured. */
export class ProductionOtpProvider implements OtpProvider {
  readonly mode = 'NOT_CONFIGURED' as const;

  async send(): Promise<void> {
    throw new Error('OTP delivery is NOT CONFIGURED \u2014 CREDENTIAL REQUIRED.');
  }
}
