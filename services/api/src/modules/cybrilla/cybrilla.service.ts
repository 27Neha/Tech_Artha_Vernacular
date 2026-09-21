import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CybrillaService {
  private readonly logger = new Logger(CybrillaService.name);
  private readonly sandboxBaseUrl = 'https://s.finprim.com';
  private readonly preVerifyBaseUrl = 'https://api.sandbox.cybrilla.com';
  private preVerifyAccessToken: string | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  private get baseUrl() {
    return process.env.CYBRILLA_BASE_URL || 'https://s.finprim.com';
  }

  async authenticate(): Promise<void> {
    const tenantId = process.env.CYBRILLA_TENANT_ID;
    const clientId = process.env.CYBRILLA_CLIENT_ID;
    const clientSecret = process.env.CYBRILLA_CLIENT_SECRET;

    if (
      !tenantId ||
      tenantId === 'your_tenant_id_here' ||
      !clientId ||
      !clientSecret
    ) {
      throw new InternalServerErrorException(
        'Missing Cybrilla Sandbox credentials in environment variables.',
      );
    }

    try {
      this.logger.log('Initiating Cybrilla UAT authentication...');
      const params = new URLSearchParams();
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('grant_type', 'client_credentials');

      const response = await axios.post(
        `${this.baseUrl}/v2/auth/${tenantId}/token`,
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt =
        Date.now() + response.data.expires_in * 1000 - 30000; // Cache token with 30s buffer
      this.logger.log(
        'Successfully authenticated with Cybrilla UAT. Access token secured in memory.',
      );
    } catch (error: any) {
      const status = error?.response?.status;
      this.logger.error(
        `Cybrilla authentication failed. HTTP Status: ${status || 'Unknown'}`,
      );
      throw new InternalServerErrorException(
        'Cybrilla Sandbox authentication failed.',
      );
    }
  }

  private async ensureAuthenticated() {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      await this.authenticate();
    }
  }

  /**
   * KYC Check API: Check if an investor's PAN is KYC compliant.
   */
  async checkKycStatus(pan: string, dateOfBirth?: string) {
    await this.ensureAuthenticated();
    const tenantId = process.env.CYBRILLA_TENANT_ID;

    try {
      this.logger.log(
        `Executing Cybrilla KYC Check for PAN ending ${pan.slice(-4)}...`,
      );
      const payload: any = { pan };
      if (dateOfBirth) payload.date_of_birth = dateOfBirth;

      const response = await axios.post(
        `${this.baseUrl}/api/kyc/check`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(
        `KYC Check executed successfully. Status: ${response.status}`,
      );
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;

      if (status === 400 || status === 422) {
        this.logger.warn(
          `Cybrilla KYC Check rejected input: ${JSON.stringify(responseData)}`,
        );
        throw new BadRequestException(
          responseData?.error?.message ?? 'Invalid PAN details.',
        );
      }

      this.logger.error(
        `Cybrilla KYC Check failed. HTTP Status: ${status || 'Unknown'}`,
      );
      throw new InternalServerErrorException({
        success: false,
        code: 'KYC_PROVIDER_ERROR',
        message: 'KYC provider is temporarily unavailable.',
        action: 'retry',
      });
    }
  }

  /** Poll for the resolved result of a previously-submitted PAN pre-verification. */
  async fetchPreVerification(id: string) {
    if (!this.preVerifyAccessToken) {
      await this.authenticatePreVerify();
    }

    try {
      const response = await axios.get(
        `${this.preVerifyBaseUrl}/poa/pre_verifications/${id}`,
        {
          headers: { Authorization: `Bearer ${this.preVerifyAccessToken}` },
        },
      );
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      this.logger.error(
        `Cybrilla pre-verification fetch failed for ${id}. HTTP Status: ${status || 'Unknown'}`,
      );
      throw new InternalServerErrorException(
        'Could not check verification status right now.',
      );
    }
  }

  /**
   * Create a new KYC Request.
   */
  async createKycRequest(profileData: any) {
    await this.ensureAuthenticated();
    const tenantId = process.env.CYBRILLA_TENANT_ID;

    try {
      this.logger.log('Executing Cybrilla KYC Request creation...');

      const response = await axios.post(
        `${this.baseUrl}/v2/kyc_requests`,
        profileData,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(
        `KYC Request created successfully. Status: ${response.status}`,
      );
      return {
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      this.logger.error(
        `Cybrilla KYC Request creation failed. HTTP Status: ${status || 'Unknown'}`,
      );

      throw new InternalServerErrorException({
        success: false,
        code: 'KYC_PROVIDER_ERROR',
        message: 'KYC provider is temporarily unavailable.',
        action: 'retry',
      });
    }
  }

  async createInvestorProfile(profileData: any) {
    await this.ensureAuthenticated();
    const tenantId = process.env.CYBRILLA_TENANT_ID;
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/investor_profiles`,
        profileData,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
        },
      );
      return { status: response.status, data: response.data };
    } catch (error: any) {
      throw new InternalServerErrorException(
        'Cybrilla Investor Profile creation failed.',
      );
    }
  }

  async createBankAccount(bankAccountData: any) {
    await this.ensureAuthenticated();
    const tenantId = process.env.CYBRILLA_TENANT_ID;
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/bank_accounts`,
        bankAccountData,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
        },
      );
      return { status: response.status, data: response.data };
    } catch (error: any) {
      throw new InternalServerErrorException(
        'Cybrilla Bank Account creation failed.',
      );
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
    return this.tenantPost('/v2/email_addresses', {
      profile: investorProfileId,
      email,
    });
  }

  async createPhoneNumber(
    investorProfileId: string,
    isd: string,
    number: string,
  ) {
    return this.tenantPost('/v2/phone_numbers', {
      profile: investorProfileId,
      isd,
      number,
    });
  }

  async createAddress(
    investorProfileId: string,
    line1: string,
    country: string,
    postalCode: string,
  ) {
    return this.tenantPost('/v2/addresses', {
      profile: investorProfileId,
      line1,
      country,
      postal_code: postalCode,
    });
  }

  async createInvestmentAccount(
    investorProfileId: string,
    holdingPattern: 'single' | 'joint' | 'anyone_survivor' = 'single',
    folioDefaults?: {
      communication_email_address: string;
      communication_mobile_number: string;
      communication_address: string;
      payout_bank_account: string;
    },
  ) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const tenantId = process.env.CYBRILLA_TENANT_ID;

    try {
      const url = `${this.sandboxBaseUrl}/v2/mf_investment_accounts`;
      this.logger.log(
        `Creating Cybrilla MF Investment Account for investor ${investorProfileId}...`,
      );

      const response = await axios.post(
        url,
        {
          primary_investor: investorProfileId,
          holding_pattern: holdingPattern,
          ...(folioDefaults ? { folio_defaults: folioDefaults } : {}),
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(
        `MF Investment Account created successfully. Status: ${response.status}`,
      );
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;

      this.logger.error(
        `Cybrilla MF Investment Account creation failed. HTTP Status: ${status || 'Unknown'}`,
      );
      this.logger.error(`Response Data: ${JSON.stringify(responseData)}`);

      throw new InternalServerErrorException(
        'Cybrilla MF Investment Account creation failed.',
      );
    }
  }

  async createPurchaseOrder(params: {
    mfInvestmentAccount: string;
    scheme: string;
    gateway: string;
    amount: number;
    userIp: string;
  }) {
    try {
      this.logger.log(
        `Placing Cybrilla purchase order: ${params.scheme} x ₹${params.amount}`,
      );
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
      this.logger.error(
        `Cybrilla purchase order failed. HTTP Status: ${status || 'Unknown'} - Data: ${JSON.stringify(responseData)}`,
      );
      if (status === 400) {
        throw new BadRequestException(
          responseData?.error?.errors ??
            responseData?.error?.message ??
            'Could not place this order.',
        );
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
      const response = await axios.get(
        `${this.sandboxBaseUrl}/v2/mf_purchases/${fpOrderId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'x-tenant-id': tenantId,
          },
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Could not fetch purchase order ${fpOrderId}: ${error?.response?.status || 'Unknown'}`,
      );
      throw new InternalServerErrorException(
        'Could not check order status right now.',
      );
    }
  }

  private async authenticatePreVerify(): Promise<void> {
    const clientId = process.env.CYBRILLA_PREVERIFY_CLIENT_ID;
    const clientSecret = process.env.CYBRILLA_PREVERIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) return;
    try {
      const params = new URLSearchParams();
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('grant_type', 'client_credentials');
      const response = await axios.post(`${this.sandboxBaseUrl}/v2/auth/cybrillarta/token`, params.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      this.preVerifyAccessToken = response.data.access_token;
    } catch (error: any) { }
  }

  async verifyPan(pan: string, name: string, dateOfBirth: string) {
    if (!this.preVerifyAccessToken) await this.authenticatePreVerify();
    try {
      const response = await axios.post(`${this.preVerifyBaseUrl}/poa/pre_verifications`, { investor_identifier: pan, pan: { value: pan }, name: { value: name }, date_of_birth: { value: dateOfBirth } }, { headers: { Authorization: `Bearer ${this.preVerifyAccessToken}`, 'Content-Type': 'application/json' } });
      return response.data;
    } catch (error: any) {
      throw new InternalServerErrorException('Cybrilla PAN pre-verification failed.');
    }
  }

}
