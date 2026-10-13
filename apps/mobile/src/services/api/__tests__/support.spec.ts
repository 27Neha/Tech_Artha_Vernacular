import { supportApi } from '../support';
import { api } from '../client';

jest.mock('../client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('supportApi', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('submits a query with an idempotency header and payload', async () => {
    const mockResponse = {
      id: 'ticket-999',
      referenceId: 'TA-Q-TICK0999',
      subject: 'SIP Inquiry',
      message: 'When is my next SIP deduction?',
      status: 'Received',
      rawStatus: 'RECEIVED',
      createdAt: '2026-10-13T12:00:00Z',
      updatedAt: '2026-10-13T12:00:00Z',
      emailSent: true,
      recipientEmail: 'investor@techartha.com',
      acknowledgementMessage:
        "We've received your query! Our team is looking into it, and we'll update you as soon as we have more information.",
    };

    (api.post as jest.Mock).mockResolvedValue(mockResponse);

    const result = await supportApi.submitQuery({
      subject: 'SIP Inquiry',
      message: 'When is my next SIP deduction?',
      email: 'investor@techartha.com',
    });

    expect(api.post).toHaveBeenCalledTimes(1);
    const [path, body, options] = (api.post as jest.Mock).mock.calls[0];
    expect(path).toBe('/support/queries');
    expect(body.subject).toBe('SIP Inquiry');
    expect(body.message).toBe('When is my next SIP deduction?');
    expect(body.email).toBe('investor@techartha.com');
    expect(body.idempotencyKey).toBeDefined();
    expect(options.headers['Idempotency-Key']).toBe(body.idempotencyKey);

    expect(result.referenceId).toBe('TA-Q-TICK0999');
    expect(result.status).toBe('Received');
    expect(result.acknowledgementMessage).toBe(
      "We've received your query! Our team is looking into it, and we'll update you as soon as we have more information.",
    );
  });

  it('uses explicitly provided idempotencyKey if supplied', async () => {
    (api.post as jest.Mock).mockResolvedValue({});

    await supportApi.submitQuery({
      subject: 'Test',
      message: 'Details',
      idempotencyKey: 'custom-idemp-123',
    });

    const [_, body, options] = (api.post as jest.Mock).mock.calls[0];
    expect(body.idempotencyKey).toBe('custom-idemp-123');
    expect(options.headers['Idempotency-Key']).toBe('custom-idemp-123');
  });

  it('fetches submitted queries list', async () => {
    (api.get as jest.Mock).mockResolvedValue([{ id: 't-1', referenceId: 'TA-Q-001', status: 'Received' }]);

    const list = await supportApi.getQueries();
    expect(api.get).toHaveBeenCalledWith('/support/queries');
    expect(list.length).toBe(1);
    expect(list[0].referenceId).toBe('TA-Q-001');
  });

  it('fetches single query status by ID or Reference ID', async () => {
    (api.get as jest.Mock).mockResolvedValue({ id: 't-1', referenceId: 'TA-Q-001', status: 'Under Review' });

    const detail = await supportApi.getQueryById('TA-Q-001');
    expect(api.get).toHaveBeenCalledWith('/support/queries/TA-Q-001');
    expect(detail.status).toBe('Under Review');
  });
});
