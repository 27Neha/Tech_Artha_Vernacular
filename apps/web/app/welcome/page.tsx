'use client';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../TranslationProvider';
import AnimatedHeroVisual from '../../components/AnimatedHeroVisual';

export default function WelcomePage() {
  const router = useRouter();
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col flex-1 p-6 bg-depth relative overflow-hidden rounded-3xl md:rounded-none">
      <div className="flex-1 flex flex-col justify-center relative z-10">
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--dark)] leading-tight tracking-tight animate-fade-in-up">
          {t('welcome.title')}
        </h1>

        <p className="text-gray-500 text-base md:text-lg mt-3 leading-relaxed animate-fade-in-up delay-100">
          {t('welcome.desc')}
        </p>

        {/* Abstract Growth Visual placed creatively below intro */}
        <div className="animate-fade-in-up delay-200">
          <AnimatedHeroVisual />
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-3 mt-2 mb-6 text-xs md:text-sm font-semibold items-center animate-fade-in-up delay-300">
          <span className="flex items-center gap-1.5 whitespace-nowrap bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-gray-100 text-[var(--dark)] transition-transform hover:scale-105">
            🔒 {t('welcome.badge1')}
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-gray-100 text-[var(--dark)] transition-transform hover:scale-105">
            🏦 {t('welcome.badge2')}
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-gray-100 text-[var(--dark)] transition-transform hover:scale-105">
            🇮🇳 {t('welcome.badge3')}
          </span>
        </div>

        {/* Hero stats */}
        <div className="flex gap-4 animate-fade-in-up delay-400">
          <div className="flex-1 card-premium bg-gradient-to-br from-white to-[var(--primary-light)]">
            <p className="text-2xl font-extrabold text-[var(--primary)] drop-shadow-sm">50K+</p>
            <p className="text-xs text-gray-600 mt-1 font-medium">{t('welcome.stat1')}</p>
          </div>
          <div className="flex-1 card-premium bg-gradient-to-br from-white to-[#FFF4E8]">
            <p className="text-2xl font-extrabold text-[var(--orange)] drop-shadow-sm">₹1200Cr+</p>
            <p className="text-xs text-gray-600 mt-1 font-medium">{t('welcome.stat2')}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-8 relative z-10 animate-fade-in-up delay-500">
        <button onClick={() => router.push('/signup')} className="btn-primary">
          <span>{t('welcome.start')}</span>
          <span className="font-bold text-xl">→</span>
        </button>
        <button onClick={() => router.push('/login')} className="btn-outline bg-white/60 backdrop-blur-sm border-2 transition-all hover:bg-white">
          {t('welcome.login')}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed relative z-10 animate-fade-in-up delay-500">
        {t('disclaimer')}
      </p>
    </div>
  );
}
