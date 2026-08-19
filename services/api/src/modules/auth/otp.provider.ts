export type OtpChannel = 'SMS' | 'WHATSAPP' | 'EMAIL';

export interface OtpProvider {
  readonly mode: 'MOCK' | 'NOT_CONFIGURED' | 'CONNECTED';
  send(input: { mobile: string; code: string; channel: OtpChannel }): Promise<void>;
}

/** Development-only provider. It never logs or returns the one-time code. */
export class MockOtpProvider implements OtpProvider {
  readonly mode = 'MOCK' as const;

  async send(_input: { mobile: string; code: string; channel: OtpChannel }): Promise<void> {
    // A real sandbox transport can be inserted here. Intentionally no logging: OTPs are secrets.
  }
}

/** Placeholder until a company-approved SMS/WhatsApp/email provider is configured. */
export class ProductionOtpProvider implements OtpProvider {
  readonly mode = 'NOT_CONFIGURED' as const;

  async send(): Promise<void> {
    throw new Error('OTP delivery is NOT CONFIGURED — CREDENTIAL REQUIRED.');
  }
}
