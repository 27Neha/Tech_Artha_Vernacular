import { Linking } from 'react-native';
import {
  TECH_ARTHA_SUPPORT,
  getWhatsAppUrls,
  getEmailUrl,
  openWhatsAppSupport,
  openEmailSupport,
} from '../contact';

describe('Contact Us Support Utilities', () => {
  let canOpenURLSpy: jest.SpyInstance;
  let openURLSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    canOpenURLSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
  });

  afterEach(() => {
    canOpenURLSpy.mockRestore();
    openURLSpy.mockRestore();
  });

  describe('Official Contact Configuration', () => {
    it('targets the official TechArtha WhatsApp phone number', () => {
      expect(TECH_ARTHA_SUPPORT.phone).toBe('918308816023');
      expect(TECH_ARTHA_SUPPORT.displayPhone).toBe('+91 83088 16023');
    });

    it('has the exact required pre-filled WhatsApp message', () => {
      expect(TECH_ARTHA_SUPPORT.whatsappMessage).toBe(
        'Hi TechArtha Support, I need assistance with the TechArtha app.'
      );
    });

    it('targets the official TechArtha support email address', () => {
      expect(TECH_ARTHA_SUPPORT.email).toBe('support@techartha.com');
      expect(TECH_ARTHA_SUPPORT.emailSubject).toBe('TechArtha App Support');
      expect(TECH_ARTHA_SUPPORT.emailBody).toBe('Hi TechArtha Support Team,');
    });
  });

  describe('URL Generation', () => {
    it('generates properly formatted and URL-encoded WhatsApp deep link and web link', () => {
      const { appUrl, webUrl, encodedMessage } = getWhatsAppUrls();

      expect(encodedMessage).toBe(
        encodeURIComponent('Hi TechArtha Support, I need assistance with the TechArtha app.')
      );
      expect(appUrl).toBe(
        'whatsapp://send?phone=918308816023&text=' + encodedMessage
      );
      expect(webUrl).toBe(
        'https://wa.me/918308816023?text=' + encodedMessage
      );
    });

    it('generates properly formatted and URL-encoded mailto URL', () => {
      const mailtoUrl = getEmailUrl();
      const encodedSubject = encodeURIComponent('TechArtha App Support');
      const encodedBody = encodeURIComponent('Hi TechArtha Support Team,');

      expect(mailtoUrl).toBe(
        `mailto:support@techartha.com?subject=${encodedSubject}&body=${encodedBody}`
      );
    });
  });

  describe('openWhatsAppSupport', () => {
    it('opens native WhatsApp app when canOpenURL returns true', async () => {
      canOpenURLSpy.mockResolvedValue(true);
      openURLSpy.mockResolvedValue(true as any);

      const result = await openWhatsAppSupport();

      expect(result).toBe(true);
      expect(canOpenURLSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^whatsapp:\/\/send\?phone=918308816023/)
      );
      expect(openURLSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^whatsapp:\/\/send\?phone=918308816023/)
      );
    });

    it('falls back to web wa.me URL when native app cannot be opened', async () => {
      canOpenURLSpy.mockResolvedValue(false);
      openURLSpy.mockResolvedValue(true as any);

      const onFallback = jest.fn();
      const result = await openWhatsAppSupport({ onFallback });

      expect(result).toBe(true);
      expect(onFallback).toHaveBeenCalledTimes(1);
      expect(openURLSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^https:\/\/wa\.me\/918308816023/)
      );
    });

    it('falls back to web URL when canOpenURL throws', async () => {
      canOpenURLSpy.mockRejectedValue(new Error('Permission denied'));
      openURLSpy.mockResolvedValue(true as any);

      const result = await openWhatsAppSupport();

      expect(result).toBe(true);
      expect(openURLSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^https:\/\/wa\.me\/918308816023/)
      );
    });

    it('calls onError callback when both native and web fallback fail', async () => {
      canOpenURLSpy.mockResolvedValue(false);
      openURLSpy.mockRejectedValue(new Error('Network error'));

      const onError = jest.fn();
      const result = await openWhatsAppSupport({ onError });

      expect(result).toBe(false);
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('openEmailSupport', () => {
    it('opens mailto URL when canOpenURL returns true', async () => {
      canOpenURLSpy.mockResolvedValue(true);
      openURLSpy.mockResolvedValue(true as any);

      const result = await openEmailSupport();

      expect(result).toBe(true);
      expect(canOpenURLSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^mailto:support@techartha\.com/)
      );
      expect(openURLSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^mailto:support@techartha\.com/)
      );
    });

    it('attempts openURL directly when canOpenURL returns false', async () => {
      canOpenURLSpy.mockResolvedValue(false);
      openURLSpy.mockResolvedValue(true as any);

      const result = await openEmailSupport();

      expect(result).toBe(true);
      expect(openURLSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^mailto:support@techartha\.com/)
      );
    });

    it('calls onError callback when openURL throws', async () => {
      canOpenURLSpy.mockResolvedValue(true);
      openURLSpy.mockRejectedValue(new Error('No mail app found'));

      const onError = jest.fn();
      const result = await openEmailSupport({ onError });

      expect(result).toBe(false);
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
