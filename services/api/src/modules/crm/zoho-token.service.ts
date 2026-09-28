import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * Zoho OAuth for server-to-server calls.
 *
 * The refresh token never expires; access tokens last an hour. Both are held only in
 * memory - nothing is persisted, so a restart simply re-refreshes.
 *
 * Concurrent callers share a single in-flight refresh. That matters more than usual
 * here: the org holds one user licence, so its daily API credit allowance is small and
 * a burst of syncs must not each spend a refresh.
 */
@Injectable()
export class ZohoTokenService {
  private readonly logger = new Logger(ZohoTokenService.name);

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private inFlight: Promise<string> | null = null;
  private discoveredApiDomain: string | null = null;

  /**
   * The org lives on the India data centre - verified by probing both: accounts.zoho.in
   * returns invalid_code for this client while accounts.zoho.com returns invalid_client.
   * A client registered on one DC cannot authenticate against another.
   */
  private get accountsDomain(): string {
    return process.env.ZOHO_ACCOUNTS_DOMAIN || 'https://accounts.zoho.in';
  }

  /** Zoho returns the correct api_domain on refresh; env is only the starting guess. */
  get apiDomain(): string {
    return this.discoveredApiDomain ?? process.env.ZOHO_API_DOMAIN ?? 'https://www.zohoapis.in';
  }

  /** True once credentials are present. Callers use this rather than throwing on boot. */
  get configured(): boolean {
    return Boolean(
      process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET && process.env.ZOHO_REFRESH_TOKEN,
    );
  }

  /** Forces the next getAccessToken() to refresh. Called after a 401 from the CRM API. */
  invalidate(): void {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return this.accessToken;
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.refresh().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async refresh(): Promise<string> {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new InternalServerErrorException(
        'Zoho CRM is not configured. ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET and ZOHO_REFRESH_TOKEN are all required.',
      );
    }

    const params = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    });

    try {
      const response = await axios.post(`${this.accountsDomain}/oauth/v2/token`, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      });

      // Zoho answers HTTP 200 with an { error } body for bad credentials rather than a
      // 4xx, so a naive axios call would treat a rejected refresh as success.
      if (response.data?.error) {
        throw new Error(String(response.data.error));
      }

      const expiresIn = Number(response.data?.expires_in) || 3600;
      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + expiresIn * 1000 - 60000; // 60s safety margin
      if (response.data.api_domain) this.discoveredApiDomain = response.data.api_domain;

      this.logger.log('Zoho CRM access token refreshed.');
      return this.accessToken as string;
    } catch (error: any) {
      const detail = error?.response?.data?.error ?? error?.message ?? 'unknown error';
      this.logger.error(`Zoho token refresh failed: ${detail}`);
      throw new InternalServerErrorException('Could not authenticate with Zoho CRM.');
    }
  }
}
