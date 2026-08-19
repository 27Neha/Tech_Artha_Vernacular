import { Injectable } from '@nestjs/common';

export interface SpeechToTextProvider { readonly status: 'MOCK' | 'NOT_CONFIGURED' | 'CONNECTED'; transcribe(audio: Uint8Array, locale?: string): Promise<string>; }
export interface TextToSpeechProvider { readonly status: 'MOCK' | 'NOT_CONFIGURED' | 'CONNECTED'; synthesize(text: string, locale?: string): Promise<Uint8Array>; }
export interface LanguageProvider { detect(text: string): 'en' | 'hi' | 'mr' | 'unknown'; }

class MockLanguageProvider implements LanguageProvider {
  detect(text: string) {
    if (/[\u0900-\u097F]/.test(text)) return /(ळ|ऱ)/.test(text) ? 'mr' : 'hi';
    return /^[\x00-\x7F]*$/.test(text) ? 'en' : 'unknown';
  }
}

@Injectable()
export class VoiceIntentService {
  private readonly languageProvider: LanguageProvider = new MockLanguageProvider();

  interpret(text: string) {
    const locale = this.languageProvider.detect(text);
    const value = text.toLowerCase();
    if (/(portfolio|पोर्टफोलियो|पोर्टफोलिओ)/.test(value)) return { locale, intent: 'SHOW_PORTFOLIO', navigation: '/portfolio', executionAllowed: false };
    if (/(sip|सिप)/.test(value)) return { locale, intent: 'EXPLAIN_SIP', navigation: '/assistant', executionAllowed: false };
    if (/(expense|खर्च)/.test(value)) return { locale, intent: 'SHOW_EXPENSES', navigation: '/expenses', executionAllowed: false };
    if (/(invest|निवेश|गुंतवणूक)/.test(value)) return { locale, intent: 'START_GOAL_FLOW', navigation: '/goals', executionAllowed: false, confirmationRequired: true };
    return { locale, intent: 'GENERAL_HELP', navigation: '/assistant', executionAllowed: false };
  }

  status() {
    return { speechToText: 'NOT_CONFIGURED — CREDENTIAL REQUIRED', textToSpeech: 'NOT_CONFIGURED — CREDENTIAL REQUIRED', supportedLanguages: ['en', 'hi', 'mr'], safety: 'Voice can navigate, start forms, and explain. It cannot execute sensitive actions.' };
  }
}
