import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { OtpChannel, OtpProvider } from './otp.provider';

@Injectable()
export class EmailOtpProvider implements OtpProvider {
  readonly mode = 'CONNECTED' as const;
  private readonly logger = new Logger(EmailOtpProvider.name);

  constructor() {}

  private reloadEnvFile(): void {
    const candidatePaths = [
      path.resolve(process.cwd(), 'services/api/.env'),
      path.resolve(__dirname, '../../../../.env'),
      path.resolve(__dirname, '../../../.env'),
      path.resolve(process.cwd(), '.env'),
    ];
    for (const envPath of candidatePaths) {
      if (fs.existsSync(envPath)) {
        try {
          const content = fs.readFileSync(envPath, 'utf8');
          let foundZeptoConfig = false;
          for (const rawLine of content.split(/\r?\n/)) {
            const line = rawLine.trim();
            if (!line || line.startsWith('#')) continue;
            const eqIdx = line.indexOf('=');
            if (eqIdx === -1) continue;
            const key = line.slice(0, eqIdx).trim();
            let val = line.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (key.startsWith('ZEPTOMAIL_') || key.startsWith('EMAIL_')) {
              process.env[key] = val;
              foundZeptoConfig = true;
            }
          }
          if (foundZeptoConfig) {
            break;
          }
        } catch {
          // ignore read errors
        }
      }
    }
  }

  async send(input: {
    mobile: string;
    code: string;
    channel: OtpChannel;
    subject?: string;
    heading?: string;
    description?: string;
  }): Promise<void> {
    if (input.channel !== 'EMAIL') {
      return;
    }

    // Re-read services/api/.env so token updates apply immediately without server restart
    this.reloadEnvFile();

    const emailEnabled =
      process.env.ZEPTOMAIL_ENABLED === 'true' || process.env.EMAIL_ENABLED === 'true';
    const apiKey = process.env.ZEPTOMAIL_SEND_MAIL_TOKEN || process.env.ZEPTOMAIL_API_KEY;
    const fromAddressRaw =
      process.env.ZEPTOMAIL_FROM_EMAIL || process.env.EMAIL_FROM || 'support@techartha.com';
    const fromNameOverride = process.env.ZEPTOMAIL_FROM_NAME || 'TechArtha';

    const toAddress = input.mobile.trim();

    if (!emailEnabled || !apiKey || apiKey === '<server-side-api-key>' || apiKey === 'put-your-zepto-mail-api-key-here' || apiKey.includes('<')) {
      if (process.env.NODE_ENV !== 'production' || process.env.AUTH_DEV_BYPASS === 'true') {
        this.logger.warn(`[DEV ONLY] Email OTP provider is in mock/dev mode. Code for ${toAddress} is: ${input.code}`);
        return;
      }
      this.logger.warn(`Email OTP is requested but not correctly configured (ZEPTOMAIL_ENABLED=${emailEnabled}).`);
      throw new ServiceUnavailableException('Email service is not configured. Please check your backend environment variables.');
    }

    let fromName = fromNameOverride;
    let fromAddress = fromAddressRaw;
    const match = fromAddressRaw.match(/^(.*)<(.*)>$/);
    if (match) {
      fromName = match[1].trim() || fromName;
      fromAddress = match[2].trim();
    }

    try {
      const emailSubject = input.subject || 'TechArtha account verification OTP';
      const emailHeading = input.heading || 'TechArtha Verification';
      const emailDescription = input.description || 'Verify your TechArtha account';

      const payload = {
        from: { address: fromAddress, name: fromName },
        to: [{ email_address: { address: toAddress, name: 'User' } }],
        subject: emailSubject,
        htmlbody: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; border: 1px solid #eaeaeb; border-radius: 8px;">
            <h2 style="color: #3C3985; margin-bottom: 20px;">${emailHeading}</h2>
            <p>${emailDescription}</p>
            <p>Your verification code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 4px; color: #E87731; background: #f8f9fb; padding: 10px 20px; border-radius: 4px; display: inline-block;">${input.code}</h1>
            <p style="margin-top: 20px; color: #666; font-size: 14px;">This code expires in 5 minutes.</p>
            <p style="margin-top: 10px; color: #666; font-size: 12px;">If you did not request this code, you can safely ignore this email.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; font-size: 12px; color: #999;">
              <strong>Security Notice:</strong> Never share this code with anyone. TechArtha will never call or email you to ask for this code.
            </div>
          </div>
        `,
      };

      const authHeader = apiKey.startsWith('Zoho-enczapikey ') ? apiKey : `Zoho-enczapikey ${apiKey}`;
      const endpoint =
        process.env.ZEPTOMAIL_API_URL ||
        process.env.ZEPTOMAIL_URL ||
        'https://api.zeptomail.in/v1.1/email';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        this.logger.error(`ZeptoMail API Error: ${response.status} - ${JSON.stringify(responseData)}`);

        const errorMsg = JSON.stringify(responseData).toLowerCase();
        if (errorMsg.includes('credit exhausted') || errorMsg.includes('le_102') || errorMsg.includes('tm_5001')) {
          throw new ServiceUnavailableException(
            'Zoho CPaaS / ZeptoMail error (LE_102): Email credit exhausted for the configured Mail Agent.',
          );
        }
        if (errorMsg.includes('verify') || errorMsg.includes('unverified') || errorMsg.includes('domain') || errorMsg.includes('sender')) {
          throw new ServiceUnavailableException('TechArtha email sender is not verified in Zoho ZeptoMail.');
        }
        if (errorMsg.includes('tm_4001') || errorMsg.includes('invalid') || response.status === 401 || response.status === 403) {
          throw new ServiceUnavailableException('Zoho CPaaS / ZeptoMail authentication failed: check ZEPTOMAIL_SEND_MAIL_TOKEN.');
        }

        throw new ServiceUnavailableException('Zoho CPaaS / ZeptoMail rejected the email request.');
      }

      this.logger.log(`[OTP] channel=EMAIL send=success to=${toAddress}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email OTP to ${input.mobile}`, error);

      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException('Unable to reach Zoho CPaaS / ZeptoMail email service right now. Please try again.');
    }
  }

  async sendPasswordResetOtpEmail(input: {
    email: string;
    code: string;
    expiresInMinutes: number;
  }): Promise<void> {
    const emailEnabled = process.env.ZEPTOMAIL_ENABLED === 'true';
    const apiKey = process.env.ZEPTOMAIL_SEND_MAIL_TOKEN || process.env.ZEPTOMAIL_SEND_API_KEY;
    const fromAddressRaw =
      process.env.ZEPTOMAIL_AUTH_FROM_EMAIL ||
      process.env.ZEPTOMAIL_FROM_EMAIL ||
      'support@techartha.com';
    const fromName = process.env.ZEPTOMAIL_FROM_NAME || 'TechArtha';
    const apiUrl =
      process.env.ZEPTOMAIL_API_URL ||
      process.env.ZEPTOMAIL_URL ||
      'https://api.zeptomail.in/v1.1/email';

    const toAddress = input.email.trim().toLowerCase();
    const maskedTo = toAddress.replace(
      /^(.)(.*)(@.*)$/,
      (_, a, b, c) => `${a}${'*'.repeat(Math.max(1, b.length))}${c}`,
    );

    if (!emailEnabled) {
      this.logger.warn(
        `Password reset OTP requested for ${maskedTo}, but ZEPTOMAIL_ENABLED is not 'true'.`,
      );
      throw new ServiceUnavailableException(
        'Email delivery is currently unavailable. Please try again later.',
      );
    }

    if (
      !apiKey ||
      apiKey === '<server-side-api-key>' ||
      apiKey === 'put-your-zepto-mail-api-key-here' ||
      apiKey.includes('<')
    ) {
      this.logger.error('Missing or placeholder ZEPTOMAIL_SEND_MAIL_TOKEN / ZEPTOMAIL_SEND_API_KEY.');
      throw new ServiceUnavailableException(
        'Email delivery is currently unavailable. Please try again later.',
      );
    }

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const safeCode = escapeHtml(input.code.trim());
    const validLabel = `${input.expiresInMinutes} minutes`;

    const textBody = [
      'Hi,',
      '',
      'We received a request to reset your TechArtha password.',
      '',
      'Your verification code is:',
      '',
      safeCode,
      '',
      `This code is valid for ${validLabel}.`,
      '',
      'Please do not share this code with anyone.',
      '',
      "If you didn't request this, you can ignore this email.",
      '',
      'Team TechArtha',
    ].join('\n');

    const payload = {
      from: { address: fromAddressRaw, name: fromName },
      to: [{ email_address: { address: toAddress, name: 'TechArtha User' } }],
      subject: 'Your TechArtha Password Reset Code',
      textbody: textBody,
      htmlbody: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your TechArtha Password Reset Code</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F9FB; margin: 0; padding: 20px; color: #102A54;">
          <div style="max-width: 500px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden;">
            <div style="background-color: #36358D; padding: 22px 24px; text-align: center;">
              <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 800; margin: 0;">TechArtha</h1>
            </div>

            <div style="padding: 28px 24px;">
              <p style="font-size: 15px; color: #102A54; margin: 0 0 14px 0;">Hi,</p>
              <p style="font-size: 15px; line-height: 1.55; color: #334155; margin: 0 0 16px 0;">
                We received a request to reset your TechArtha password.
              </p>
              <p style="font-size: 15px; color: #334155; margin: 0 0 12px 0;">
                Your verification code is:
              </p>

              <div style="text-align: center; background-color: #FFF7ED; border: 1.5px solid #FDBA74; border-radius: 12px; padding: 16px; margin: 0 0 18px 0;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #C2410C;">${safeCode}</span>
              </div>

              <p style="font-size: 14px; line-height: 1.55; color: #334155; margin: 0 0 10px 0;">
                This code is valid for <strong>${validLabel}</strong>.
              </p>
              <p style="font-size: 14px; line-height: 1.55; color: #334155; margin: 0 0 10px 0;">
                Please do not share this code with anyone.
              </p>
              <p style="font-size: 14px; line-height: 1.55; color: #64748B; margin: 0 0 18px 0;">
                If you didn't request this, you can ignore this email.
              </p>
              <p style="font-size: 14px; font-weight: 700; color: #102A54; margin: 0;">
                Team TechArtha
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const authHeader = apiKey.startsWith('Zoho-enczapikey ')
      ? apiKey
      : `Zoho-enczapikey ${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        this.logger.error(
          `ZeptoMail Password Reset OTP API Error: ${response.status} - ${JSON.stringify(responseData)}`,
        );
        const errorMsg = JSON.stringify(responseData || {}).toLowerCase();
        if (errorMsg.includes('invalid api token') || response.status === 401) {
          throw new ServiceUnavailableException(
            'Email delivery service configuration is invalid (ZeptoMail token rejected).',
          );
        }
        if (
          errorMsg.includes('verify') ||
          errorMsg.includes('unverified') ||
          errorMsg.includes('domain') ||
          errorMsg.includes('sender')
        ) {
          throw new ServiceUnavailableException(
            'Email sender domain is not verified in ZeptoMail.',
          );
        }
        throw new ServiceUnavailableException(
          'Unable to send verification code right now. Please try again shortly.',
        );
      }

      this.logger.log(`[PASSWORD_RESET_OTP] email=sent to=${maskedTo}`);
    } catch (error: any) {
      if (error instanceof ServiceUnavailableException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        'Password reset OTP email delivery failed cleanly',
        error?.message || error,
      );
      throw new ServiceUnavailableException(
        'Unable to send verification code right now. Please try again shortly.',
      );
    }
  }

}
