import { Linking } from 'react-native';

/**
 * Official TechArtha Support Contact Details
 */
export const TECH_ARTHA_SUPPORT = {
  // Official company WhatsApp number (+91 83088 16023)
  phone: '918308816023',
  displayPhone: '+91 83088 16023',
  whatsappMessage: 'Hi TechArtha Support, I need assistance with the TechArtha app.',

  // Official company email support
  email: 'support@techartha.com',
  emailSubject: 'TechArtha App Support',
  emailBody: 'Hi TechArtha Support Team,',
} as const;

/**
 * Builds the WhatsApp application deep link and the browser/web fallback link.
 */
export const getWhatsAppUrls = () => {
  const encodedMessage = encodeURIComponent(TECH_ARTHA_SUPPORT.whatsappMessage);
  return {
    encodedMessage,
    appUrl: `whatsapp://send?phone=${TECH_ARTHA_SUPPORT.phone}&text=${encodedMessage}`,
    webUrl: `https://wa.me/${TECH_ARTHA_SUPPORT.phone}?text=${encodedMessage}`,
  };
};

/**
 * Builds the mailto: URL with pre-filled recipient, subject, and body.
 */
export const getEmailUrl = () => {
  const subject = encodeURIComponent(TECH_ARTHA_SUPPORT.emailSubject);
  const body = encodeURIComponent(TECH_ARTHA_SUPPORT.emailBody);
  return `mailto:${TECH_ARTHA_SUPPORT.email}?subject=${subject}&body=${body}`;
};

export interface ContactActionCallbacks {
  onFallback?: () => void;
  onError?: (error: unknown) => void;
}

/**
 * Opens WhatsApp directly using the native app deep link when available.
 * Gracefully falls back to WhatsApp Web / browser if the app is not installed.
 */
export const openWhatsAppSupport = async (
  callbacks?: ContactActionCallbacks
): Promise<boolean> => {
  const { appUrl, webUrl } = getWhatsAppUrls();

  try {
    const canOpenApp = await Linking.canOpenURL(appUrl);
    if (canOpenApp) {
      await Linking.openURL(appUrl);
      return true;
    }
  } catch {
    // If canOpenURL threw or failed, continue to web fallback below
  }

  // Fallback to web link (https://wa.me/...)
  try {
    callbacks?.onFallback?.();
    await Linking.openURL(webUrl);
    return true;
  } catch (fallbackError) {
    callbacks?.onError?.(fallbackError);
    return false;
  }
};

/**
 * Opens the device's default email client with pre-filled recipient, subject, and body.
 * Lets the user finish and send their message from their email client.
 */
export const openEmailSupport = async (
  callbacks?: ContactActionCallbacks
): Promise<boolean> => {
  const mailtoUrl = getEmailUrl();

  try {
    const canOpen = await Linking.canOpenURL(mailtoUrl);
    if (canOpen) {
      await Linking.openURL(mailtoUrl);
      return true;
    }

    // On some devices/emulators, canOpenURL returns false for mailto: but openURL succeeds
    await Linking.openURL(mailtoUrl);
    return true;
  } catch (error) {
    callbacks?.onError?.(error);
    return false;
  }
};
