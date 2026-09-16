'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  { code: 'ur', name: 'Urdu',      nativeName: 'اردو' },
  { code: 'as', name: 'Assamese',  nativeName: 'অসমীয়া' },
] as const;

// All known valid language codes — used to validate stored values
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
    'nav.language': 'हिंदी',
    'welcome.title': 'सरल और सुरक्षित निवेश, आपके सुनहरे भविष्य के लिए।',
    'welcome.desc': 'विशेष रूप से आपके लिए डिज़ाइन किए गए स्मार्ट म्यूचुअल फंड पोर्टफोलियो।',
    'welcome.badge1': 'SEBI द्वारा विनियमित',
    'welcome.badge2': 'BSE प्रमाणित',
    'welcome.badge3': 'भारत के लिए निर्मित',
    'welcome.stat1': 'संतुष्ट निवेशक',
    'welcome.stat2': 'प्रबंधित संपत्तियां',
    'welcome.start': 'निवेश शुरू करें',
    'welcome.login': 'मेरे पास पहले से एक खाता है',
    'login.title': 'आइए शुरू करते हैं',
    'login.desc': 'अपना मोबाइल नंबर दर्ज करें। हम एक सुरक्षित वन-टाइम सत्यापन कोड भेजेंगे।',
    'login.continue': 'सुरक्षित रूप से आगे बढ़ें',
    'kyc.title': 'अपनी पहचान सत्यापित करें',
    'kyc.verify': 'सत्यापित करें और आगे बढ़ें',
    'profile.title': 'अपने बारे में बताएं',
    'profile.desc': 'यह आपकी निवेश यात्रा को व्यक्तिगत बनाने में हमारी मदद करता है।',
    'profile.gender': 'लिंग',
    'profile.category': 'मैं हूँ एक...',
    'profile.category.general': 'सामान्य निवेशक',
    'profile.category.woman': 'महिला निवेशक',
    'profile.category.child': 'बच्चे के लिए निवेश',
    'profile.continue': 'आगे बढ़ें',
    'disclaimer': 'म्यूचुअल फंड निवेश बाजार जोखिमों के अधीन हैं; निवेश करने से पहले योजना से संबंधित सभी दस्तावेज ध्यान से पढ़ें.',
    'parent.title': 'माता-पिता की मंजूरी आवश्यक है',
    'parent.desc': 'चूंकि आप एक बच्चे के लिए खाता सेट कर रहे हैं, इसलिए हमें माता-पिता की मंजूरी की आवश्यकता है।',
  },
  mr: {
    'nav.language': 'मराठी',
    'welcome.title': 'सोपी आणि सुरक्षित गुंतवणूक, तुमच्या उज्ज्वल भविष्यासाठी.',
    'welcome.desc': 'तुमच्यासाठी विशेषतः डिझाइन केलेले स्मार्ट म्युच्युअल फंड पोर्टफोलिओ.',
    'welcome.badge1': 'SEBI द्वारे नियंत्रित',
    'welcome.badge2': 'BSE प्रमाणित',
    'welcome.badge3': 'भारतासाठी बनवलेले',
    'welcome.stat1': 'संतुष्ट गुंतवणूकदार',
    'welcome.stat2': 'व्यवस्थापित मालमत्ता',
    'welcome.start': 'गुंतवणूक सुरू करा',
    'welcome.login': 'माझे आधीपासून एक खाते आहे',
    'login.title': 'चला सुरुवात करूया',
    'login.desc': 'तुमचा मोबाईल नंबर एंटर करा. आम्ही एक सुरक्षित वन-टाइम पडताळणी कोड पाठवू.',
    'login.continue': 'सुरक्षितपणे पुढे जा',
    'kyc.title': 'तुमची ओळख पडताळून पहा',
    'kyc.verify': 'पडताळा आणि पुढे जा',
    'profile.title': 'तुमच्याबद्दल सांगा',
    'profile.desc': 'हे तुमचा गुंतवणुकीचा प्रवास वैयक्तिकृत करण्यास मदत करते.',
    'profile.gender': 'लिंग',
    'profile.category': 'मी आहे एक...',
    'profile.category.general': 'सामान्य गुंतवणूकदार',
    'profile.category.woman': 'महिला गुंतवणूकदार',
    'profile.category.child': 'मुलासाठी गुंतवणूक',
    'profile.continue': 'पुढे जा',
    'disclaimer': 'म्युच्युअल फंड गुंतवणूक बाजार जोखमीच्या अधीन आहेत; गुंतवणूक करण्यापूर्वी योजनेशी संबंधित सर्व कागदपत्रे काळजीपूर्वक वाचा.',
    'parent.title': 'पालकांची संमती आवश्यक',
    'parent.desc': 'तुम्ही मुलासाठी खाते तयार करत असल्याने, आम्हाला पालकांच्या मंजुरीची आवश्यकता आहे.',
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
    // Force English ('en') on every browser refresh
    const resolvedLang: Language = 'en';

    // 1. Unconditionally clear the googtrans cookie to prevent Google Translate from auto-translating
    const cookieDomain = window.location.hostname;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${cookieDomain}; path=/;`;

    // 2. Unconditionally clear localStorage saved language to prevent state syncing issues
    localStorage.setItem('language', 'en');

    // 3. Apply English state
    setLang(resolvedLang);
  }, []);

  const changeLang = (l: Language) => {
    setLang(l);
    localStorage.setItem('language', l);
    if (typeof (window as any).changeGoogleTranslate === 'function') {
      (window as any).changeGoogleTranslate(l);
    }
  };

  // t() always returns a string: uses the language's own translations if available,
  // falls back to English for languages without dedicated translations (gu, bn, ta, etc.)
  const t = (key: string): string => {
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
