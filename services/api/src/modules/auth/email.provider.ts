import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
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
      path.resolve(__dirname, '../../../../.env'),
      path.resolve(__dirname, '../../../.env'),
      path.resolve(process.cwd(), 'services/api/.env'),
      path.resolve(process.cwd(), '.env'),
    ];
    for (const envPath of candidatePaths) {
      if (fs.existsSync(envPath)) {
        try {
          const content = fs.readFileSync(envPath, 'utf8');
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
            }
          }
        } catch {
          // ignore read errors
        }
        break;
      }
    }
  }

  async send(input: { mobile: string; code: string; channel: OtpChannel }): Promise<void> {
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

    if (!emailEnabled) {
      this.logger.warn(`Email OTP is requested but not correctly configured (ZEPTOMAIL_ENABLED=${emailEnabled}).`);
      throw new ServiceUnavailableException('Email service is not configured. Please check your backend environment variables.');
    }

    if (!apiKey || apiKey === '<server-side-api-key>' || apiKey === 'put-your-zepto-mail-api-key-here' || apiKey.includes('<')) {
      throw new ServiceUnavailableException('TechArtha email sender is not verified in Zoho ZeptoMail. API Key is missing.');
    }

    let fromName = fromNameOverride;
    let fromAddress = fromAddressRaw;
    const match = fromAddressRaw.match(/^(.*)<(.*)>$/);
    if (match) {
      fromName = match[1].trim() || fromName;
      fromAddress = match[2].trim();
    }

    const toAddress = input.mobile.trim();

    try {
      const payload = {
        from: { address: fromAddress, name: fromName },
        to: [{ email_address: { address: toAddress, name: 'User' } }],
        subject: 'TechArtha account verification OTP',
        htmlbody: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; border: 1px solid #eaeaeb; border-radius: 8px;">
            <h2 style="color: #3C3985; margin-bottom: 20px;">TechArtha Verification</h2>
            <p>Verify your TechArtha account</p>
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
            'Zoho CPaaS / ZeptoMail error (LE_102): Credit exhausted for the current Mail Agent token in services/api/.env.',
          );
        }
        if (errorMsg.includes('verify') || errorMsg.includes('unverified') || errorMsg.includes('domain') || errorMsg.includes('sender')) {
          throw new ServiceUnavailableException('TechArtha email sender is not verified in Zoho ZeptoMail.');
        }

        throw new Error('ZeptoMail provider rejected the request.');
      }

      this.logger.log(`[OTP] channel=EMAIL send=success to=${toAddress}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email OTP to ${input.mobile}`, error);

      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException('Unable to send email OTP right now. Please try again.');
    }
  }
}
