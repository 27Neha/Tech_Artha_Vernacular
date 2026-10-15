import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MtalkzService {
  private readonly logger = new Logger(MtalkzService.name);

  async sendTemplateSms(phoneNumber: string, variables: string[]): Promise<void> {
    const apiKey = process.env.MTALKZ_API_KEY;
    const baseUrl = process.env.MTALKZ_BASE_URL || 'https://api.mtalkz.com';
    const sender = process.env.MTALKZ_SENDER_ID || 'TARTHA';
    const templateId = process.env.MTALKZ_DLT_TEMPLATE_ID || '1077145980089083635';
    // PE ID is typically passed if required by the API, sometimes just implicitly tied to sender/template
    // Mtalkz might not need peId directly in payload but we can pass it if standard, or omit if not required by their v1/sms
    const smsType = process.env.MTALKZ_SMS_TYPE || 'TRANS';

    if (!apiKey) {
      this.logger.error('MTALKZ_API_KEY is missing in environment configuration.');
      throw new InternalServerErrorException('SMS Provider is not properly configured.');
    }

    const formattedMobile = this.normalizeMobile(phoneNumber);

    const payload: any = {
      sender: sender,
      to: formattedMobile,
      templateId: templateId,
      custom: variables,
      type: smsType
    };

    // NOTE: The placement of Principal Entity ID (PE ID) depends on the exact Mtalkz contract version.
    // We fetch it from config, but do not forcefully inject it into the JSON body yet, pending API confirmation.
    const peId = process.env.MTALKZ_PE_ID;
    if (peId) {
       // If confirmed that Mtalkz requires it in the body, it can be appended here.
       // e.g. payload.peId = peId; or passed via headers.
    }

    try {
      const response = await axios.post(`${baseUrl}/v1/sms`, payload, {
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
      });

      // Mtalkz response format varies, but usually success=true or status=0
      this.logger.log(`[MTALKZ] SMS sent successfully to masked mobile. TemplateId: ${templateId}`);
    } catch (error: any) {
      this.logger.error(`Failed to send SMS via Mtalkz. Error: ${error.message}`);
      if (error.response) {
         this.logger.error(`Mtalkz HTTP Error: ${error.response.status}`);
      }
      throw new BadRequestException('Unable to send SMS right now. Please try again.');
    }
  }

  private normalizeMobile(mobile: string): string {
    const cleaned = mobile.replace(/\D/g, '');
    if (cleaned.length === 10) return `91${cleaned}`;
    if (cleaned.length === 12 && cleaned.startsWith('91')) return cleaned;
    return cleaned;
  }
}
