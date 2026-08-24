'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'hi' | 'mr';

const TRANSLATIONS: Record<Language, Record<string, string>> = {
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

  // Load preferred language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang && (savedLang === 'en' || savedLang === 'hi' || savedLang === 'mr')) {
      setLang(savedLang as Language);
    }
  }, []);

  const changeLang = (l: Language) => {
    setLang(l);
    localStorage.setItem('language', l);
  };

  const t = (key: string): string => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en'][key] || key;
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
