'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from './TranslationProvider';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी', native: 'Hindi', flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी', native: 'Marathi', flag: '🇮🇳' },
];

export default function LanguagePage() {
  const router = useRouter();
  const { setLang } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    if (selected) {
      localStorage.setItem('language', selected);
      setLang(selected as 'en' | 'hi' | 'mr');
      router.push('/welcome');
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 bg-white justify-center">
      <div className="flex-1 flex flex-col justify-center">

      <h1 className="text-3xl font-extrabold text-[var(--dark)] text-center mb-2">
        आपली गुंतवणूक, आपल्या भाषेत
      </h1>
      <p className="text-gray-500 text-center mb-10">Choose your preferred language</p>

      <div className="flex flex-col gap-4 mb-10">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setSelected(lang.code)}
            className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
              selected === lang.code
                ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                : 'border-gray-200 bg-white hover:border-[var(--primary)]/40'
            }`}
          >
            <span className="text-3xl">{lang.flag}</span>
            <div className="flex-1">
              <p className={`text-xl font-bold ${selected === lang.code ? 'text-[var(--primary)]' : 'text-[var(--dark)]'}`}>
                {lang.label}
              </p>
              <p className="text-sm text-gray-400">{lang.native}</p>
            </div>
            <div className={`w-6 h-6 rounded-full border-4 transition-all ${
              selected === lang.code
                ? 'border-[var(--primary)] bg-[var(--primary)]'
                : 'border-gray-300 bg-white'
            }`} />
          </button>
        ))}
        </div>
      </div>

      <button
        onClick={handleContinue}
        disabled={!selected}
        className="btn-primary"
      >
        <span>Continue / पुढे जा</span>
        <span>→</span>
      </button>
    </div>
  );
}
