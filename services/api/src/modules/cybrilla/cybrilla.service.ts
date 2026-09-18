import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CybrillaService {
  private readonly logger = new Logger(CybrillaService.name);
  // Hardcoded to sandbox base URL for safety during testing
  private readonly sandboxBaseUrl = 'https://s.finprim.com';
  // Pre-verification API runs on a separate tenant/gateway from the OMS APIs above
  private readonly preVerifyBaseUrl = 'https://api.sandbox.cybrilla.com';
  // Held temporarily in memory, never persisted
  private accessToken: string | null = null;
  private preVerifyAccessToken: string | null = null;

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

  private async authenticatePreVerify(): Promise<void> {
    const clientId = process.env.CYBRILLA_PREVERIFY_CLIENT_ID;
    const clientSecret = process.env.CYBRILLA_PREVERIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException('Missing Cybrilla Pre-Verification credentials in environment variables.');
    }

    try {
      this.logger.log('Initiating Cybrilla Pre-Verification authentication...');
      const params = new URLSearchParams();
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('grant_type', 'client_credentials');

      const response = await axios.post(
        `${this.sandboxBaseUrl}/v2/auth/cybrillarta/token`,
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      this.preVerifyAccessToken = response.data.access_token;
      this.logger.log('Successfully authenticated with Cybrilla Pre-Verification API.');
    } catch (error: any) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;
      this.logger.error(`Cybrilla Pre-Verification authentication failed. HTTP Status: ${status || 'Unknown'} - Data: ${JSON.stringify(responseData)}`);
      throw new InternalServerErrorException('Cybrilla Pre-Verification authentication failed.');
    }
  }

  /**
   * PAN pre-verification against KRA records via Cybrilla's POA API.
   * Distinct product/gateway from the tenant OMS APIs above:
   * https://poa.cybrilla.com/docs/additional-apis/pre-verifications
   */
  async verifyPan(pan: string, name: string, dateOfBirth: string) {
    if (!this.preVerifyAccessToken) {
      await this.authenticatePreVerify();
    }

    const url = `${this.preVerifyBaseUrl}/poa/pre_verifications`;

    try {
      this.logger.log(`Executing Cybrilla PAN pre-verification for PAN ending ${pan.slice(-4)}...`);
      const response = await axios.post(
        url,
        {
          investor_identifier: pan,
          pan: { value: pan },
          name: { value: name },
          date_of_birth: { value: dateOfBirth },
        },
        {
          headers: {
            Authorization: `Bearer ${this.preVerifyAccessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`PAN pre-verification executed successfully. Status: ${response.status}, result: ${response.data?.status}`);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;

      // A 400 here means Cybrilla rejected the input (e.g. malformed PAN) - a real,
      // user-facing validation failure, not an infrastructure error. Surface it as such.
      if (status === 400) {
        this.logger.warn(`Cybrilla PAN pre-verification rejected input: ${JSON.stringify(responseData)}`);
        throw new BadRequestException(responseData?.error?.errors ?? responseData?.error?.message ?? 'Invalid PAN details.');
      }

      this.logger.error(`Cybrilla PAN pre-verification failed. HTTP Status: ${status || 'Unknown'} - Data: ${JSON.stringify(responseData)}`);
      throw new InternalServerErrorException('Cybrilla PAN pre-verification failed.');
    }
  }

  /** Poll for the resolved result of a previously-submitted PAN pre-verification. */
  async fetchPreVerification(id: string) {
    if (!this.preVerifyAccessToken) {
      await this.authenticatePreVerify();
    }

    try {
      const response = await axios.get(`${this.preVerifyBaseUrl}/poa/pre_verifications/${id}`, {
        headers: { Authorization: `Bearer ${this.preVerifyAccessToken}` },
      });
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      this.logger.error(`Cybrilla pre-verification fetch failed for ${id}. HTTP Status: ${status || 'Unknown'}`);
      throw new InternalServerErrorException('Could not check verification status right now.');
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

  private async tenantPost(path: string, body: any) {
    if (!this.accessToken) {
      await this.authenticate();
    }
    const tenantId = process.env.CYBRILLA_TENANT_ID;
    const response = await axios.post(`${this.sandboxBaseUrl}${path}`, body, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  }

  /** Contact detail resources - referenced by ID (not inline) in an MF Investment Account's folio_defaults. */
  async createEmailAddress(investorProfileId: string, email: string) {
    return this.tenantPost('/v2/email_addresses', { profile: investorProfileId, email });
  }

  async createPhoneNumber(investorProfileId: string, isd: string, number: string) {
    return this.tenantPost('/v2/phone_numbers', { profile: investorProfileId, isd, number });
  }

  async createAddress(investorProfileId: string, line1: string, country: string, postalCode: string) {
    return this.tenantPost('/v2/addresses', { profile: investorProfileId, line1, country, postal_code: postalCode });
  }

  async createInvestmentAccount(
    investorProfileId: string,
    holdingPattern: 'single' | 'joint' | 'anyone_survivor' = 'single',
    folioDefaults?: { communication_email_address: string; communication_mobile_number: string; communication_address: string; payout_bank_account: string },
  ) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const tenantId = process.env.CYBRILLA_TENANT_ID;

    try {
      const url = `${this.sandboxBaseUrl}/v2/mf_investment_accounts`;
      this.logger.log(`Creating Cybrilla MF Investment Account for investor ${investorProfileId}...`);

      const response = await axios.post(
        url,
        { primary_investor: investorProfileId, holding_pattern: holdingPattern, ...(folioDefaults ? { folio_defaults: folioDefaults } : {}) },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`MF Investment Account created successfully. Status: ${response.status}`);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;

      this.logger.error(`Cybrilla MF Investment Account creation failed. HTTP Status: ${status || 'Unknown'}`);
      this.logger.error(`Response Data: ${JSON.stringify(responseData)}`);

      throw new InternalServerErrorException('Cybrilla MF Investment Account creation failed.');
    }
  }

  async createPurchaseOrder(params: { mfInvestmentAccount: string; scheme: string; gateway: string; amount: number; userIp: string }) {
    try {
      this.logger.log(`Placing Cybrilla purchase order: ${params.scheme} x ₹${params.amount}`);
      return await this.tenantPost('/v2/mf_purchases', {
        mf_investment_account: params.mfInvestmentAccount,
        scheme: params.scheme,
        gateway: params.gateway,
        amount: params.amount,
        user_ip: params.userIp,
      });
    } catch (error: any) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;
      this.logger.error(`Cybrilla purchase order failed. HTTP Status: ${status || 'Unknown'} - Data: ${JSON.stringify(responseData)}`);
      if (status === 400) {
        throw new BadRequestException(responseData?.error?.errors ?? responseData?.error?.message ?? 'Could not place this order.');
      }
      throw new InternalServerErrorException('Cybrilla purchase order failed.');
    }
  }

  async fetchPurchaseOrder(fpOrderId: string) {
    if (!this.accessToken) {
      await this.authenticate();
    }
    const tenantId = process.env.CYBRILLA_TENANT_ID;
    try {
      const response = await axios.get(`${this.sandboxBaseUrl}/v2/mf_purchases/${fpOrderId}`, {
        headers: { Authorization: `Bearer ${this.accessToken}`, 'x-tenant-id': tenantId },
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(`Could not fetch purchase order ${fpOrderId}: ${error?.response?.status || 'Unknown'}`);
      throw new InternalServerErrorException('Could not check order status right now.');
    }
  }
}
