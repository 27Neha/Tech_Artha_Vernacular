'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from './TranslationProvider';
import { useState, useRef, useEffect } from 'react';

export default function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const showBack = pathname !== '/';
  const showProfile = pathname.startsWith('/dashboard');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLangSelect = (newLang: string) => {
    setLang(newLang as any);
    localStorage.setItem('language', newLang);
    setDropdownOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="max-w-md mx-auto px-6 flex items-center justify-between h-12">
        <div className="flex items-center gap-2">
          {showBack && (
            <button 
              onClick={() => router.back()} 
              className="text-4xl text-[var(--dark)] leading-none -ml-2 w-10 h-10 flex items-center justify-center"
            >
              ‹
            </button>
          )}
          <div className="flex items-center h-full">
            <img src="/logo.png" alt="TechArtha Logo" className="h-7 w-auto object-contain" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pathname !== '/' && (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)} 
                className="flex items-center gap-1 text-xs font-bold text-[var(--primary)] bg-[var(--primary-light)] px-3 py-1.5 rounded-full uppercase transition-all hover:bg-[var(--primary)] hover:text-white"
              >
                <span>🌐</span>
                <span>{lang === 'en' ? 'EN' : lang === 'hi' ? 'हिंदी' : 'मराठी'}</span>
                <span className={`ml-1 text-[10px] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
              
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                  <button onClick={() => handleLangSelect('en')} className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-[var(--primary-light)] ${lang === 'en' ? 'text-[var(--primary)]' : 'text-[var(--dark)]'}`}>English</button>
                  <button onClick={() => handleLangSelect('hi')} className={`w-full text-left px-4 py-3 text-sm font-bold border-t border-gray-50 hover:bg-[var(--primary-light)] ${lang === 'hi' ? 'text-[var(--primary)]' : 'text-[var(--dark)]'}`}>हिंदी</button>
                  <button onClick={() => handleLangSelect('mr')} className={`w-full text-left px-4 py-3 text-sm font-bold border-t border-gray-50 hover:bg-[var(--primary-light)] ${lang === 'mr' ? 'text-[var(--primary)]' : 'text-[var(--dark)]'}`}>मराठी</button>
                </div>
              )}
            </div>
          )}
          {showProfile && (
            <button 
              onClick={() => router.push('/dashboard/profile/edit')} 
              className="w-9 h-9 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] font-bold shadow-sm"
            >
              P
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
