'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from '../i18n/i18n';

// All languages shown in the language selector.
// Translations exist for en/hi/mr; others fall back to English strings automatically.
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English',   nativeName: 'English' },
  { code: 'hi', name: 'Hindi',     nativeName: 'हिन्दी' },
  { code: 'mr', name: 'Marathi',   nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati',  nativeName: 'ગુજરાતી' },
  { code: 'bn', name: 'Bengali',   nativeName: 'বাংলা' },
  { code: 'ta', name: 'Tamil',     nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu',    nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada',   nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi',   nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia',      nativeName: 'ଓଡ଼ିଆ' },
  // EXCLUDED: Urdu ('ur') is permanently excluded from this list per requirements.
  // Do not re-add Urdu here.
  { code: 'as', name: 'Assamese',  nativeName: 'অসমୀয়া' },
] as const;

// All known valid language codes â€” used to validate stored values
const ALL_KNOWN_CODES = SUPPORTED_LANGUAGES.map(l => l.code) as string[];

type Language = typeof SUPPORTED_LANGUAGES[number]['code'];

const TRANSLATIONS: Partial<Record<Language, Record<string, string>>> = {
  en: {
    'nav.language': 'English',
    'welcome.title': 'Invest in your future, simply and securely.',
    'welcome.desc': 'Smart, tailored mutual fund portfolios designed just for you.',
    'welcome.badge1': 'SEBI Regulated',
    'welcome.badge2': 'BSE Certified',
    'welcome.badge3': 'Made for India',
    'welcome.stat1': 'Happy Investors',
    'welcome.stat2': 'Assets Managed',
    'welcome.start': 'Start Investing',
    'welcome.login': 'I already have an account',
    'login.title': "Let's get you started",
    'login.desc': "Enter your mobile number. We'll send a secure one-time verification code.",
    'login.continue': 'Continue securely',
    'kyc.title': 'Verify your identity',
    'kyc.verify': 'Verify & Continue',
    'profile.title': 'Tell us about yourself',
    'profile.desc': 'This helps us personalize your investment journey.',
    'profile.gender': 'Gender',
    'profile.category': 'I am a...',
    'profile.category.general': 'General Investor',
    'profile.category.woman': 'Woman Investor',
    'profile.category.child': 'Investing for a Child',
    'profile.continue': 'Continue',
    'disclaimer': 'Mutual Fund investments are subject to market risks; read all scheme-related documents carefully before investing.',
    'parent.title': 'Parental Approval Required',
    'parent.desc': "Since you are setting up an account for a child, we need a parent's approval.",
  },
  hi: {
    'nav.language': 'à¤¹à¤¿à¤‚à¤¦à¥€',
    'welcome.title': 'à¤¸à¤°à¤² à¤”à¤° à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ à¤¨à¤¿à¤µà¥‡à¤¶, à¤†à¤ªà¤•à¥‡ à¤¸à¥à¤¨à¤¹à¤°à¥‡ à¤­à¤µà¤¿à¤·à¥à¤¯ à¤•à¥‡ à¤²à¤¿à¤à¥¤',
    'welcome.desc': 'à¤µà¤¿à¤¶à¥‡à¤· à¤°à¥‚à¤ª à¤¸à¥‡ à¤†à¤ªà¤•à¥‡ à¤²à¤¿à¤ à¤¡à¤¿à¤œà¤¼à¤¾à¤‡à¤¨ à¤•à¤¿à¤ à¤—à¤ à¤¸à¥à¤®à¤¾à¤°à¥à¤Ÿ à¤®à¥à¤¯à¥‚à¤šà¥à¤…à¤² à¤«à¤‚à¤¡ à¤ªà¥‹à¤°à¥à¤Ÿà¤«à¥‹à¤²à¤¿à¤¯à¥‹à¥¤',
    'welcome.badge1': 'SEBI à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤µà¤¿à¤¨à¤¿à¤¯à¤®à¤¿à¤¤',
    'welcome.badge2': 'BSE à¤ªà¥à¤°à¤®à¤¾à¤£à¤¿à¤¤',
    'welcome.badge3': 'à¤­à¤¾à¤°à¤¤ à¤•à¥‡ à¤²à¤¿à¤ à¤¨à¤¿à¤°à¥à¤®à¤¿à¤¤',
    'welcome.stat1': 'à¤¸à¤‚à¤¤à¥à¤·à¥à¤Ÿ à¤¨à¤¿à¤µà¥‡à¤¶à¤•',
    'welcome.stat2': 'à¤ªà¥à¤°à¤¬à¤‚à¤§à¤¿à¤¤ à¤¸à¤‚à¤ªà¤¤à¥à¤¤à¤¿à¤¯à¤¾à¤‚',
    'welcome.start': 'à¤¨à¤¿à¤µà¥‡à¤¶ à¤¶à¥à¤°à¥‚ à¤•à¤°à¥‡à¤‚',
    'welcome.login': 'à¤®à¥‡à¤°à¥‡ à¤ªà¤¾à¤¸ à¤ªà¤¹à¤²à¥‡ à¤¸à¥‡ à¤à¤• à¤–à¤¾à¤¤à¤¾ à¤¹à¥ˆ',
    'login.title': 'à¤†à¤‡à¤ à¤¶à¥à¤°à¥‚ à¤•à¤°à¤¤à¥‡ à¤¹à¥ˆà¤‚',
    'login.desc': 'à¤…à¤ªà¤¨à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚à¥¤ à¤¹à¤® à¤à¤• à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ à¤µà¤¨-à¤Ÿà¤¾à¤‡à¤® à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¨ à¤•à¥‹à¤¡ à¤­à¥‡à¤œà¥‡à¤‚à¤—à¥‡à¥¤',
    'login.continue': 'à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ à¤°à¥‚à¤ª à¤¸à¥‡ à¤†à¤—à¥‡ à¤¬à¤¢à¤¼à¥‡à¤‚',
    'kyc.title': 'à¤…à¤ªà¤¨à¥€ à¤ªà¤¹à¤šà¤¾à¤¨ à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤ à¤•à¤°à¥‡à¤‚',
    'kyc.verify': 'à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤ à¤•à¤°à¥‡à¤‚ à¤”à¤° à¤†à¤—à¥‡ à¤¬à¤¢à¤¼à¥‡à¤‚',
    'profile.title': 'à¤…à¤ªà¤¨à¥‡ à¤¬à¤¾à¤°à¥‡ à¤®à¥‡à¤‚ à¤¬à¤¤à¤¾à¤à¤‚',
    'profile.desc': 'à¤¯à¤¹ à¤†à¤ªà¤•à¥€ à¤¨à¤¿à¤µà¥‡à¤¶ à¤¯à¤¾à¤¤à¥à¤°à¤¾ à¤•à¥‹ à¤µà¥à¤¯à¤•à¥à¤¤à¤¿à¤—à¤¤ à¤¬à¤¨à¤¾à¤¨à¥‡ à¤®à¥‡à¤‚ à¤¹à¤®à¤¾à¤°à¥€ à¤®à¤¦à¤¦ à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆà¥¤',
    'profile.gender': 'à¤²à¤¿à¤‚à¤—',
    'profile.category': 'à¤®à¥ˆà¤‚ à¤¹à¥‚à¤ à¤à¤•...',
    'profile.category.general': 'à¤¸à¤¾à¤®à¤¾à¤¨à¥à¤¯ à¤¨à¤¿à¤µà¥‡à¤¶à¤•',
    'profile.category.woman': 'à¤®à¤¹à¤¿à¤²à¤¾ à¤¨à¤¿à¤µà¥‡à¤¶à¤•',
    'profile.category.child': 'à¤¬à¤šà¥à¤šà¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤¨à¤¿à¤µà¥‡à¤¶',
    'profile.continue': 'à¤†à¤—à¥‡ à¤¬à¤¢à¤¼à¥‡à¤‚',
    'disclaimer': 'à¤®à¥à¤¯à¥‚à¤šà¥à¤…à¤² à¤«à¤‚à¤¡ à¤¨à¤¿à¤µà¥‡à¤¶ à¤¬à¤¾à¤œà¤¾à¤° à¤œà¥‹à¤–à¤¿à¤®à¥‹à¤‚ à¤•à¥‡ à¤…à¤§à¥€à¤¨ à¤¹à¥ˆà¤‚; à¤¨à¤¿à¤µà¥‡à¤¶ à¤•à¤°à¤¨à¥‡ à¤¸à¥‡ à¤ªà¤¹à¤²à¥‡ à¤¯à¥‹à¤œà¤¨à¤¾ à¤¸à¥‡ à¤¸à¤‚à¤¬à¤‚à¤§à¤¿à¤¤ à¤¸à¤­à¥€ à¤¦à¤¸à¥à¤¤à¤¾à¤µà¥‡à¤œ à¤§à¥à¤¯à¤¾à¤¨ à¤¸à¥‡ à¤ªà¤¢à¤¼à¥‡à¤‚.',
    'parent.title': 'à¤®à¤¾à¤¤à¤¾-à¤ªà¤¿à¤¤à¤¾ à¤•à¥€ à¤®à¤‚à¤œà¥‚à¤°à¥€ à¤†à¤µà¤¶à¥à¤¯à¤• à¤¹à¥ˆ',
    'parent.desc': 'à¤šà¥‚à¤‚à¤•à¤¿ à¤†à¤ª à¤à¤• à¤¬à¤šà¥à¤šà¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤–à¤¾à¤¤à¤¾ à¤¸à¥‡à¤Ÿ à¤•à¤° à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚, à¤‡à¤¸à¤²à¤¿à¤ à¤¹à¤®à¥‡à¤‚ à¤®à¤¾à¤¤à¤¾-à¤ªà¤¿à¤¤à¤¾ à¤•à¥€ à¤®à¤‚à¤œà¥‚à¤°à¥€ à¤•à¥€ à¤†à¤µà¤¶à¥à¤¯à¤•à¤¤à¤¾ à¤¹à¥ˆà¥¤',
  },
  mr: {
    'nav.language': 'à¤®à¤°à¤¾à¤ à¥€',
    'welcome.title': 'à¤¸à¥‹à¤ªà¥€ à¤†à¤£à¤¿ à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ à¤—à¥à¤‚à¤¤à¤µà¤£à¥‚à¤•, à¤¤à¥à¤®à¤šà¥à¤¯à¤¾ à¤‰à¤œà¥à¤œà¥à¤µà¤² à¤­à¤µà¤¿à¤·à¥à¤¯à¤¾à¤¸à¤¾à¤ à¥€.',
    'welcome.desc': 'à¤¤à¥à¤®à¤šà¥à¤¯à¤¾à¤¸à¤¾à¤ à¥€ à¤µà¤¿à¤¶à¥‡à¤·à¤¤à¤ƒ à¤¡à¤¿à¤à¤¾à¤‡à¤¨ à¤•à¥‡à¤²à¥‡à¤²à¥‡ à¤¸à¥à¤®à¤¾à¤°à¥à¤Ÿ à¤®à¥à¤¯à¥à¤šà¥à¤¯à¥à¤…à¤² à¤«à¤‚à¤¡ à¤ªà¥‹à¤°à¥à¤Ÿà¤«à¥‹à¤²à¤¿à¤“.',
    'welcome.badge1': 'SEBI à¤¦à¥à¤µà¤¾à¤°à¥‡ à¤¨à¤¿à¤¯à¤‚à¤¤à¥à¤°à¤¿à¤¤',
    'welcome.badge2': 'BSE à¤ªà¥à¤°à¤®à¤¾à¤£à¤¿à¤¤',
    'welcome.badge3': 'à¤­à¤¾à¤°à¤¤à¤¾à¤¸à¤¾à¤ à¥€ à¤¬à¤¨à¤µà¤²à¥‡à¤²à¥‡',
    'welcome.stat1': 'à¤¸à¤‚à¤¤à¥à¤·à¥à¤Ÿ à¤—à¥à¤‚à¤¤à¤µà¤£à¥‚à¤•à¤¦à¤¾à¤°',
    'welcome.stat2': 'à¤µà¥à¤¯à¤µà¤¸à¥à¤¥à¤¾à¤ªà¤¿à¤¤ à¤®à¤¾à¤²à¤®à¤¤à¥à¤¤à¤¾',
    'welcome.start': 'à¤—à¥à¤‚à¤¤à¤µà¤£à¥‚à¤• à¤¸à¥à¤°à¥‚ à¤•à¤°à¤¾',
    'welcome.login': 'à¤®à¤¾à¤à¥‡ à¤†à¤§à¥€à¤ªà¤¾à¤¸à¥‚à¤¨ à¤à¤• à¤–à¤¾à¤¤à¥‡ à¤†à¤¹à¥‡',
    'login.title': 'à¤šà¤²à¤¾ à¤¸à¥à¤°à¥à¤µà¤¾à¤¤ à¤•à¤°à¥‚à¤¯à¤¾',
    'login.desc': 'à¤¤à¥à¤®à¤šà¤¾ à¤®à¥‹à¤¬à¤¾à¤ˆà¤² à¤¨à¤‚à¤¬à¤° à¤à¤‚à¤Ÿà¤° à¤•à¤°à¤¾. à¤†à¤®à¥à¤¹à¥€ à¤à¤• à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ à¤µà¤¨-à¤Ÿà¤¾à¤‡à¤® à¤ªà¤¡à¤¤à¤¾à¤³à¤£à¥€ à¤•à¥‹à¤¡ à¤ªà¤¾à¤ à¤µà¥‚.',
    'login.continue': 'à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤à¤ªà¤£à¥‡ à¤ªà¥à¤¢à¥‡ à¤œà¤¾',
    'kyc.title': 'à¤¤à¥à¤®à¤šà¥€ à¤“à¤³à¤– à¤ªà¤¡à¤¤à¤¾à¤³à¥‚à¤¨ à¤ªà¤¹à¤¾',
    'kyc.verify': 'à¤ªà¤¡à¤¤à¤¾à¤³à¤¾ à¤†à¤£à¤¿ à¤ªà¥à¤¢à¥‡ à¤œà¤¾',
    'profile.title': 'à¤¤à¥à¤®à¤šà¥à¤¯à¤¾à¤¬à¤¦à¥à¤¦à¤² à¤¸à¤¾à¤‚à¤—à¤¾',
    'profile.desc': 'à¤¹à¥‡ à¤¤à¥à¤®à¤šà¤¾ à¤—à¥à¤‚à¤¤à¤µà¤£à¥à¤•à¥€à¤šà¤¾ à¤ªà¥à¤°à¤µà¤¾à¤¸ à¤µà¥ˆà¤¯à¤•à¥à¤¤à¤¿à¤•à¥ƒà¤¤ à¤•à¤°à¤£à¥à¤¯à¤¾à¤¸ à¤®à¤¦à¤¤ à¤•à¤°à¤¤à¥‡.',
    'profile.gender': 'à¤²à¤¿à¤‚à¤—',
    'profile.category': 'à¤®à¥€ à¤†à¤¹à¥‡ à¤à¤•...',
    'profile.category.general': 'à¤¸à¤¾à¤®à¤¾à¤¨à¥à¤¯ à¤—à¥à¤‚à¤¤à¤µà¤£à¥‚à¤•à¤¦à¤¾à¤°',
    'profile.category.woman': 'à¤®à¤¹à¤¿à¤²à¤¾ à¤—à¥à¤‚à¤¤à¤µà¤£à¥‚à¤•à¤¦à¤¾à¤°',
    'profile.category.child': 'à¤®à¥à¤²à¤¾à¤¸à¤¾à¤ à¥€ à¤—à¥à¤‚à¤¤à¤µà¤£à¥‚à¤•',
    'profile.continue': 'à¤ªà¥à¤¢à¥‡ à¤œà¤¾',
    'disclaimer': 'à¤®à¥à¤¯à¥à¤šà¥à¤¯à¥à¤…à¤² à¤«à¤‚à¤¡ à¤—à¥à¤‚à¤¤à¤µà¤£à¥‚à¤• à¤¬à¤¾à¤œà¤¾à¤° à¤œà¥‹à¤–à¤®à¥€à¤šà¥à¤¯à¤¾ à¤…à¤§à¥€à¤¨ à¤†à¤¹à¥‡à¤¤; à¤—à¥à¤‚à¤¤à¤µà¤£à¥‚à¤• à¤•à¤°à¤£à¥à¤¯à¤¾à¤ªà¥‚à¤°à¥à¤µà¥€ à¤¯à¥‹à¤œà¤¨à¥‡à¤¶à¥€ à¤¸à¤‚à¤¬à¤‚à¤§à¤¿à¤¤ à¤¸à¤°à¥à¤µ à¤•à¤¾à¤—à¤¦à¤ªà¤¤à¥à¤°à¥‡ à¤•à¤¾à¤³à¤œà¥€à¤ªà¥‚à¤°à¥à¤µà¤• à¤µà¤¾à¤šà¤¾.',
    'parent.title': 'à¤ªà¤¾à¤²à¤•à¤¾à¤‚à¤šà¥€ à¤¸à¤‚à¤®à¤¤à¥€ à¤†à¤µà¤¶à¥à¤¯à¤•',
    'parent.desc': 'à¤¤à¥à¤®à¥à¤¹à¥€ à¤®à¥à¤²à¤¾à¤¸à¤¾à¤ à¥€ à¤–à¤¾à¤¤à¥‡ à¤¤à¤¯à¤¾à¤° à¤•à¤°à¤¤ à¤…à¤¸à¤²à¥à¤¯à¤¾à¤¨à¥‡, à¤†à¤®à¥à¤¹à¤¾à¤²à¤¾ à¤ªà¤¾à¤²à¤•à¤¾à¤‚à¤šà¥à¤¯à¤¾ à¤®à¤‚à¤œà¥à¤°à¥€à¤šà¥€ à¤†à¤µà¤¶à¥à¤¯à¤•à¤¤à¤¾ à¤†à¤¹à¥‡.',
  }
};

type TranslationContextType = {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
  translateText: (text: string, targetLang: string) => Promise<string>;
};

const TranslationContext = createContext<TranslationContextType | null>(null);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    const resolvedLang: Language = ALL_KNOWN_CODES.includes(savedLang as string) ? (savedLang as Language) : 'en';

    // 1. Unconditionally clear the googtrans cookie to prevent Google Translate from auto-translating
    const cookieDomain = window.location.hostname;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${cookieDomain}; path=/;`;

    // 2. Save resolved language to localStorage
    localStorage.setItem('language', resolvedLang);

    // 3. Apply resolved language state
    setLang(resolvedLang);
    i18n.changeLanguage(resolvedLang);
  }, []);

  const changeLang = (l: Language) => {
    i18n.changeLanguage(l);
    setLang(l);
    localStorage.setItem('language', l);
    /* if (typeof (window as any).changeGoogleTranslate === 'function') { (window as any).changeGoogleTranslate(l); } */
  };

  // t() always returns a string: uses the language's own translations if available,
  // falls back to English for languages without dedicated translations (gu, bn, ta, etc.)
  const t = (key: string): string => {
    const res = i18n.t(key, { ns: 'common' });
    if (res && res !== key) return res as string;
    const langTranslations = (TRANSLATIONS as Record<string, Record<string, string>>)[lang];
    return langTranslations?.[key] || TRANSLATIONS.en?.[key] || key;
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

