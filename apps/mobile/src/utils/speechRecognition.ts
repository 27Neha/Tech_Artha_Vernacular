import { Platform } from 'react-native';
import {
  checkMicrophonePermission,
  requestMicrophonePermission,
  openPhoneSettings,
  PermissionResult,
} from './permissions';

// Map TechArtha vernacular app languages to BCP-47 speech recognition locales
const LANGUAGE_LOCALE_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
  pa: 'pa-IN',
  as: 'en-IN',
  or: 'hi-IN',
};

export function getSpeechRecognitionLocale(langCode: string): string {
  const normalized = (langCode || 'en').toLowerCase().split('-')[0];
  return LANGUAGE_LOCALE_MAP[normalized] || 'en-IN';
}

export interface SpeechAvailability {
  available: boolean;
  isDevelopmentBuildRequired?: boolean;
  reason?: string;
}

// Safely obtain native ExpoSpeechRecognitionModule without crashing Expo Go
let NativeSpeechModule: any = null;
let nativeModuleLoadError: string | null = null;

try {
  // Dynamically require so that environments without the compiled binary fail gracefully
  const speechPkg = require('expo-speech-recognition');
  if (speechPkg && speechPkg.ExpoSpeechRecognitionModule) {
    NativeSpeechModule = speechPkg.ExpoSpeechRecognitionModule;
  }
} catch (e: any) {
  nativeModuleLoadError = e?.message || 'Native module not found';
}

/**
 * Checks if real speech recognition engine is available in the current runtime environment.
 */
export async function checkSpeechRecognitionAvailability(): Promise<SpeechAvailability> {
  // 1. Check native module
  if (NativeSpeechModule) {
    try {
      if (typeof NativeSpeechModule.isRecognitionAvailable === 'function') {
        const isAvail = await NativeSpeechModule.isRecognitionAvailable();
        if (isAvail) {
          return { available: true };
        }
      }
    } catch (e: any) {
      console.warn('Speech recognition check failed:', e?.message);
    }
  }

  // 2. Check Web Speech API (if running on Web)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hasWebSpeech =
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    if (hasWebSpeech) {
      return { available: true };
    }
  }

  // 3. In Expo Go, native third-party modules are not precompiled into the Expo Go client binary
  return {
    available: false,
    isDevelopmentBuildRequired: true,
    reason:
      'Native speech recognition requires an Expo Development Build (npx expo run:android / eas build) because Expo Go does not bundle device SpeechRecognizer engines.',
  };
}

export interface StartRecognitionCallbacks {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (errorMessage: string, errorCode?: string) => void;
  onEnd: () => void;
  onStart?: () => void;
}

let activeRecognitionSession: any = null;
let activeListeners: { remove: () => void }[] = [];

/**
 * Starts actual voice-to-text recognition using device SpeechRecognizer or Web Speech API.
 */
export async function startRealSpeechRecognition(
  langCode: string,
  callbacks: StartRecognitionCallbacks
): Promise<boolean> {
  const locale = getSpeechRecognitionLocale(langCode);

  // Clean up any existing session
  stopRealSpeechRecognition();

  // Check availability
  const avail = await checkSpeechRecognitionAvailability();
  if (!avail.available) {
    if (avail.isDevelopmentBuildRequired) {
      callbacks.onError(
        'Speech recognition requires an Expo Development Build or Web browser. Expo Go does not bundle native SpeechRecognizer binaries. Run "npx expo run:android" or "npx expo start --web" to test genuine voice-to-text.',
        'DEV_BUILD_REQUIRED'
      );
    } else {
      callbacks.onError(
        'Speech recognition engine is unavailable on this device.',
        'UNAVAILABLE'
      );
    }
    return false;
  }

  // A. Native Module Path (Expo Development Build / Production APK / iOS)
  if (NativeSpeechModule) {
    try {
      // Clean up previous listeners
      activeListeners.forEach((l) => l?.remove?.());
      activeListeners = [];

      // Add native event listeners
      const resultListener = NativeSpeechModule.addListener(
        'result',
        (event: any) => {
          const results = event?.results;
          if (Array.isArray(results) && results.length > 0) {
            const transcript = results[0]?.transcript || '';
            const isFinal = Boolean(event?.isFinal);
            callbacks.onResult(transcript, isFinal);
          }
        }
      );
      if (resultListener) activeListeners.push(resultListener);

      const errorListener = NativeSpeechModule.addListener(
        'error',
        (event: any) => {
          const errCode = event?.error || 'unknown';
          let userMessage = 'Speech recognition failed. Please try again.';

          if (errCode === 'no-speech' || errCode === 'speech-timeout') {
            userMessage = 'No speech detected. Please speak clearly into the microphone.';
          } else if (errCode === 'audio-capture') {
            userMessage = 'Microphone recording error. Please check your audio input.';
          } else if (errCode === 'not-allowed') {
            userMessage = 'Microphone or speech permission was not allowed.';
          } else if (errCode === 'network') {
            userMessage = 'Network connection issue while processing speech recognition.';
          } else if (errCode === 'language-not-supported') {
            userMessage = `Selected language (${locale}) is not supported by device speech recognition.`;
          } else if (errCode === 'busy') {
            userMessage = 'Speech recognition service is currently busy.';
          }

          callbacks.onError(userMessage, errCode);
        }
      );
      if (errorListener) activeListeners.push(errorListener);

      const endListener = NativeSpeechModule.addListener('end', () => {
        callbacks.onEnd();
      });
      if (endListener) activeListeners.push(endListener);

      const startListener = NativeSpeechModule.addListener('start', () => {
        callbacks.onStart?.();
      });
      if (startListener) activeListeners.push(startListener);

      // Start recognition
      await NativeSpeechModule.start({
        lang: locale,
        interimResults: true,
        continuous: false,
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
      });

      return true;
    } catch (e: any) {
      callbacks.onError(e?.message || 'Failed to start speech recognition');
      return false;
    }
  }

  // B. Web Speech API Path (Web runtime / Chrome / Edge)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.lang = locale;
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onstart = () => {
          callbacks.onStart?.();
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const piece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += piece;
            } else {
              interimTranscript += piece;
            }
          }

          const currentText = finalTranscript || interimTranscript;
          callbacks.onResult(currentText, Boolean(finalTranscript));
        };

        recognition.onerror = (event: any) => {
          const errCode = event?.error || 'unknown';
          let userMsg = `Speech recognition error: ${errCode}`;
          if (errCode === 'no-speech') {
            userMsg = 'No speech detected. Please speak into the microphone.';
          } else if (errCode === 'not-allowed') {
            userMsg = 'Microphone access denied in browser settings.';
          }
          callbacks.onError(userMsg, errCode);
        };

        recognition.onend = () => {
          callbacks.onEnd();
        };

        recognition.start();
        activeRecognitionSession = recognition;
        return true;
      } catch (err: any) {
        callbacks.onError(err?.message || 'Web Speech API failed to initialize.');
        return false;
      }
    }
  }

  return false;
}

/**
 * Stops real speech recognition gracefully and waits for final transcription.
 */
export function stopRealSpeechRecognition(): void {
  if (NativeSpeechModule) {
    try {
      NativeSpeechModule.stop();
    } catch (e) {
      console.warn('Error stopping native speech recognition:', e);
    }
  }

  if (activeRecognitionSession && typeof activeRecognitionSession.stop === 'function') {
    try {
      activeRecognitionSession.stop();
    } catch (e) {
      console.warn('Error stopping web speech recognition:', e);
    }
    activeRecognitionSession = null;
  }
}

/**
 * Aborts speech recognition immediately and discards any audio.
 */
export function abortRealSpeechRecognition(): void {
  if (NativeSpeechModule) {
    try {
      NativeSpeechModule.abort();
    } catch (e) {
      console.warn('Error aborting native speech recognition:', e);
    }
  }

  if (activeRecognitionSession && typeof activeRecognitionSession.abort === 'function') {
    try {
      activeRecognitionSession.abort();
    } catch (e) {
      console.warn('Error aborting web speech recognition:', e);
    }
    activeRecognitionSession = null;
  }

  activeListeners.forEach((l) => l?.remove?.());
  activeListeners = [];
}
