'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from './TranslationProvider';
import { useState, useRef, useEffect } from 'react';

const ALL_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' }
];

export default function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  
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
    setSearchQuery('');
  };

  const filteredLanguages = ALL_LANGUAGES.filter(
    (l) => l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           l.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentLangObj = ALL_LANGUAGES.find((l) => l.code === lang) || ALL_LANGUAGES[0];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="max-w-md mx-auto px-6 flex items-center justify-between h-12">
        <div className="flex items-center gap-2">
          {showBack && (
            <button 
              onClick={() => {
                if (pathname === '/buckets/custom') router.push('/buckets');
                else if (pathname === '/risk') router.push('/dashboard');
                else if (pathname.startsWith('/funds/')) router.push('/funds');
                else router.back();
              }} 
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
                className="flex items-center gap-1 text-xs font-bold text-[var(--primary)] bg-[var(--primary-light)] px-3 py-1.5 rounded-full uppercase transition-all hover:bg-[var(--primary)] hover:text-white notranslate"
                translate="no"
              >
                <span>🌐</span>
                <span>{currentLangObj.code.toUpperCase()}</span>
                <span className={`ml-1 text-[10px] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
              
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-[80vh] flex flex-col notranslate" translate="no">
                  <div className="p-3 border-b border-gray-100 bg-gray-50">
                    <input 
                      type="text" 
                      placeholder="Search language..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-[var(--primary)]"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto no-scrollbar" style={{ maxHeight: '300px' }}>
                    {filteredLanguages.length > 0 ? filteredLanguages.map((l) => (
                      <button 
                        key={l.code}
                        onClick={() => handleLangSelect(l.code)} 
                        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold border-b border-gray-50 hover:bg-[var(--primary-light)] ${lang === l.code ? 'text-[var(--primary)] bg-[var(--primary-light)]/50' : 'text-[var(--dark)]'}`}
                      >
                        <span>{l.name}</span>
                        <span className="text-gray-400 text-xs font-normal">{l.nativeName}</span>
                      </button>
                    )) : (
                      <div className="p-4 text-center text-sm text-gray-500 font-bold">No language found.</div>
                    )}
                  </div>
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
