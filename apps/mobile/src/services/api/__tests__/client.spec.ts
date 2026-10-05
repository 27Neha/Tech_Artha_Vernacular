import { ApiError, api, configureApi } from '../client';

/**
 * The client is the single network path for the whole app, so its error handling is what
 * every screen shows the user.
 *
 * Two behaviours are load-bearing. NestJS returns validation failures as an ARRAY of
 * messages - the invest endpoint rejects on eight fields at once - and stringifying that
 * array gave an unreadable comma-run. And a 401 must trigger sign-out, because that is
 * what moves the user to the login screen instead of leaving them tapping a dead screen.
 */
const respond = (status: number, body: unknown, ok = status < 400) =>
  jest.fn().mockResolvedValue({
    ok,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  });

describe('api client', () => {
  let onUnauthorized: jest.Mock;

  beforeEach(() => {
    onUnauthorized = jest.fn();
    configureApi({ getAccessToken: () => 'test-token', onUnauthorized });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the parsed body on success', async () => {
    globalThis.fetch = respond(200, { status: 'SENT', devOtp: '123456' }) as any;
    await expect(api.post('/auth/send-otp', { mobile: '9999999999' })).resolves.toMatchObject({
      status: 'SENT',
    });
  });

  it('attaches the bearer token', async () => {
    const fetchMock = respond(200, {});
    globalThis.fetch = fetchMock as any;
    await api.get('/portfolio');
    const headers = (fetchMock.mock.calls[0][1] as any).headers;
    expect(headers.Authorization).toBe('Bearer test-token');
  });

  it('omits the token for an anonymous request', async () => {
    const fetchMock = respond(200, {});
    globalThis.fetch = fetchMock as any;
    await api.post('/auth/send-otp', {}, { anonymous: true });
    const headers = (fetchMock.mock.calls[0][1] as any).headers;
    expect(headers.Authorization).toBeUndefined();
  });

  it('joins an ARRAY of validation messages onto separate lines', async () => {
    // What /buckets/:id/invest actually returns when several fields are invalid.
    globalThis.fetch = respond(400, {
      message: [
        'amount must not be less than 100',
        'gender must be one of the following values: male, female, transgender',
        'ifscCode must be longer than or equal to 11 characters',
      ],
      statusCode: 400,
    }) as any;

    await expect(api.post('/buckets/balanced/invest', {})).rejects.toThrow(
      /amount must not be less than 100\ngender must be one of/,
    );
  });

  it('uses a plain string message as-is', async () => {
    globalThis.fetch = respond(400, { message: 'Complete KYC before investing.' }) as any;
    await expect(api.post('/buckets/balanced/invest', {})).rejects.toThrow(
      'Complete KYC before investing.',
    );
  });

  it('calls onUnauthorized for a 401 so the app can sign out', async () => {
    globalThis.fetch = respond(401, { message: 'Your session is invalid or has expired.' }) as any;
    await expect(api.get('/portfolio')).rejects.toThrow(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does NOT sign the user out for other error statuses', async () => {
    globalThis.fetch = respond(400, { message: 'Bad request' }) as any;
    await expect(api.get('/portfolio')).rejects.toThrow(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('handles an empty body, as /auth/logout returns 204', async () => {
    globalThis.fetch = respond(204, '') as any;
    await expect(api.post('/auth/logout')).resolves.toBeNull();
  });

  it('reports an unreachable server in words a user can act on', async () => {
    // The commonest development failure: a phone cannot reach a stale LAN address.
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network request failed')) as any;
    await expect(api.get('/health')).rejects.toThrow(/Could not reach TechArtha/);
  });

  it('exposes the HTTP status on the error for callers that branch on it', async () => {
    globalThis.fetch = respond(503, { message: 'temporarily unavailable' }) as any;
    await api.get('/health').catch((e) => {
      expect(e).toBeInstanceOf(ApiError);
      expect(e.status).toBe(503);
    });
  });

  it('falls back to a generic message when the body carries none', async () => {
    globalThis.fetch = respond(500, {}) as any;
    await expect(api.get('/health')).rejects.toThrow(/Request failed \(500\)/);
  });
});
