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
  
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const [userName, setUserName] = useState('Priya Sharma');
  const [userMobile, setUserMobile] = useState('+91 98765 43210');

  const showBack = pathname !== '/';
  const showProfile = pathname.startsWith('/dashboard');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Re-read user details whenever navigation happens
  useEffect(() => {
    setUserName(localStorage.getItem('userName') || 'Priya Sharma');
    setUserMobile(localStorage.getItem('mobile') || '+91 98765 43210');
  }, [pathname]);

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
            <div className="relative" ref={profileDropdownRef}>
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)} 
                className="w-9 h-9 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] font-bold shadow-sm hover:bg-[var(--primary)] hover:text-white transition-all"
              >
                {userName.charAt(0).toUpperCase()}
              </button>
              
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xl font-bold shrink-0">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-extrabold text-[var(--dark)] text-sm leading-tight">{userName}</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-0.5">{userMobile}</p>
                      <span className="inline-block px-2 py-0.5 bg-green-50 text-green-600 text-[9px] font-bold rounded-md mt-1 border border-green-100 uppercase tracking-wider">KYC Verified</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-100 pt-3 flex flex-col gap-1">
                    <button 
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        router.push('/dashboard/profile');
                      }}
                      className="text-left px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--dark)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-all flex items-center justify-between"
                    >
                      View Profile <span className="text-[var(--primary)]">→</span>
                    </button>
                    <button 
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        router.push('/dashboard/settings');
                      }}
                      className="text-left px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--dark)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-all flex items-center justify-between"
                    >
                      Settings
                    </button>
                    <button 
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        router.push('/');
                      }}
                      className="text-left px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all mt-1 border-t border-gray-50 pt-3"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
