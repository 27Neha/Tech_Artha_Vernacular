import { BadRequestException } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

/**
 * Replaces a `should be defined` stub with the one piece of real logic here: the webhook
 * verification handshake. It is a public, unauthenticated endpoint that gates whether a
 * third party can register itself to receive our webhook traffic, so the token
 * comparison is worth pinning.
 *
 * Note the default: WHATSAPP_VERIFY_TOKEN falls back to a hardcoded literal, so an
 * unconfigured deployment accepts a publicly known token. That is asserted below as
 * current behaviour, not as desirable behaviour.
 */
describe('WhatsappController.verifyWhatsAppWebhook', () => {
  let controller: WhatsappController;
  const originalToken = process.env.WHATSAPP_VERIFY_TOKEN;

  beforeEach(() => {
    controller = new WhatsappController(new WhatsappService());
  });

  afterAll(() => {
    if (originalToken === undefined) delete process.env.WHATSAPP_VERIFY_TOKEN;
    else process.env.WHATSAPP_VERIFY_TOKEN = originalToken;
  });

  it('echoes the challenge when mode and token both match', () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'a-real-secret';
    expect(controller.verifyWhatsAppWebhook('subscribe', 'a-real-secret', 'challenge-123')).toBe('challenge-123');
  });

  it('rejects a wrong token', () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'a-real-secret';
    expect(() => controller.verifyWhatsAppWebhook('subscribe', 'guessed', 'challenge-123')).toThrow(
      BadRequestException,
    );
  });

  it('rejects a mode other than subscribe, even with the right token', () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'a-real-secret';
    expect(() => controller.verifyWhatsAppWebhook('unsubscribe', 'a-real-secret', 'c')).toThrow(
      BadRequestException,
    );
  });

  it.each([undefined, '', null])('rejects a missing token (%s)', (token) => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'a-real-secret';
    expect(() => controller.verifyWhatsAppWebhook('subscribe', token as any, 'c')).toThrow(BadRequestException);
  });

  it('falls back to a hardcoded token when unconfigured - current behaviour, not safe', () => {
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    expect(controller.verifyWhatsAppWebhook('subscribe', 'techartha_whatsapp_token', 'c')).toBe('c');
  });
});

describe('WhatsappService.handleWhatsAppMessage', () => {
  const service = new WhatsappService();

  it('accepts but does not process an inbound message while unconfigured', async () => {
    const result = await service.handleWhatsAppMessage({
      entry: [{ changes: [{ value: { messages: [{ from: '919999999999', text: { body: 'hi' } }] } }] }],
    });
    expect(result).toMatchObject({ accepted: true, processed: false });
  });

  it('handles a payload with no messages without throwing', async () => {
    await expect(service.handleWhatsAppMessage({})).resolves.toMatchObject({ processed: false });
    await expect(service.handleWhatsAppMessage({ entry: [] })).resolves.toMatchObject({ processed: false });
  });
});
