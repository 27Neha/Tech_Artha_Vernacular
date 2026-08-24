import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class BSEAuthService {
  private readonly logger = new Logger(BSEAuthService.name);
  
  private cachedSessionToken: string | null = null;
  private tokenExpiry: number | null = null;

  // Environment Variables
  private readonly env = process.env.BSE_ENV || 'uat';
  private readonly memberCode = process.env.BSE_MEMBER_CODE;
  private readonly userId = process.env.BSE_USER_ID;
  private readonly password = process.env.BSE_PASSWORD;
  private readonly passkey = process.env.BSE_PASSKEY;
  
  // Endpoint resolution based on v3.5 Documentation
  private get baseUrl() {
    return this.env === 'production' 
      ? 'https://bsestarmf.in' 
      : 'https://bsestarmfdemo.bseindia.com';
  }

  private get authEndpoint() {
    return `${this.baseUrl}/MFOrderEntry/MFOrder.svc/Secure`;
  }

  /**
   * Retrieves the Encrypted Password (Session Token) from BSE StAR MF.
   * Caches the token for 55 minutes (Validity is 1 hour per docs).
   */
  async getSessionToken(): Promise<string> {
    // Return cached token if valid
    if (this.cachedSessionToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.cachedSessionToken as string;
    }

    if (!this.userId || !this.password || !this.passkey) {
      this.logger.error('Missing BSE Credentials in environment variables.');
      throw new HttpException('BSE Authentication Configuration Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:bses="http://bsestarmf.in/">
  <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
    <wsa:Action>http://bsestarmf.in/MFOrderEntry/getPassword</wsa:Action>
    <wsa:To>${this.authEndpoint}</wsa:To>
  </soap:Header>
  <soap:Body>
    <bses:getPassword>
      <bses:UserId>${this.userId}</bses:UserId>
      <bses:Password>${this.password}</bses:Password>
      <bses:PassKey>${this.passkey}</bses:PassKey>
    </bses:getPassword>
  </soap:Body>
</soap:Envelope>`;

    try {
      this.logger.log(`Requesting new BSE Session Token for user: ${this.userId}`);
      
      const response = await axios.post(this.authEndpoint, soapEnvelope, {
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
        },
      });

      const xml = response.data;
      
      // Parse the response: <getPasswordResult>100|EncryptedPassword</getPasswordResult>
      const match = xml.match(/<getPasswordResult>(.*?)<\/getPasswordResult>/);
      if (!match || !match[1]) {
        this.logger.error('Invalid SOAP response format from BSE.');
        throw new Error('Invalid SOAP response');
      }

      const resultParts = match[1].split('|');
      const statusCode = resultParts[0];

      if (statusCode === '100') {
        const encryptedPassword = resultParts[1];
        this.cachedSessionToken = encryptedPassword;
        this.tokenExpiry = Date.now() + (55 * 60 * 1000); // 55 minutes
        
        this.logger.log('BSE Session Token generated successfully.');
        return this.cachedSessionToken as string;
      } else {
        const errorReason = resultParts[1] || 'Unknown Authentication Error';
        this.logger.error(`BSE Auth Failed: Code ${statusCode} - ${errorReason}`);
        throw new HttpException(`BSE Auth Failed: ${errorReason}`, HttpStatus.UNAUTHORIZED);
      }

    } catch (error: any) {
      this.logger.error(`BSE Auth Request Failed: ${error.message}`);
      throw new HttpException('BSE Authentication Request Failed', HttpStatus.BAD_GATEWAY);
    }
  }

  /**
   * Clears the current session token.
   */
  clearSession() {
    this.cachedSessionToken = null;
    this.tokenExpiry = null;
    this.logger.log('BSE Session Token cleared.');
  }
}
