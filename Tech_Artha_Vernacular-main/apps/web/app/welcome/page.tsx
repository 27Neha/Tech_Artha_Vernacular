'use client';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../TranslationProvider';

export default function WelcomePage() {
  const router = useRouter();
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col flex-1 p-6 bg-white">
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-4xl font-extrabold text-[var(--dark)] leading-tight tracking-tight">
          {t('welcome.title')}
        </h1>

        <p className="text-gray-500 text-base md:text-lg mt-5 leading-relaxed">
          {t('welcome.desc')}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-8 text-xs md:text-sm text-gray-500 font-semibold items-center">
          <span className="flex items-center gap-1.5 whitespace-nowrap">🔒 {t('welcome.badge1')}</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">🏦 {t('welcome.badge2')}</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">🇮🇳 {t('welcome.badge3')}</span>
        </div>

        {/* Hero stats */}
        <div className="flex gap-4 mt-8">
          <div className="flex-1 bg-[var(--primary-light)] rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-[var(--primary)]">50K+</p>
            <p className="text-xs text-gray-500 mt-1">{t('welcome.stat1')}</p>
          </div>
          <div className="flex-1 bg-[#FFF4E8] rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-[var(--orange)]">₹1200Cr+</p>
            <p className="text-xs text-gray-500 mt-1">{t('welcome.stat2')}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <button onClick={() => router.push('/signup')} className="btn-primary">
          <span>{t('welcome.start')}</span>
          <span>→</span>
        </button>
        <button onClick={() => router.push('/login')} className="btn-outline">
          {t('welcome.login')}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
        {t('disclaimer')}
      </p>
    </div>
  );
}
