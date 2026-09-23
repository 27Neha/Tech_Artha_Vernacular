'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from '../i18n/i18n';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' }
] as const;

export type Language = typeof SUPPORTED_LANGUAGES[number]['code'];

type TranslationContextType = {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
  translateText: (text: string, targetLang: string) => Promise<string>;
};

const TranslationContext = createContext<TranslationContextType | null>(null);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  // Load preferred language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
      setLangState(savedLang as Language);
      i18n.changeLanguage(savedLang);
    }
  }, []);

  const changeLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem('language', l);
    i18n.changeLanguage(l);
  };

  const t = (key: string): string => {
    // Only use i18next now, as requested to remove the dual-system.
    return i18n.t(key, { ns: 'common' });
  };

  // Bhashini API Integration Stub
  // To use live translation, call translateText(text, targetLang)
  const translateText = async (text: string, targetLang: string) => {
    if (targetLang === 'en') return text;
    try {
      const apiKey = process.env.NEXT_PUBLIC_BHASHINI_API_KEY;
      if (!apiKey) {
        console.warn('Bhashini API key missing. Using static translations.');
        return text; // Fallback
      }

      // Example Bhashini API request format
      const response = await fetch('https://bhashini.gov.in/api/v1/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          sourceLanguage: 'en',
          targetLanguage: targetLang,
          content: text
        })
      });
      
      const data = await response.json();
      return data.translated_content || text;
    } catch (e) {
      console.error('Bhashini Translation Error:', e);
      return text;
    }
  };

  return (
    <TranslationContext.Provider value={{ lang, setLang: changeLang, t, translateText }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) throw new Error('useTranslation must be used within TranslationProvider');
  return context;
}
