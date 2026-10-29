import { Injectable, Logger, ServiceUnavailableException, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class InteraktService {
  private readonly logger = new Logger(InteraktService.name);
  private readonly apiUrl = 'https://api.interakt.ai/v1/public/message/';

  async sendAuthenticationOtp(mobile: string, otpCode: string): Promise<void> {
    const rawEnabled = String(process.env.INTERAKT_OTP_ENABLED).trim().toLowerCase();
    const isEnabled = rawEnabled === 'true';

    // Parse mobile format into countryCode and phoneNumber
    let countryCode = '+91';
    let phoneNumber = mobile.replace(/\D/g, '');

    if (phoneNumber.startsWith('91') && phoneNumber.length === 12) {
      phoneNumber = phoneNumber.substring(2);
    }

    const maskedPhone = `${phoneNumber.slice(0, 2)}****${phoneNumber.slice(-2)}`;

    if (!isEnabled) {
      if (process.env.NODE_ENV !== 'production' || process.env.AUTH_DEV_BYPASS === 'true') {
        this.logger.warn(`Interakt WhatsApp OTP delivery is disabled (INTERAKT_OTP_ENABLED='${rawEnabled}'). Dev mode bypass for +91 ${maskedPhone}.`);
        return;
      }
      this.logger.error('Interakt WhatsApp OTP is requested but INTERAKT_OTP_ENABLED is not true.');
      throw new ServiceUnavailableException('WhatsApp OTP service is currently disabled. Please choose Email or contact support.');
    }

    const secretKey = process.env.INTERAKT_SECRET_KEY || process.env.INTERAKT_API_KEY;
    if (!secretKey) {
      if (process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_BYPASS === 'true') {
        this.logger.warn(`Missing INTERAKT_SECRET_KEY. Dev bypass active for +91 ${maskedPhone}.`);
        return;
      }
      this.logger.error('Missing INTERAKT_SECRET_KEY or INTERAKT_API_KEY in environment variables.');
      throw new ServiceUnavailableException('WhatsApp messaging is not properly configured.');
    }

    try {
      const templateName = process.env.INTERAKT_OTP_TEMPLATE_NAME || 'techartha_signup_otp';
      const languageCode = process.env.INTERAKT_OTP_LANGUAGE || 'en';

      const payload = {
        countryCode,
        phoneNumber,
        type: 'Template',
        template: {
          name: templateName,
          languageCode,
          bodyValues: [otpCode],
          buttonValues: {
            '0': [otpCode],
          },
        },
      };

      this.logger.log(`Dispatching WhatsApp OTP via Interakt to +91 ${maskedPhone}`);

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${secretKey}`,
        },
        timeout: 10000,
      });

      this.logger.log(`Successfully sent WhatsApp OTP via Interakt to +91 ${maskedPhone} (Status: ${response.status})`);
    } catch (error: any) {
      const status = error?.response?.status || 'Unknown';
      this.logger.error(`Failed to send Interakt WhatsApp message. Status: ${status}`);
      throw new ServiceUnavailableException('Failed to deliver WhatsApp OTP. Please ensure your WhatsApp number is active or try Email.');
    }
  }
}
