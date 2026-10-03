import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Language, TRANSLATIONS } from './translations';

/**
 * Mirrors apps/web/app/TranslationProvider.tsx: same keys, same copy, same English
 * fallback. The app previously had a language picker that stored a choice nothing ever
 * read, which is a conspicuous gap in a product called Vernacular.
 *
 * Persisted through expo-secure-store rather than AsyncStorage only because SecureStore
 * is already a dependency; a language preference is not a secret, so swap it if
 * AsyncStorage is ever added for other reasons.
 */

const LANGUAGE_KEY = 'techartha.language';

type TranslationContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  /** Returns the string for `key`, falling back to English, then to the key itself. */
  t: (key: string) => string;
  /** False until the stored preference has been read, so nothing flashes in English first. */
  ready: boolean;
};

const TranslationContext = createContext<TranslationContextValue | null>(null);

export const TranslationProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Language>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(LANGUAGE_KEY);
        if (!cancelled && (saved === 'en' || saved === 'hi' || saved === 'mr')) {
          setLangState(saved);
        }
      } catch {
        // Keychain unavailable - English is a safe default.
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    void SecureStore.setItemAsync(LANGUAGE_KEY, next).catch(() => undefined);
  }, []);

  const t = useCallback(
    (key: string): string => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key,
    [lang],
  );

  const value = useMemo<TranslationContextValue>(() => ({ lang, setLang, t, ready }), [lang, setLang, t, ready]);

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
};

export function useTranslation(): TranslationContextValue {
  const context = useContext(TranslationContext);
  if (!context) throw new Error('useTranslation must be used inside a TranslationProvider.');
  return context;
}
