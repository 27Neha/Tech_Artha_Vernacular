import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig, Method } from 'axios';
import { ZohoTokenService } from './zoho-token.service';
import { mobileQueryCandidates, toLocalMobile } from './mobile-match';

/**
 * Custom single-line field mirroring the app's User.id onto each synced CRM record.
 *
 * This is the join key the whole sync depends on. Mobile and PAN are how a record is
 * *found* the first time; this is how it is addressed every time after, so reformatting
 * a phone number or correcting a PAN in the CRM can never orphan the link.
 *
 * It does not exist in the org yet - it has to be created on each synced module, and
 * marked unique, before any upsert using it will work.
 */
export const APP_USER_ID_FIELD = 'App_User_Id';

/** Zoho rejects more than 100 records in one write. */
const MAX_RECORDS_PER_CALL = 100;

export type ZohoRecord = Record<string, unknown>;

export type ZohoWriteResult = {
  code: string;
  status: 'success' | 'error';
  message: string;
  details?: Record<string, unknown>;
};

@Injectable()
export class ZohoCrmProvider {
  private readonly logger = new Logger(ZohoCrmProvider.name);

  constructor(private readonly tokens: ZohoTokenService) {}

  /**
   * Whether writes should actually go out. Kept as a getter rather than a boot-time
   * check so the service can be wired in before credentials exist - callers no-op
   * rather than the app failing to start.
   */
  get enabled(): boolean {
    return process.env.PRIMARY_CRM_PROVIDER === 'zoho' && this.tokens.configured;
  }

  private get apiVersion(): string {
    return process.env.ZOHO_API_VERSION || 'v8';
  }

  private async request<T>(method: Method, path: string, data?: unknown, allowRetry = true): Promise<T> {
    const token = await this.tokens.getAccessToken();
    const config: AxiosRequestConfig = {
      method,
      data,
      url: `${this.tokens.apiDomain}/crm/${this.apiVersion}${path}`,
      headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
      timeout: 20000,
    };

    try {
      const response = await axios.request<T>(config);
      return response.data;
    } catch (error: any) {
      // A token can be revoked server-side before its expiry, so one 401 is not fatal -
      // drop the cached token and try once more. A second 401 is a real auth failure.
      if (error?.response?.status === 401 && allowRetry) {
        this.logger.warn('Zoho returned 401; refreshing access token and retrying once.');
        this.tokens.invalidate();
        return this.request<T>(method, path, data, false);
      }
      throw error;
    }
  }

  /** Runs a COQL SELECT. Callers are responsible for the query being injection-safe. */
  async coql<T = ZohoRecord>(selectQuery: string): Promise<T[]> {
    const body = await this.request<{ data?: T[] }>('POST', '/coql', { select_query: selectQuery });
    return body?.data ?? [];
  }

  /**
   * Upsert rather than create, always. A sync that fails halfway must be replayable
   * without inserting a second copy of a real client, and Zoho matches on the given
   * fields to decide insert-vs-update.
   */
  async upsert(
    module: string,
    records: ZohoRecord[],
    duplicateCheckFields: string[] = [APP_USER_ID_FIELD],
  ): Promise<ZohoWriteResult[]> {
    if (!records.length) return [];

    const results: ZohoWriteResult[] = [];
    for (let i = 0; i < records.length; i += MAX_RECORDS_PER_CALL) {
      const chunk = records.slice(i, i + MAX_RECORDS_PER_CALL);
      const body = await this.request<{ data?: ZohoWriteResult[] }>('POST', `/${module}/upsert`, {
        data: chunk,
        duplicate_check_fields: duplicateCheckFields,
      });
      results.push(...(body?.data ?? []));
    }

    const failed = results.filter((r) => r.status === 'error');
    if (failed.length) {
      this.logger.warn(`Zoho upsert into ${module}: ${failed.length}/${results.length} rows failed.`);
    }
    return results;
  }

  /**
   * Finds an existing Contact for a mobile number, tolerating the org's mixed storage
   * formats. Returns null when there is no match *or* when several match - an ambiguous
   * result is never resolved automatically, because guessing wrong would attach a user
   * to another client's record. The caller should surface it for a human to settle.
   */
  async findContactIdByMobile(mobile: string): Promise<string | null> {
    const local = toLocalMobile(mobile);
    if (!local) return null;

    const candidates = mobileQueryCandidates(mobile);
    // Digits-only by construction in mobile-match, so interpolation is safe here.
    const inList = candidates.map((c) => `'${c}'`).join(',');
    const rows = await this.coql<{ id: string }>(
      `select id from Contacts where Mobile in (${inList}) limit 2`,
    );

    if (rows.length > 1) {
      this.logger.warn(`Mobile ending ${local.slice(-4)} matches multiple Contacts; not auto-linking.`);
      return null;
    }
    return rows[0]?.id ?? null;
  }

  /** Looks a record up by the app's own user id, once App_User_Id has been stamped on. */
  async findByAppUserId(module: string, appUserId: string): Promise<string | null> {
    const safe = appUserId.replace(/['\\]/g, '');
    const rows = await this.coql<{ id: string }>(
      `select id from ${module} where ${APP_USER_ID_FIELD} = '${safe}' limit 1`,
    );
    return rows[0]?.id ?? null;
  }

  /** Cheap authenticated call, for wiring into /health/providers. */
  async ping(): Promise<{ status: string; apiDomain?: string; detail?: string }> {
    if (!this.enabled) return { status: 'NOT_CONFIGURED' };
    try {
      await this.request('GET', '/settings/modules?type=api_supported');
      return { status: 'CONNECTED', apiDomain: this.tokens.apiDomain };
    } catch (error: any) {
      const detail = error?.response?.data?.message ?? error?.message ?? 'unknown error';
      return { status: 'UNAVAILABLE', detail: String(detail) };
    }
  }
}
