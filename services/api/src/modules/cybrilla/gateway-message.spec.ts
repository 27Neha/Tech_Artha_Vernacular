import { gatewayMessage } from './cybrilla.service';

describe('gatewayMessage', () => {
  it('turns field errors into a sentence instead of [object Object]', () => {
    const body = { error: { message: 'Validation failed. 1 error(s)', errors: [{ field: 'amount', message: 'should be greater than the min investment amount' }] } };
    expect(gatewayMessage(body, 'x')).toBe('amount should be greater than the min investment amount.');
  });

  it('uses the gateway message when there are no field errors', () => {
    expect(gatewayMessage({ error: { message: 'order is not in pending state.' } }, 'x')).toBe('order is not in pending state.');
  });

  it('falls back when the body says nothing useful', () => {
    expect(gatewayMessage({ error: { message: 'Validation failed. 2 error(s)', errors: [] } }, 'Could not place this order.')).toBe('Could not place this order.');
    expect(gatewayMessage(undefined, 'Could not place this order.')).toBe('Could not place this order.');
  });
});
