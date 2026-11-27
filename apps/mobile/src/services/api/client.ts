/**
 * Single place every network call goes through.
 *
 * Replaces the old apiClient.ts, which exported a hardcoded localhost constant that
 * nothing imported, while each screen hand-rolled its own fetch - which is how three
 * screens ended up calling wrong paths and one ignored response.ok entirely.
 *
 * The bearer token is read through a getter registered by AuthProvider rather than
 * passed down as a prop, so screens never handle credentials themselves.
 */

import Constants from 'expo-constants';
const DEFAULT_API_PORT = process.env.EXPO_PUBLIC_API_PORT?.trim() || '3000';

/**
 * Extracts the Metro bundler host (IPv4 or hostname) from Expo runtime metadata.
 * When running in LAN mode over Wi-Fi or a mobile hotspot, Expo Go / dev client
 * populates hostUri with <developer-machine-ip>:<metro-port> (e.g. 192.168.1.10:8081).
 */
export function getMetroHost(): string | null {
  try {
    const rawHostUri =
      Constants?.expoConfig?.hostUri ||
      (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ||
      (Constants as any)?.manifest?.debuggerHost ||
      (Constants as any)?.linkingUri;

    if (!rawHostUri || typeof rawHostUri !== 'string') return null;

    const withoutProtocol = rawHostUri.replace(/^[a-zA-Z0-9+.-]+:\/\//, '');
    const hostPort = withoutProtocol.split('/')[0] ?? '';
    const host = hostPort.split(':')[0]?.trim();

    return host || null;
  } catch {
    return null;
  }
}

/**
 * Checks whether a Metro host belongs to a public tunnel service (e.g. .exp.direct).
 */
export function isTunnelHost(host: string): boolean {
  const lower = host.toLowerCase();
  return (
    lower.endsWith('.exp.direct') ||
    lower.endsWith('.ngrok.io') ||
    lower.endsWith('.ngrok-free.app') ||
    lower.endsWith('.ngrok.app') ||
    lower.endsWith('.loca.lt') ||
    lower.endsWith('.devtunnels.ms')
  );
}

/**
 * Resolves the backend API base URL in priority order:
 * 1. Explicit EXPO_PUBLIC_API_URL
 * 2. Automatic LAN / Hotspot host detection from Expo Metro host
 * 3. http://localhost:3000 fallback
 */
/**
 * Resolves the backend API base URL in strict priority order:
 * 1. Explicit EXPO_PUBLIC_API_URL if configured and not 'auto'
 *    (e.g. Production: https://api.techartha.com, Staging: https://api-staging.techartha.com)
 * 2. Metro Bundler host detected by Expo Go runtime:
 *    - If tunnel (e.g. .exp.direct, .ngrok-free.app), routes through Metro's /__api proxy
 *    - If LAN IP, routes directly to http://<lan-ip>:<api-port>
 * 3. Auto-detected LAN IP fallback (for development on local network)
 * 4. Localhost fallback (for simulator / web)
 */
/**
 * Dedicated override for a live backend tunnel URL (e.g. cloudflared or ngrok -> port 3000).
 * Per AGENTS.md rule, updating this propagates to connected devices via Fast Refresh.
 */
export const LIVE_TUNNEL_API_URL: string = '';

export function resolveApiUrl(): string {
  if (LIVE_TUNNEL_API_URL && LIVE_TUNNEL_API_URL.trim()) {
    return LIVE_TUNNEL_API_URL.trim().replace(/\/+$/, '');
  }

  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured && configured.toLowerCase() !== 'auto') {
    return configured.replace(/\/+$/, '');
  }

  const metroHost = getMetroHost();
  if (metroHost) {
    if (isTunnelHost(metroHost)) {
      return `https://${metroHost}/__api`;
    }
    return `http://${metroHost}:${DEFAULT_API_PORT}`;
  }

  const devLan = process.env.EXPO_PUBLIC_DEV_LAN_IP?.trim() || '192.168.1.13';
  return `http://${devLan}:${DEFAULT_API_PORT}`;
}

export const API_URL = resolveApiUrl();

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Converts native network exceptions (Java UnknownHostException, timeouts,
 * connection refused, offline) into clear, friendly, actionable messages.
 * Never leaks raw Java exceptions or stack traces to end users.
 */
export function sanitizeNetworkError(error: any, targetUrl?: string): string {
  if (!error) {
    return 'Unable to complete request. Please try again.';
  }

  const rawMessage = typeof error === 'string' ? error : error?.message || '';
  const errorName = error?.name || '';
  const lowerMsg = rawMessage.toLowerCase();

  // 1. Timeout / Abort errors
  if (
    errorName === 'AbortError' ||
    lowerMsg.includes('aborted') ||
    lowerMsg.includes('timed out') ||
    lowerMsg.includes('timeout')
  ) {
    return 'Connection timed out. The server took too long to respond. Please check your connection and try again.';
  }

  // 2. DNS / Host Resolution failures (UnknownHostException, ENOTFOUND, etc.)
  if (
    lowerMsg.includes('unknownhostexception') ||
    lowerMsg.includes('unable to resolve host') ||
    lowerMsg.includes('no address associated with hostname') ||
    lowerMsg.includes('enotfound') ||
    lowerMsg.includes('eai_again')
  ) {
    return 'Unable to connect to TechArtha server. Please verify your internet connection or network availability.';
  }

  // 3. Connection refused / network offline failures
  if (
    lowerMsg.includes('econnrefused') ||
    lowerMsg.includes('failed to connect to') ||
    lowerMsg.includes('connection refused') ||
    lowerMsg.includes('network request failed') ||
    lowerMsg.includes('network error')
  ) {
    return 'Unable to reach the server. Please check your Wi-Fi or mobile data connection and try again.';
  }

  // 4. SSL / Certificate errors
  if (
    lowerMsg.includes('cert') ||
    lowerMsg.includes('ssl') ||
    lowerMsg.includes('handshake')
  ) {
    return 'Secure connection failed. Please ensure your device date and time are accurate.';
  }

  // 5. Clean up any raw Java/native prefixes if present
  let clean = rawMessage.replace(/^(java\.[a-zA-Z0-9_.]+:|Error:|TypeError:)\s*/i, '').trim();

  // If the message contains technical stack trace artifacts, replace with friendly message
  if (clean.includes('java.') || clean.includes('at ') || clean.length > 250) {
    return 'A network error occurred while communicating with the server. Please try again.';
  }

  return clean || 'Unable to connect to TechArtha. Please try again.';
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type TokenGetter = () => string | null;

let getAccessToken: TokenGetter = () => null;
let handleUnauthorized: () => void = () => {};

/** Called once by AuthProvider so the client can authenticate and react to expiry. */
export function configureApi(options: { getAccessToken: TokenGetter; onUnauthorized: () => void }) {
  getAccessToken = options.getAccessToken;
  handleUnauthorized = options.onUnauthorized;
}

type RequestOptions = {
  /** Skips the Authorization header for the handful of public routes. */
  anonymous?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers ?? {}) };
  if (!options.anonymous) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const baseUrl = resolveApiUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options.signal ?? controller.signal,
    });
  } catch (error: any) {
    clearTimeout(timeout);
    const reason = sanitizeNetworkError(error, `${baseUrl}${path}`);
    throw new ApiError(0, reason, error);
  }
  clearTimeout(timeout);

  // 204 (logout) and empty bodies must not go through response.json().
  const raw = await response.text();
  const parsed = raw ? safeParse(raw) : null;

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw new ApiError(response.status, extractMessage(parsed, response.status), parsed);
  }

  return parsed as T;
}

/**
 * NestJS's ValidationPipe returns `message` as an ARRAY of failures, one per invalid
 * field. Stringifying that directly gives "a,b,c" with no spacing, so a form rejected on
 * three fields reads as noise. The invest endpoint has eight validated fields, which is
 * where this matters most.
 */
function extractMessage(parsed: unknown, status: number): string {
  if (status === 500) {
    if (parsed && typeof parsed === 'object' && (parsed as any).message && (parsed as any).message !== 'Internal server error') {
      return String((parsed as any).message);
    }
    return 'The server encountered an issue. Please try again shortly.';
  }
  if (status === 400 && (!parsed || !(parsed as any).message)) {
    return 'Invalid details provided. Please check and try again.';
  }
  const fallback = `Request failed (${status}).`;
  if (!parsed || typeof parsed !== 'object') return fallback;

  const message = (parsed as { message?: unknown; error?: unknown }).message;
  if (typeof message === 'string' && message) {
    if (message.toLowerCase().includes('database operation could not be completed')) {
      return 'Please verify that all required details are entered accurately and try again.';
    }
    return message;
  }

  if (Array.isArray(message)) {
    const parts = message
      .map((item) => (typeof item === 'string' ? item : (item as { message?: string })?.message))
      .filter(Boolean) as string[];
    if (parts.length) return parts.join('\n');
  }

  const errStr = (parsed as { error?: unknown }).error;
  if (typeof errStr === 'string' && errStr) {
    if (errStr.toLowerCase().includes('database')) {
      return 'Please verify your entered details and try again.';
    }
    return errStr;
  }

  return fallback;
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, body, options),
  del: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
};
