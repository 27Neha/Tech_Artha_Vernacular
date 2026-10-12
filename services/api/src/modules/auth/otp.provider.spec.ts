import { BadRequestException } from '@nestjs/common';
import {
  ChannelRoutingOtpProvider,
  InteraktOtpProvider,
  MockOtpProvider,
} from './otp.provider';
import { EmailOtpProvider } from './email.provider';

/**
 * Regression tests for the defect that hid for weeks: InteraktOtpProvider returns
 * WITHOUT sending for any channel that is not WHATSAPP, and /auth/send-otp still
 * answered 202. Web's "Send via SMS" button and the minor guardian OTP both appeared to
 * work and delivered nothing.
 *
 * The rule these lock in: a channel with no configured provider must THROW. Silent
 * success is the failure mode that cost the time, not the missing provider.
 */
describe('OTP channel routing', () => {
  const input = { mobile: '+919999999999', code: '123456' } as const;

  let interakt: InteraktOtpProvider;
  let mock: MockOtpProvider;
  let email: EmailOtpProvider;
  let router: ChannelRoutingOtpProvider;
  let interaktSend: jest.Mock;

  beforeEach(() => {
    interaktSend = jest.fn().mockResolvedValue(undefined);
    interakt = new InteraktOtpProvider({ sendAuthenticationOtp: interaktSend } as any);
    mock = new MockOtpProvider();
    email = new EmailOtpProvider();
    router = new ChannelRoutingOtpProvider(interakt, mock, email);
    jest.spyOn(mock, 'send').mockResolvedValue(undefined);
    jest.spyOn(email, 'send').mockResolvedValue(undefined);
    delete process.env.OTP_SMS_MODE;
    process.env.NODE_ENV = 'test';
  });

  describe('InteraktOtpProvider', () => {
    it('sends for WHATSAPP', async () => {
      await interakt.send({ ...input, channel: 'WHATSAPP' });
      expect(interaktSend).toHaveBeenCalledWith(input.mobile, input.code);
    });

    it.each(['SMS', 'EMAIL'] as const)('does NOT send for %s', async (channel) => {
      await interakt.send({ ...input, channel });
      expect(interaktSend).not.toHaveBeenCalled();
    });
  });

  describe('router', () => {
    it('routes WHATSAPP to Interakt', async () => {
      await router.send({ ...input, channel: 'WHATSAPP' });
      expect(interaktSend).toHaveBeenCalledTimes(1);
    });

    it('routes EMAIL to the email provider', async () => {
      await router.send({ ...input, channel: 'EMAIL' });
      expect(email.send).toHaveBeenCalledTimes(1);
      expect(interaktSend).not.toHaveBeenCalled();
    });

    it('routes SMS to the mock when OTP_SMS_MODE=mock', async () => {
      process.env.OTP_SMS_MODE = 'mock';
      await router.send({ ...input, channel: 'SMS' });
      expect(mock.send).toHaveBeenCalledTimes(1);
      expect(interaktSend).not.toHaveBeenCalled();
    });

    it('THROWS for SMS when no SMS provider is configured', async () => {
      // The original bug: this silently resolved, so the caller returned 202.
      await expect(router.send({ ...input, channel: 'SMS' })).rejects.toThrow(BadRequestException);
      expect(mock.send).not.toHaveBeenCalled();
    });

    it('refuses the mock SMS provider in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.OTP_SMS_MODE = 'mock';
      await expect(router.send({ ...input, channel: 'SMS' })).rejects.toThrow(BadRequestException);
      expect(mock.send).not.toHaveBeenCalled();
    });

    it('never silently swallows a WHATSAPP request as the direct provider would', async () => {
      // Routing SMS through the router must not reach Interakt at all - the shape of
      // the original defect was SMS arriving at a WhatsApp-only provider.
      process.env.OTP_SMS_MODE = 'mock';
      await router.send({ ...input, channel: 'SMS' });
      expect(interaktSend).not.toHaveBeenCalled();
    });
  });
});
