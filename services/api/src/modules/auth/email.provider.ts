import { Injectable, Logger, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { OtpChannel, OtpProvider } from './otp.provider';

@Injectable()
export class EmailOtpProvider implements OtpProvider {
  readonly mode = 'CONNECTED' as const;
  private readonly logger = new Logger(EmailOtpProvider.name);

  async send(input: { mobile: string; code: string; channel: OtpChannel }): Promise<void> {
    if (input.channel !== 'EMAIL') {
      return;
    }

    const emailEnabled = process.env.ZEPTOMAIL_ENABLED === 'true';
    const apiKey = process.env.ZEPTOMAIL_SEND_MAIL_TOKEN || process.env.ZEPTOMAIL_SEND_API_KEY;
    const fromAddressRaw = process.env.ZEPTOMAIL_FROM_EMAIL || 'support@TechArtha.com';
    const fromName = process.env.ZEPTOMAIL_FROM_NAME || 'TechArtha';
    const apiUrl = process.env.ZEPTOMAIL_API_URL || process.env.ZEPTOMAIL_URL || 'https://api.zeptomail.in/v1.1/email';

    // The recipient email is passed in the input identifier field
    const toAddress = input.mobile.trim().toLowerCase();

    const maskedTo = toAddress.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(Math.max(1, b.length))}${c}`);

    if (!emailEnabled) {
      if (process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_BYPASS === 'true') {
        this.logger.warn(`ZeptoMail is disabled (ZEPTOMAIL_ENABLED=${emailEnabled}). Dev bypass active for ${maskedTo}.`);
        return;
      }
      this.logger.warn(`Email OTP requested but ZEPTOMAIL_ENABLED is not 'true'.`);
      throw new ServiceUnavailableException('Email service is temporarily unavailable. Please try WhatsApp or contact support.');
    }

    if (!apiKey || apiKey === '<server-side-api-key>' || apiKey === 'put-your-zepto-mail-api-key-here' || apiKey.includes('<')) {
      if (process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_BYPASS === 'true') {
        this.logger.warn(`ZeptoMail API key is not configured. Dev bypass active for ${maskedTo}.`);
        return;
      }
      this.logger.error('Missing ZEPTOMAIL_SEND_MAIL_TOKEN / ZEPTOMAIL_SEND_API_KEY.');
      throw new ServiceUnavailableException('TechArtha email verification service is not fully configured.');
    }

    try {
      const payload = {
        from: { address: fromAddressRaw, name: fromName },
        to: [{ email_address: { address: toAddress, name: 'TechArtha Investor' } }],
        subject: `${input.code} is your TechArtha verification code`,
        htmlbody: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>TechArtha Verification Code</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F9FA; margin: 0; padding: 24px; color: #1E293B;">
            <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
              <div style="background-color: #3C3985; padding: 28px 24px; text-align: center;">
                <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: 0.5px;">TechArtha</h1>
                <p style="color: #E2E8F0; font-size: 13px; margin: 6px 0 0 0;">Simplified Vernacular Wealth & Investing</p>
              </div>

              <div style="padding: 32px 28px; text-align: center;">
                <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">Verify Your Account</h2>
                <p style="color: #64748B; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0;">
                  Use the one-time verification code below to complete your login or registration.
                </p>

                <div style="display: inline-block; background: #FFF7ED; border: 2px dashed #E87731; border-radius: 12px; padding: 16px 36px; margin: 8px 0 24px 0;">
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #E87731;">${input.code}</span>
                </div>

                <p style="color: #64748B; font-size: 13px; margin: 0 0 16px 0;">
                  ⏳ This code expires in <strong>5 minutes</strong>.
                </p>

                <div style="background-color: #F1F5F9; border-radius: 8px; padding: 14px; text-align: left; margin-top: 24px;">
                  <p style="color: #334155; font-size: 12px; line-height: 1.5; margin: 0;">
                    🔒 <strong>Security Warning:</strong> TechArtha will never call, WhatsApp, or email you asking for this code. Never share your OTP with anyone.
                  </p>
                </div>
              </div>

              <div style="background-color: #F8FAFC; padding: 20px 24px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 11px; color: #94A3B8;">
                <p style="margin: 0 0 6px 0;">If you did not request this verification code, please ignore this email or contact support.</p>
                <p style="margin: 0;">Need help? Reach out to <a href="mailto:support@techartha.com" style="color: #3C3985; text-decoration: none; font-weight: 600;">support@techartha.com</a></p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      const authHeader = apiKey.startsWith('Zoho-enczapikey ') ? apiKey : `Zoho-enczapikey ${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        this.logger.error(`ZeptoMail API Error: ${response.status} - ${JSON.stringify(responseData)}`);
        const errorMsg = JSON.stringify(responseData).toLowerCase();
        if (errorMsg.includes('verify') || errorMsg.includes('unverified') || errorMsg.includes('domain') || errorMsg.includes('sender')) {
          throw new ServiceUnavailableException('TechArtha email sender is not verified in Zoho ZeptoMail.');
        }
        throw new Error('ZeptoMail provider rejected the request.');
      }

      this.logger.log(`[OTP] channel=EMAIL send=success to=${maskedTo}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email OTP via ZeptoMail`, error?.message || error);
      if (error instanceof ServiceUnavailableException || error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException('Unable to deliver email OTP right now. Please try WhatsApp or try again shortly.');
    }
  }
}
