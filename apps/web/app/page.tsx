'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation, SUPPORTED_LANGUAGES } from './TranslationProvider';

export default function LanguagePage() {
  const router = useRouter();
  const { t, setLang } = useTranslation('common');
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    if (selected) {
      setLang(selected as any);
      router.push('/welcome');
    }
  };

  return (
    <div className="flex flex-col flex-1 p-5 bg-[#F8F9FB] min-h-screen">
      <div className="flex-1 flex flex-col pt-8">
        <div className="flex justify-center mb-4">
          <span className="bg-indigo-50 text-[var(--primary)] text-xs font-extrabold px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
            {t('welcome.welcomeToTechArtha')}
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-[var(--dark)] text-center mb-3 leading-tight">
          {t('welcome.financeSimplified')}<br/>
          <span className="text-[var(--primary)]">{t('welcome.nowInYourLanguage')}</span>
        </h1>
        <p className="text-gray-500 text-sm text-center mb-8 px-4">
          {t('welcome.startYourWealth')}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-24 overflow-y-auto no-scrollbar notranslate" translate="no">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelected(lang.code)}
              className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all text-center relative ${
                selected === lang.code
                  ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                  : 'border-gray-200 bg-white hover:border-[var(--primary)]/40'
              }`}
            >
              <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 transition-all ${
                selected === lang.code
                  ? 'border-[var(--primary)] bg-[var(--primary)]'
                  : 'border-gray-300 bg-white'
              }`} />
              <p className={`text-lg font-bold w-full truncate mt-1 ${selected === lang.code ? 'text-[var(--primary)]' : 'text-[var(--dark)]'}`}>
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
          <span>{t('common.continue') || 'Continue'}</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
