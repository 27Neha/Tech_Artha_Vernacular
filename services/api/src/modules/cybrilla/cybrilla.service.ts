import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';

/**
 * Exactly the values /v2/mf_purchase_plans accepts, read off the gateway's own
 * validation error. Case sensitive.
 */
export type CybrillaSipFrequency =
  | 'calendar_day_daily'
  | 'daily'
  | 'day_in_a_week'
  | 'four_times_a_month'
  | 'day_in_a_fortnight'
  | 'twice_a_month'
  | 'monthly'
  | 'quarterly'
  | 'half_yearly'
  | 'yearly';

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

  /**
   * PATCH against a tenant-scoped collection. Note the shape Cybrilla uses: the record
   * id goes in the BODY, not the path - `PATCH /v2/mf_purchases` with `{ id, state }`.
   */
  private async tenantPatch(path: string, body: any) {
    if (!this.accessToken) {
      await this.authenticate();
    }
    const tenantId = process.env.CYBRILLA_TENANT_ID;
    const response = await axios.patch(`${this.sandboxBaseUrl}${path}`, body, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
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

  /**
   * POST /v2/mf_purchase_plans - registers a recurring SIP.
   *
   * The fp-cybrillapoa gateway supports single and batch SIP creation, with UPI Autopay
   * and e-NACH for the auto-debit mandate. The required fields and the frequency enum
   * below were confirmed against the live sandbox tenant, not inferred from the docs:
   *
   *   required: user_ip, amount, scheme, number_of_installments, systematic,
   *             mf_investment_account, frequency, installment_day
   *
   * `systematic` must be true - the gateway rejects a non-systematic purchase plan.
   */
  async createPurchasePlan(params: {
    mfInvestmentAccount: string;
    scheme: string;
    amount: number;
    frequency: CybrillaSipFrequency;
    installmentDay: number;
    numberOfInstallments: number;
    userIp: string;
    /** An APPROVED mandate id. Without it the plan cannot collect an instalment. */
    mandate?: string;
    consent?: { email: string; mobile: string; isdCode?: string };
    generateFirstInstallmentNow?: boolean;
  }) {
    try {
      this.logger.log(
        `Registering Cybrilla SIP: ${params.scheme} x ₹${params.amount} ${params.frequency} on day ${params.installmentDay}`,
      );
      return await this.tenantPost('/v2/mf_purchase_plans', {
        mf_investment_account: params.mfInvestmentAccount,
        scheme: params.scheme,
        amount: params.amount,
        frequency: params.frequency,
        installment_day: params.installmentDay,
        number_of_installments: params.numberOfInstallments,
        systematic: true,
        user_ip: params.userIp,
        // A SIP collects by mandate; payment_source is the approved mandate's id.
        // Omitting these is why our earlier plans came back with payment_method: null.
        ...(params.mandate ? { payment_method: 'mandate', payment_source: params.mandate } : {}),
        // Consent is recorded on the plan itself, not only on the order.
        ...(params.consent
          ? {
              consent: {
                email: params.consent.email,
                isd_code: params.consent.isdCode ?? '91',
                mobile: params.consent.mobile,
              },
            }
          : {}),
        ...(params.generateFirstInstallmentNow ? { generate_first_installment_now: true } : {}),
      });
    } catch (error: any) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;
      this.logger.error(
        `Cybrilla SIP registration failed. HTTP Status: ${status || 'Unknown'} - Data: ${JSON.stringify(responseData)}`,
      );
      if (status === 400) {
        throw new BadRequestException(
          responseData?.error?.errors ??
            responseData?.error?.message ??
            'Could not register this SIP.',
        );
      }
      throw new InternalServerErrorException('Cybrilla SIP registration failed.');
    }
  }

  /**
   * PATCH /v2/mf_purchases - step 2 of the purchase flow.
   *
   * Creating an order is NOT enough. A newly created purchase sits in `under_review`
   * and must be explicitly confirmed, with the investor's consent details, before it
   * progresses. Every order this integration had placed was stuck unconfirmed
   * (`confirmed_at: null`, `consent` all null) and ultimately failed.
   */
  async confirmPurchaseOrder(params: {
    fpOrderId: string;
    email: string;
    mobile: string;
    isdCode?: string;
  }) {
    try {
      return await this.tenantPatch('/v2/mf_purchases', {
        id: params.fpOrderId,
        state: 'confirmed',
        consent: {
          email: params.email,
          isd_code: params.isdCode ?? '91',
          mobile: params.mobile,
        },
      });
    } catch (error: any) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;
      this.logger.error(
        `Cybrilla order confirmation failed for ${params.fpOrderId}. HTTP ${status ?? 'unknown'} - ${JSON.stringify(responseData)}`,
      );
      if (status === 400) {
        throw new BadRequestException(
          responseData?.error?.errors ?? responseData?.error?.message ?? 'Could not confirm this order.',
        );
      }
      throw new InternalServerErrorException('Cybrilla order confirmation failed.');
    }
  }

  /** PATCH /v2/mf_purchase_plans - the same confirmation step for a SIP plan. */
  async confirmPurchasePlan(fpPlanId: string) {
    try {
      return await this.tenantPatch('/v2/mf_purchase_plans', { id: fpPlanId, state: 'confirmed' });
    } catch (error: any) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;
      this.logger.error(
        `Cybrilla plan confirmation failed for ${fpPlanId}. HTTP ${status ?? 'unknown'} - ${JSON.stringify(responseData)}`,
      );
      if (status === 400) {
        throw new BadRequestException(
          responseData?.error?.errors ?? responseData?.error?.message ?? 'Could not confirm this SIP.',
        );
      }
      throw new InternalServerErrorException('Cybrilla SIP confirmation failed.');
    }
  }

  /**
   * POST /api/pg/payments/netbanking - the step that actually collects money.
   *
   * Returns a `token_url`: the investor-facing page where they complete payment (UPI or
   * net banking). This is the external handoff the app has to send them to, and
   * `paymentPostbackUrl` is where the gateway returns them afterwards - our deep link.
   *
   * `amcOrderIds` takes the order's NUMERIC `old_id`, not the `mfp_...` string id.
   */
  async createPayment(params: {
    amcOrderIds: number[];
    bankAccountId: number;
    paymentPostbackUrl: string;
    method?: 'UPI' | 'NETBANKING';
    providerName?: string;
  }): Promise<{ id: number; token_url: string }> {
    try {
      return await this.tenantPost('/api/pg/payments/netbanking', {
        amc_order_ids: params.amcOrderIds,
        bank_account_id: params.bankAccountId,
        method: params.method ?? 'UPI',
        payment_postback_url: params.paymentPostbackUrl,
        provider_name: params.providerName ?? 'ONDC',
      });
    } catch (error: any) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;
      this.logger.error(
        `Cybrilla payment creation failed. HTTP ${status ?? 'unknown'} - ${JSON.stringify(responseData)}`,
      );
      if (status === 400) {
        throw new BadRequestException(
          responseData?.error?.errors ?? responseData?.error?.message ?? 'Could not start this payment.',
        );
      }
      throw new InternalServerErrorException('Cybrilla payment creation failed.');
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
    } catch (error: any) {
      // This used to swallow the failure entirely, leaving preVerifyAccessToken null.
      // verifyPan then sent "Bearer null", Cybrilla answered 401, and the caller saw a
      // generic 500 with nothing in the logs to explain it.
      const status = error?.response?.status;
      this.logger.error(`Cybrilla pre-verify authentication failed. HTTP ${status ?? 'unknown'}.`);
      this.preVerifyAccessToken = null;
    }
  }

  async verifyPan(pan: string, name: string, dateOfBirth: string) {
    if (!this.preVerifyAccessToken) await this.authenticatePreVerify();
    if (!this.preVerifyAccessToken) {
      throw new ServiceUnavailableException('PAN verification is temporarily unavailable. Please try again shortly.');
    }
    try {
      const response = await axios.post(`${this.preVerifyBaseUrl}/poa/pre_verifications`, { investor_identifier: pan, pan: { value: pan }, name: { value: name }, date_of_birth: { value: dateOfBirth } }, { headers: { Authorization: `Bearer ${this.preVerifyAccessToken}`, 'Content-Type': 'application/json' } });
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const payload = error?.response?.data?.error;

      // Cybrilla answers 400 with a per-field list, e.g.
      //   [{field:"pan", message:"not a valid pan"}]
      // Discarding it turned a user input problem into an opaque 500, so the app told
      // people "verification failed" when the real answer was "that PAN is not valid".
      const fieldErrors: string[] = Array.isArray(payload?.errors)
        ? payload.errors.map((e: { field?: string; message?: string }) => e?.message).filter(Boolean)
        : [];

      this.logger.error(
        `Cybrilla PAN pre-verification failed. HTTP ${status ?? 'unknown'}: ${payload?.message ?? error?.message ?? 'no detail'}`,
      );

      if (status === 400 && fieldErrors.length) {
        // Deduplicated because Cybrilla often reports the same cause twice, once against
        // the request and once against the field.
        throw new BadRequestException(`PAN verification rejected: ${[...new Set(fieldErrors)].join('; ')}.`);
      }
      if (status === 401 || status === 403) {
        this.preVerifyAccessToken = null; // Force a re-auth on the next attempt.
        throw new ServiceUnavailableException('PAN verification is temporarily unavailable. Please try again shortly.');
      }
      throw new InternalServerErrorException('Cybrilla PAN pre-verification failed.');
    }
  }

}
