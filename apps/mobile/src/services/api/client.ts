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
 * populates `hostUri` with `<developer-machine-ip>:<metro-port>` (e.g. `192.168.1.10:8081`).
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
 * Checks whether a Metro host belongs to a public tunnel service (e.g. `.exp.direct`).
 * Expo's `--tunnel` only tunnels the Metro bundler (port 8081), NOT the NestJS API (port 3000),
 * so we must not blindly append `:3000` to an Expo tunnel hostname.
 */
export function isTunnelHost(host: string): boolean {
  const lower = host.toLowerCase();
  return (
    lower.endsWith('.exp.direct') ||
    lower.endsWith('.ngrok.io') ||
    lower.endsWith('.ngrok-free.app') ||
    lower.endsWith('.ngrok.app') ||
    lower.endsWith('.loca.lt') ||
    lower.endsWith('.trycloudflare.com') ||
    lower.endsWith('.devtunnels.ms')
  );
}

/**
 * Resolves the backend API base URL in priority order:
 * 1. Explicit `EXPO_PUBLIC_API_URL` (when set to a concrete URL other than `'auto'`).
 *    Used for production, staging, or an explicit API tunnel / remote server URL.
 * 2. Automatic LAN / Hotspot host detection from Expo's active Metro host (`hostUri`),
 *    allowing developers to switch Wi-Fi networks or mobile hotspots without editing `.env`.
 * 3. `http://localhost:3000` fallback for local simulators, web, and unit tests.
 */
export function resolveApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured && configured.toLowerCase() !== 'auto') {
    return configured.replace(/\/+$/, '');
  }

  const metroHost = getMetroHost();
  if (metroHost && !isTunnelHost(metroHost)) {
    return `http://${metroHost}:${DEFAULT_API_PORT}`;
  }

  return `http://localhost:${DEFAULT_API_PORT}`;
}

export const API_URL = resolveApiUrl();

const DEFAULT_TIMEOUT_MS = 20000;

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

  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (!options.anonymous) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options.signal ?? controller.signal,
    });
  } catch (error: any) {
    clearTimeout(timeout);
    // A phone on mobile data cannot reach a laptop's localhost - by far the most common
    // cause of this branch in development, so say something more useful than "failed".
    const reason = error?.name === 'AbortError' ? 'The request timed out.' : 'Could not reach TechArtha.';
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
  const fallback = `Request failed (${status}).`;
  if (!parsed || typeof parsed !== 'object') return fallback;

  const message = (parsed as { message?: unknown }).message;
  if (typeof message === 'string' && message) return message;

  if (Array.isArray(message)) {
    const parts = message
      .map((item) => (typeof item === 'string' ? item : (item as { message?: string })?.message))
      .filter(Boolean) as string[];
    if (parts.length) return parts.join('\n');
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
};
