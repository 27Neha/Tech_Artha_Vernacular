import { TRANSLATIONS, Language } from '../translations';

/**
 * The translations are a hand-maintained copy of the web app's, and a key that exists in
 * English but not Hindi or Marathi degrades silently - t() falls back to English, so a
 * missing translation looks like a working app to anyone testing in English.
 *
 * These tests make an incomplete translation a build failure instead.
 */
const LANGUAGES: Language[] = ['en', 'hi', 'mr'];

describe('translations', () => {
  it('defines all three supported languages', () => {
    LANGUAGES.forEach((lang) => expect(TRANSLATIONS[lang]).toBeDefined());
  });

  it('has no missing keys in hi or mr relative to en', () => {
    const englishKeys = Object.keys(TRANSLATIONS.en).sort();
    (['hi', 'mr'] as const).forEach((lang) => {
      const missing = englishKeys.filter((key) => !(key in TRANSLATIONS[lang]));
      expect(missing).toEqual([]);
    });
  });

  it('has no extra keys in hi or mr that en lacks', () => {
    // An orphan key is dead weight and usually a typo in one file only.
    const englishKeys = new Set(Object.keys(TRANSLATIONS.en));
    (['hi', 'mr'] as const).forEach((lang) => {
      const extra = Object.keys(TRANSLATIONS[lang]).filter((key) => !englishKeys.has(key));
      expect(extra).toEqual([]);
    });
  });

  it('has no empty or whitespace-only values', () => {
    // Collected rather than asserted inline, so a failure names every offending key at
    // once instead of stopping at the first.
    const empties: string[] = [];
    LANGUAGES.forEach((lang) => {
      Object.entries(TRANSLATIONS[lang]).forEach(([key, value]) => {
        if (typeof value !== 'string' || value.trim() === '') empties.push(`${lang}.${key}`);
      });
    });
    expect(empties).toEqual([]);
  });

  it('actually translates - hi and mr are not just copies of en', () => {
    // Catches the failure where someone adds a key by pasting the English string into
    // all three files, which t() cannot distinguish from a real translation.
    (['hi', 'mr'] as const).forEach((lang) => {
      const identical = Object.keys(TRANSLATIONS.en).filter(
        (key) => TRANSLATIONS[lang][key] === TRANSLATIONS.en[key],
      );
      // 'nav.language' is legitimately the language's own name, so one is expected.
      expect(identical.length).toBeLessThanOrEqual(1);
    });
  });

  it('includes the regulatory disclaimer in every language', () => {
    LANGUAGES.forEach((lang) => {
      expect(TRANSLATIONS[lang]['disclaimer']).toBeTruthy();
    });
  });
});
