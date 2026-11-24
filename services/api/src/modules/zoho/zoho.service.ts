import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ZohoCrmService {
  private readonly logger = new Logger(ZohoCrmService.name);
  
  // Cache the access token in memory to avoid refreshing on every request
  private accessToken: string | null = null;
  private tokenExpiryTime: number = 0;

  async createOrUpdateContact(userData: { mobile: string; name?: string; email?: string; onboardingStatus?: string }): Promise<void> {
    try {
      const token = await this.getValidAccessToken();
      if (!token) {
        this.logger.error('Zoho CRM OAuth is not fully configured (missing Client ID, Secret, or Refresh Token). Skipping CRM sync.');
        return;
      }

      const baseUrl = process.env.ZOHO_CRM_BASE_URL || 'https://www.zohoapis.in/crm/v3';

      // 1. Search for existing Contact by Phone
      const searchUrl = `${baseUrl}/Contacts/search?phone=${encodeURIComponent(userData.mobile)}`;
      
      let existingContactId: string | null = null;
      try {
          const searchRes = await axios.get(searchUrl, {
            headers: { Authorization: `Zoho-oauthtoken ${token}` }
          });
          if (searchRes.data && searchRes.data.data && searchRes.data.data.length > 0) {
              existingContactId = searchRes.data.data[0].id;
          }
      } catch (err: any) {
          if (err.response?.status !== 204 && err.response?.status !== 404) {
              this.logger.error(`Zoho Search Error: ${err.message}`);
          }
      }

      // 2. Prepare Field Mapping
      // NOTE: We only use standard known fields (Last_Name is mandatory in Zoho).
      // Exact custom API names will be injected here once confirmed by the Zoho team.
      const recordData = {
          Last_Name: userData.name || 'TechArtha Client',
          Phone: userData.mobile,
          ...(userData.email && { Email: userData.email })
      };

      // 3. Upsert Contact
      if (existingContactId) {
          await axios.put(`${baseUrl}/Contacts`, { data: [{ ...recordData, id: existingContactId }] }, {
              headers: { Authorization: `Zoho-oauthtoken ${token}` }
          });
          this.logger.log('[ZOHO CRM] Contact updated for verified user.');
      } else {
          await axios.post(`${baseUrl}/Contacts`, { data: [recordData] }, {
              headers: { Authorization: `Zoho-oauthtoken ${token}` }
          });
          this.logger.log('[ZOHO CRM] Contact created for verified user.');
      }
    } catch (error: any) {
      this.logger.error(`Failed to sync with Zoho CRM. Error: ${error.message}`);
    }
  }

  /**
   * Retrieves a valid access token. If expired or missing, it attempts an OAuth refresh.
   */
  private async getValidAccessToken(): Promise<string | null> {
    // If we have a hardcoded token for testing/bypass, use it (discouraged for production)
    const staticToken = process.env.ZOHO_CRM_ACCESS_TOKEN;
    if (staticToken && staticToken.length > 20) {
      return staticToken;
    }

    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    const accountsUrl = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.in';

    if (!clientId || !clientSecret || !refreshToken) {
      return null;
    }

    if (this.accessToken && Date.now() < this.tokenExpiryTime) {
      return this.accessToken;
    }

    try {
      this.logger.log('Refreshing Zoho CRM OAuth token...');
      const response = await axios.post(`${accountsUrl}/oauth/v2/token`, null, {
        params: {
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token'
        }
      });

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        // Zoho tokens usually expire in 3600 seconds (1 hour). Subtract 5 mins for safety cushion.
        const expiresInSeconds = response.data.expires_in || 3600;
        this.tokenExpiryTime = Date.now() + (expiresInSeconds - 300) * 1000;
        return this.accessToken;
      } else {
        throw new Error('No access token returned in refresh response.');
      }
    } catch (error: any) {
      this.logger.error(`Zoho OAuth Refresh Failed: ${error.message}`);
      return null;
    }
  }
}
