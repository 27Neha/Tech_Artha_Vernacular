import { Platform, PermissionsAndroid, Linking } from 'react-native';

export type PermissionResult = 'granted' | 'denied' | 'never_ask_again' | 'unavailable';

/**
 * Checks if microphone permission is currently granted by the OS.
 */
export async function checkMicrophonePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    } catch (e) {
      console.warn('Error checking microphone permission:', e);
      return false;
    }
  }
  return true;
}

/**
 * Requests microphone permission using native OS dialog.
 */
export async function requestMicrophonePermission(): Promise<PermissionResult> {
  if (Platform.OS === 'android') {
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Access Required',
          message:
            'TechArtha requires microphone access to enable voice input and spoken financial queries in Indian regional languages.',
          buttonPositive: 'Allow Access',
          buttonNegative: 'Not Now',
        }
      );

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        return 'granted';
      } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        return 'never_ask_again';
      } else {
        return 'denied';
      }
    } catch (e) {
      console.warn('Error requesting microphone permission:', e);
      return 'denied';
    }
  }

  return 'granted';
}

/**
 * Opens phone application settings so user can manually grant permissions.
 */
export async function openPhoneSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (e) {
    console.warn('Error opening phone settings:', e);
  }
}
