'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from './TranslationProvider';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇮🇳' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', flag: '🇮🇳' }
];

export default function LanguagePage() {
  const router = useRouter();
  const { setLang } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    if (selected) {
      localStorage.setItem('language', selected);
      setLang(selected as any);
      router.push('/welcome');
    }
  };

  return (
    <div className="flex flex-col flex-1 p-5 bg-[#F8F9FB] min-h-screen">
      <div className="flex-1 flex flex-col pt-8">
        <div className="flex justify-center mb-4">
          <span className="bg-indigo-50 text-[var(--primary)] text-xs font-extrabold px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
            Welcome to TechArtha
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-[var(--dark)] text-center mb-3 leading-tight">
          Finance Simplified.<br/>
          <span className="text-[var(--primary)]">Now in your language.</span>
        </h1>
        <p className="text-gray-500 text-sm text-center mb-8 px-4">
          Start your wealth creation journey in the language you are most comfortable with.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-24 overflow-y-auto no-scrollbar notranslate" translate="no">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelected(lang.code)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${
                selected === lang.code
                  ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                  : 'border-gray-200 bg-white hover:border-[var(--primary)]/40'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xl">{lang.flag}</span>
                <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                  selected === lang.code
                    ? 'border-[var(--primary)] bg-[var(--primary)]'
                    : 'border-gray-300 bg-white'
                }`} />
              </div>
              <p className={`text-lg font-bold w-full truncate ${selected === lang.code ? 'text-[var(--primary)]' : 'text-[var(--dark)]'}`}>
                {lang.nativeName}
              </p>
              <p className="text-xs text-gray-400 w-full truncate">{lang.name}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100 max-w-md mx-auto z-10">
        <button
          onClick={handleContinue}
          disabled={!selected}
          className="btn-primary w-full"
        >
          <span>Continue</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
