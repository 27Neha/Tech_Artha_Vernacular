import { BadRequestException } from '@nestjs/common';
import {
  ChannelRoutingOtpProvider,
  InteraktOtpProvider,
  MockOtpProvider,
} from './otp.provider';
import { EmailOtpProvider } from './email.provider';

describe('OTP channel routing', () => {
  const input = { mobile: '+919999999999', code: '1234' } as const;

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
    process.env.NODE_ENV = 'test';
  });

  describe('InteraktOtpProvider', () => {
    it('sends for WHATSAPP', async () => {
      await interakt.send({ ...input, channel: 'WHATSAPP' });
      expect(interaktSend).toHaveBeenCalledWith(input.mobile, input.code);
    });

    it('throws when non-WHATSAPP channel is requested directly', async () => {
      await expect(interakt.send({ ...input, channel: 'EMAIL' })).rejects.toThrow(BadRequestException);
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

    it('strictly THROWS for SMS channel with BadRequestException', async () => {
      await expect(router.send({ ...input, channel: 'SMS' as any })).rejects.toThrow(BadRequestException);
      expect(mock.send).not.toHaveBeenCalled();
      expect(interaktSend).not.toHaveBeenCalled();
    });

    it('uses mock provider in dev mode when OTP_PROVIDER=mock', async () => {
      process.env.OTP_PROVIDER = 'mock';
      process.env.NODE_ENV = 'development';
      await router.send({ ...input, channel: 'WHATSAPP' });
      expect(mock.send).toHaveBeenCalledTimes(1);
      delete process.env.OTP_PROVIDER;
    });
  });
});
