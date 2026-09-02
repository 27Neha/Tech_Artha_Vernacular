import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CybrillaService {
  private readonly logger = new Logger(CybrillaService.name);
  // Hardcoded to sandbox base URL for safety during testing
  private readonly sandboxBaseUrl = 'https://s.finprim.com';
  // Held temporarily in memory, never persisted
  private accessToken: string | null = null;

  async authenticate(): Promise<void> {
    const tenantId = process.env.CYBRILLA_TENANT_ID;
    const clientId = process.env.CYBRILLA_CLIENT_ID;
    const clientSecret = process.env.CYBRILLA_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      throw new InternalServerErrorException('Missing Cybrilla Sandbox credentials in environment variables.');
    }

    try {
      this.logger.log('Initiating Cybrilla Sandbox authentication...');
      const params = new URLSearchParams();
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('grant_type', 'client_credentials');

      const response = await axios.post(
        `${this.sandboxBaseUrl}/v2/auth/${tenantId}/token`,
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      this.accessToken = response.data.access_token;
      this.logger.log('Successfully authenticated with Cybrilla Sandbox. Access token secured in memory.');
    } catch (error: any) {
      // Intentionally masking the full error structure to avoid credential leakage in deep traces
      const status = error?.response?.status;
      const responseData = error?.response?.data;
      this.logger.error(`Cybrilla authentication failed. HTTP Status: ${status || 'Unknown'} - Data: ${JSON.stringify(responseData)}`);
      throw new InternalServerErrorException('Cybrilla Sandbox authentication failed.');
    }
  }

  async testSafeApiConnectivity(pincode: string = '560102') {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const tenantId = process.env.CYBRILLA_TENANT_ID;

    try {
      this.logger.log(`Executing safe Cybrilla API test (GET pincode: ${pincode})...`);
      const response = await axios.get(`${this.sandboxBaseUrl}/api/onb/pincodes/${pincode}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'x-tenant-id': tenantId,
        },
      });

      this.logger.log('Safe API test executed successfully.');
      return {
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      this.logger.error(`Cybrilla safe API test failed. HTTP Status: ${status || 'Unknown'}`);
      throw new InternalServerErrorException('Cybrilla safe API test failed.');
    }
  }

  async testKycStatusCheck(pan: string) {
    if (!this.accessToken) {
      await this.authenticate();
    }



    const tenantId = process.env.CYBRILLA_TENANT_ID;

    try {
      const url = `${this.sandboxBaseUrl}/api/kyc/check`;
      this.logger.log(`Executing Cybrilla KYC Status Check test...`);
      this.logger.log(`URL: POST ${url}`);
      this.logger.log(`Tenant ID length: ${tenantId?.length}`);
      
      const response = await axios.post(url, 
        { pan }, 
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`KYC Status Check executed successfully. Status: ${response.status}`);
      return {
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;
      const responseHeaders = error?.response?.headers;
      
      this.logger.error(`Cybrilla KYC API test failed. HTTP Status: ${status || 'Unknown'}`);
      this.logger.error(`Response Data: ${JSON.stringify(responseData)}`);
      this.logger.error(`Response Headers (non-secret): ${JSON.stringify({
        'x-request-id': responseHeaders?.['x-request-id'],
        'content-type': responseHeaders?.['content-type'],
        'server': responseHeaders?.['server']
      })}`);
      
      throw new InternalServerErrorException('Cybrilla KYC API test failed.');
    }
  }

  async createInvestorProfile(profileData: any) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const tenantId = process.env.CYBRILLA_TENANT_ID;

    try {
      const url = `${this.sandboxBaseUrl}/v2/investor_profiles`;
      this.logger.log('Executing Cybrilla Investor Profile creation...');
      
      const response = await axios.post(url, profileData, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`Investor Profile created successfully. Status: ${response.status}`);
      return {
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;
      
      this.logger.error(`Cybrilla Investor Profile creation failed. HTTP Status: ${status || 'Unknown'}`);
      this.logger.error(`Response Data: ${JSON.stringify(responseData)}`);
      
      throw new InternalServerErrorException('Cybrilla Investor Profile creation failed.');
    }
  }

  async createBankAccount(bankAccountData: any) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const tenantId = process.env.CYBRILLA_TENANT_ID;

    try {
      const url = `${this.sandboxBaseUrl}/v2/bank_accounts`;
      this.logger.log('Executing Cybrilla Bank Account creation...');
      
      const response = await axios.post(url, bankAccountData, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`Bank Account created successfully. Status: ${response.status}`);
      return {
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;
      
      this.logger.error(`Cybrilla Bank Account creation failed. HTTP Status: ${status || 'Unknown'}`);
      this.logger.error(`Response Data: ${JSON.stringify(responseData)}`);
      
      throw new InternalServerErrorException('Cybrilla Bank Account creation failed.');
    }
  }
}
