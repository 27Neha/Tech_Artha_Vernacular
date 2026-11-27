import { API_URL } from '../services/api/client';

/**
 * Global Stale-While-Revalidate (SWR) & Parallel Prefetch Engine
 *
 * Ensures GET reads across the entire app resolve in < 0.05s from memory when warm
 * (even during periodic / focus updates) while silently revalidating against the
 * real NestJS + PostgreSQL backend in the background.
 *
 * Security & Data Isolation:
 * - Every cached entry is strictly partitioned by Authorization token signature.
 * - Clearing auth / signing out immediately purges all authenticated cache entries.
 * - Any POST / PUT / PATCH / DELETE mutation invalidates freshness so subsequent
 *   reads immediately trigger live revalidation.
 */

interface CacheRecord {
  bodyText: string;
  status: number;
  updatedAt: number;
  isAuth: boolean;
}

interface InflightOutcome {
  bodyText: string;
  status: number;
  ok: boolean;
}

const STALE_AFTER_MS = 4000; // Revalidate silently in background if older than 4s
const responseCache = new Map<string, CacheRecord>();
const inflightRequests = new Map<string, Promise<InflightOutcome | null>>();
let nativeFetchRef: typeof fetch | null = null;

function hashAuthHeader(headersInit?: HeadersInit): { sig: string; isAuth: boolean } {
  if (!headersInit) return { sig: 'public', isAuth: false };

  let authVal = '';
  if (headersInit instanceof Headers) {
    authVal = headersInit.get('Authorization') || headersInit.get('authorization') || '';
  } else if (Array.isArray(headersInit)) {
    const found = headersInit.find(([k]) => k.toLowerCase() === 'authorization');
    authVal = found ? found[1] : '';
  } else if (typeof headersInit === 'object') {
    const rec = headersInit as Record<string, string>;
    authVal = rec.Authorization || rec.authorization || '';
  }

  if (!authVal) return { sig: 'public', isAuth: false };
  // Use tail + length of JWT for fast collision-free per-session isolation without storing raw token keys
  const clean = authVal.trim();
  const tail = clean.slice(-24);
  return { sig: `auth_${clean.length}_${tail}`, isAuth: true };
}

function buildResponse(record: CacheRecord): Response {
  return new Response(record.bodyText, {
    status: record.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isCacheableGetUrl(url: string): boolean {
  if (!url) return false;
  if (API_URL && url.startsWith(API_URL)) {
    // Never cache OTP / auth handshake endpoints (those are POST anyway, plus safety guard)
    if (url.includes('/auth/otp') || url.includes('/auth/login') || url.includes('/auth/signup')) {
      return false;
    }
    return true;
  }
  if (url.startsWith('https://api.mfapi.in/mf/search')) {
    return true;
  }
  return false;
}

export function clearAuthenticatedFastCache(): void {
  for (const [key, record] of responseCache.entries()) {
    if (record.isAuth) {
      responseCache.delete(key);
    }
  }
}

function markAuthCacheStale(sig: string): void {
  for (const [key, record] of responseCache.entries()) {
    if (key.startsWith(`${sig}::`)) {
      record.updatedAt = 0;
    }
  }
}

async function performNetworkGet(
  origFetch: typeof fetch,
  cacheKey: string,
  url: string,
  init: RequestInit | undefined,
  isAuth: boolean,
): Promise<InflightOutcome | null> {
  const existing = inflightRequests.get(cacheKey);
  if (existing) return existing;

  const promise = (async (): Promise<InflightOutcome | null> => {
    try {
      const res = await origFetch(url, init);
      const bodyText = await res.text();
      if (res.ok) {
        responseCache.set(cacheKey, {
          bodyText,
          status: res.status,
          updatedAt: Date.now(),
          isAuth,
        });
      }
      return { bodyText, status: res.status, ok: res.ok };
    } catch {
      return null;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  inflightRequests.set(cacheKey, promise);
  return promise;
}

export function installFastFetch(): void {
  if (nativeFetchRef || typeof globalThis.fetch !== 'function') return;
  const origFetch = globalThis.fetch.bind(globalThis);
  nativeFetchRef = origFetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as any)?.url || '';
    const method = (init?.method || 'GET').toUpperCase();

    if (method !== 'GET') {
      const res = await origFetch(input as any, init);
      if (res.ok && API_URL && url.startsWith(API_URL)) {
        const { sig, isAuth } = hashAuthHeader(init?.headers);
        if (isAuth) markAuthCacheStale(sig);
      }
      return res;
    }

    if (!isCacheableGetUrl(url)) {
      return origFetch(input as any, init);
    }

    const { sig, isAuth } = hashAuthHeader(init?.headers);
    const cacheKey = `${sig}::${url}`;
    const cached = responseCache.get(cacheKey);

    if (cached) {
      // Serve instantaneously (<5ms) and silently revalidate in background if stale
      if (Date.now() - cached.updatedAt > STALE_AFTER_MS) {
        void performNetworkGet(origFetch, cacheKey, url, init, isAuth);
      }
      return buildResponse(cached);
    }

    // Cold read: deduplicate concurrent identical GETs
    const outcome = await performNetworkGet(origFetch, cacheKey, url, init, isAuth);
    if (outcome) {
      return new Response(outcome.bodyText, {
        status: outcome.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return origFetch(input as any, init);
  };
}

/**
 * Pre-warms public market, fund discovery, and risk profiler endpoints on app launch
 * so opening ArthaVerse, Funds, or Risk Profiler resolves in <0.1s.
 */
export function prefetchPublicEndpoints(): void {
  const f = globalThis.fetch;
  if (typeof f !== 'function' || !API_URL) return;

  const publicPaths = [
    '/market/overview',
    '/market/news',
    '/market/daily',
    '/market/brief?riskProfile=Moderate',
    '/funds/search?q=Index',
    '/funds/search?q=Equity',
    '/funds/search?q=Hybrid',
    '/funds/search?q=Debt',
    '/risk/questions',
  ];

  for (const path of publicPaths) {
    f(`${API_URL}${path}`).catch(() => {});
  }
}

/**
 * Pre-warms authenticated investor endpoints immediately upon login / session restore
 * so Home, Portfolio, Goals, Expenses, Notifications, and Profile open in <0.1s.
 */
export function prefetchAuthenticatedEndpoints(token: string | null): void {
  const f = globalThis.fetch;
  if (!token || typeof f !== 'function' || !API_URL) return;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const authPaths = [
    '/auth/profile',
    '/portfolio',
    '/goals',
    '/expenses',
    '/buckets/investments',
    '/support/my-queries',
  ];

  for (const path of authPaths) {
    f(`${API_URL}${path}`, { headers }).catch(() => {});
  }
}

installFastFetch();
