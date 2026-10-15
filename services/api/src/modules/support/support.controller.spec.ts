import { SupportController } from './support.controller';
import { SupportService, ACKNOWLEDGEMENT_MESSAGE } from './support.service';

describe('SupportController', () => {
  let controller: SupportController;
  let mockSupportService: any;

  beforeEach(() => {
    mockSupportService = {
      createQuery: jest.fn(),
      getUserQueries: jest.fn(),
      getQueryById: jest.fn(),
    };
    controller = new SupportController(mockSupportService as unknown as SupportService);
  });

  it('submits a query with headers and user session', async () => {
    const mockUser = { id: 'u-123', mobile: '9876543210', sessionId: 's-1' };
    const mockResponse = {
      id: 'ticket-123',
      referenceId: 'TA-Q-TICK0001',
      subject: 'Help with funds',
      message: 'Which fund has lower risk?',
      status: 'Received',
      rawStatus: 'RECEIVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailSent: true,
      recipientEmail: 'user@example.com',
      acknowledgementMessage: ACKNOWLEDGEMENT_MESSAGE,
    };

    mockSupportService.createQuery.mockResolvedValue(mockResponse);

    const result = await controller.submitQuery(
      mockUser,
      {
        subject: 'Help with funds',
        message: 'Which fund has lower risk?',
        email: 'user@example.com',
      },
      'idemp-key-123',
    );

    expect(mockSupportService.createQuery).toHaveBeenCalledWith('u-123', {
      subject: 'Help with funds',
      message: 'Which fund has lower risk?',
      email: 'user@example.com',
      idempotencyKey: 'idemp-key-123',
    });
    expect(result.referenceId).toBe('TA-Q-TICK0001');
    expect(result.status).toBe('Received');
    expect(result.acknowledgementMessage).toBe(ACKNOWLEDGEMENT_MESSAGE);
  });

  it('lists user queries', async () => {
    const mockUser = { id: 'u-123', mobile: '9876543210', sessionId: 's-1' };
    mockSupportService.getUserQueries.mockResolvedValue([]);

    const result = await controller.listQueries(mockUser);
    expect(mockSupportService.getUserQueries).toHaveBeenCalledWith('u-123');
    expect(result).toEqual([]);
  });

  it('retrieves single query details', async () => {
    const mockUser = { id: 'u-123', mobile: '9876543210', sessionId: 's-1' };
    const mockResponse = { id: 't-1', referenceId: 'TA-Q-T1', status: 'Received' };
    mockSupportService.getQueryById.mockResolvedValue(mockResponse);

    const result = await controller.getQuery(mockUser, 't-1');
    expect(mockSupportService.getQueryById).toHaveBeenCalledWith('u-123', 't-1');
    expect(result).toEqual(mockResponse);
  });
});
