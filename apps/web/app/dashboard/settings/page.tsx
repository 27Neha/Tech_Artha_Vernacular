'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTranslation } from '../../TranslationProvider';

export default function SettingsPage() {
  const router = useRouter();
  const { lang, setLang } = useTranslation();
  
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    setPushEnabled(localStorage.getItem('pushEnabled') !== 'false');
    setTheme(localStorage.getItem('appTheme') || 'system');
  }, []);

  const handleTogglePush = () => {
    const newVal = !pushEnabled;
    setPushEnabled(newVal);
    localStorage.setItem('pushEnabled', String(newVal));
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('appTheme', newTheme);
  };

  const handleLangSelect = (newLang: string) => {
    setLang(newLang as any);
    localStorage.setItem('language', newLang);
  };

  const toggleExpand = (label: string) => {
    if (expanded === label) setExpanded(null);
    else setExpanded(label);
  };

  return (
    <div className="flex flex-col min-h-screen p-6 bg-gray-50 pb-32">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-3xl leading-none opacity-80 text-[var(--dark)]">‹</button>
        <h1 className="text-2xl font-extrabold text-[var(--dark)]">Settings</h1>
      </div>

      <div className="flex flex-col gap-3">
        {/* LANGUAGE SETTING */}
        <div className={`bg-white rounded-2xl border ${expanded === 'Language' ? 'border-[var(--primary)]' : 'border-gray-100'} transition-all shadow-sm overflow-hidden`}>
          <button onClick={() => toggleExpand('Language')} className="w-full p-4 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl shrink-0">🌐</div>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">Language</p>
              <p className="text-gray-400 text-xs mt-0.5">Change app language</p>
            </div>
            <span className={`text-gray-300 text-xl transition-transform ${expanded === 'Language' ? 'rotate-90' : ''}`}>›</span>
          </button>
          {expanded === 'Language' && (
            <div className="px-4 pb-4 pt-1 flex flex-col gap-2 border-t border-gray-50">
              {['en', 'hi', 'mr'].map((l) => (
                <button key={l} onClick={() => handleLangSelect(l)} className={`flex items-center justify-between p-3 rounded-xl border ${lang === l ? 'bg-blue-50 border-[var(--primary)] text-[var(--primary)]' : 'border-gray-100 text-[var(--dark)]'}`}>
                  <span className="font-bold text-sm">{l === 'en' ? 'English' : l === 'hi' ? 'हिंदी' : 'मराठी'}</span>
                  {lang === l && <span className="font-bold">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PUSH NOTIFICATIONS SETTING */}
        <div className="bg-white rounded-2xl border border-gray-100 transition-all shadow-sm overflow-hidden p-4 flex items-center gap-4 text-left">
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl shrink-0">🔔</div>
          <div className="flex-1">
            <p className="font-bold text-[var(--dark)] text-sm">Push Notifications</p>
            <p className="text-gray-400 text-xs mt-0.5">SIPs, goals, and market updates</p>
          </div>
          <button 
            onClick={handleTogglePush}
            className={`w-12 h-6 rounded-full transition-all relative ${pushEnabled ? 'bg-[var(--primary)]' : 'bg-gray-200'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${pushEnabled ? 'left-[26px]' : 'left-0.5'}`}></div>
          </button>
        </div>

        {/* APP THEME SETTING */}
        <div className={`bg-white rounded-2xl border ${expanded === 'App Theme' ? 'border-[var(--primary)]' : 'border-gray-100'} transition-all shadow-sm overflow-hidden`}>
          <button onClick={() => toggleExpand('App Theme')} className="w-full p-4 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl shrink-0">🎨</div>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">App Theme</p>
              <p className="text-gray-400 text-xs mt-0.5">{theme.charAt(0).toUpperCase() + theme.slice(1)} Mode</p>
            </div>
            <span className={`text-gray-300 text-xl transition-transform ${expanded === 'App Theme' ? 'rotate-90' : ''}`}>›</span>
          </button>
          {expanded === 'App Theme' && (
            <div className="px-4 pb-4 pt-1 flex flex-col gap-2 border-t border-gray-50">
              {['light', 'dark', 'system'].map((t) => (
                <button key={t} onClick={() => handleThemeChange(t)} className={`flex items-center justify-between p-3 rounded-xl border ${theme === t ? 'bg-blue-50 border-[var(--primary)] text-[var(--primary)]' : 'border-gray-100 text-[var(--dark)]'}`}>
                  <span className="font-bold text-sm capitalize">{t}</span>
                  {theme === t && <span className="font-bold">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* HELP & SUPPORT SETTING */}
        <div className={`bg-white rounded-2xl border ${expanded === 'Help & Support' ? 'border-[var(--primary)]' : 'border-gray-100'} transition-all shadow-sm overflow-hidden`}>
          <button onClick={() => toggleExpand('Help & Support')} className="w-full p-4 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl shrink-0">❓</div>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">Help & Support</p>
              <p className="text-gray-400 text-xs mt-0.5">FAQs, Tutorials, and Contact Us</p>
            </div>
            <span className={`text-gray-300 text-xl transition-transform ${expanded === 'Help & Support' ? 'rotate-90' : ''}`}>›</span>
          </button>
          {expanded === 'Help & Support' && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-50">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-3">
                <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-2">24/7 AI Assistant</p>
                <button onClick={() => router.push('/dashboard/support/chat')} className="w-full bg-[var(--primary)] text-white text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-sm">
                  <span>💬</span> Start Live AI Chat
                </button>
              </div>
              
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-4">Contact TechArtha</p>
              <div className="flex flex-col gap-2">
                <a href="https://wa.me/918308816023" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-green-500 transition-all">
                  <span className="text-xl">📱</span>
                  <div>
                    <p className="text-sm font-bold text-[var(--dark)]">WhatsApp Support</p>
                    <p className="text-xs text-gray-500">+91 8308816023</p>
                  </div>
                </a>
                <a href="mailto:support@TechArtha.com" className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-blue-300 transition-all">
                  <span className="text-xl">✉️</span>
                  <div>
                    <p className="text-sm font-bold text-[var(--dark)]">Email Support</p>
                    <p className="text-xs text-gray-500">support@TechArtha.com</p>
                  </div>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* OTHER SETTINGS (Mocked) */}
        {[
          { icon: '🔒', label: 'Privacy & Security', desc: 'App Lock, Biometrics, and Data Privacy' },
          { icon: '📱', label: 'Linked Devices', desc: 'Manage devices logged into your account' },
        ].map((item) => (
          <button key={item.label} onClick={() => alert(`${item.label} configuration coming soon!`)} className="bg-white p-4 rounded-2xl flex items-center gap-4 text-left border border-gray-100 hover:border-[var(--primary)] transition-all shadow-sm">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl shrink-0">{item.icon}</div>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">{item.label}</p>
              <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
            </div>
            <span className="text-gray-300 text-xl">›</span>
          </button>
        ))}
      </div>
      
      <button
        onClick={() => {
          localStorage.clear();
          router.push('/');
        }}
        className="w-full mt-8 py-4 rounded-2xl bg-white border border-red-100 text-red-500 font-extrabold hover:bg-red-50 transition-all shadow-sm"
      >
        Sign Out
      </button>

      <p className="text-xs text-gray-400 text-center mt-10">TechArtha v1.0.0 (Build 42)</p>
    </div>
  );
}
