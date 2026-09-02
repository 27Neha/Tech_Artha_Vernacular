import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class InteraktService {
  private readonly logger = new Logger(InteraktService.name);
  private readonly apiUrl = 'https://api.interakt.ai/v1/public/message/';

  async sendAuthenticationOtp(mobile: string, otpCode: string): Promise<void> {
    const isEnabled = process.env.INTERAKT_OTP_ENABLED === 'true';

    if (!isEnabled) {
      this.logger.log(`Interakt OTP delivery is disabled (INTERAKT_OTP_ENABLED is false). Skipping actual API request for ${mobile}`);
      return;
    }

    const secretKey = process.env.INTERAKT_SECRET_KEY || process.env.INTERAKT_API_KEY;
    if (!secretKey) {
      this.logger.error('Missing INTERAKT_SECRET_KEY or INTERAKT_API_KEY in environment variables.');
      throw new InternalServerErrorException('Interakt is not configured properly.');
    }

    // Parse mobile format assuming E.164 (+91XXXXXXXXXX)
    let countryCode = '+91';
    let phoneNumber = mobile;

    if (mobile.startsWith('+91')) {
      countryCode = '+91';
      phoneNumber = mobile.substring(3);
    } else if (mobile.startsWith('+')) {
      countryCode = mobile.substring(0, 3);
      phoneNumber = mobile.substring(3);
    } else if (mobile.length === 10) {
      countryCode = '+91';
      phoneNumber = mobile;
    }

    try {
      const payload = {
        countryCode,
        phoneNumber,
        type: 'Template',
        template: {
          name: 'techartha_signup_otp',
          languageCode: 'en',
          bodyValues: [otpCode],
          buttonValues: {
            '0': [otpCode],
          },
        },
      };

      this.logger.log(`Dispatching WhatsApp OTP to Interakt API for ${countryCode} ${phoneNumber}`);
      
      await axios.post(this.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${secretKey}`
        }
      });

      this.logger.log(`Successfully sent WhatsApp OTP via Interakt to ${phoneNumber}`);
    } catch (error: any) {
      const status = error?.response?.status || 'Unknown';
      this.logger.error(`Failed to send Interakt WhatsApp message. Status: ${status}`);
      throw new InternalServerErrorException('Failed to deliver WhatsApp OTP.');
    }
  }
}
