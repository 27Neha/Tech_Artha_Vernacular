'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../TranslationProvider';

export default function SettingsPage() {
  const router = useRouter();
  const { t, lang, setLang } = useTranslation('common');
  
  const [expanded, setExpanded] = useState<string | null>(null);
  const [theme, setTheme] = useState('system');
  const [deviceNotifStatus, setDeviceNotifStatus] = useState<NotificationPermission | 'unknown'>('unknown');

  useEffect(() => {
    const checkPerm = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setDeviceNotifStatus(Notification.permission);
      } else {
        setDeviceNotifStatus('unknown');
      }
    };
    checkPerm();
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', checkPerm);
      window.addEventListener('focus', checkPerm);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('visibilitychange', checkPerm);
        window.removeEventListener('focus', checkPerm);
      }
    };
  }, []);

  const handleManageDeviceNotif = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert(t('settings.notifNotSupported') || 'Notifications not supported on this device.');
      return;
    }
    if (deviceNotifStatus === 'default' || deviceNotifStatus === 'unknown') {
      const perm = await Notification.requestPermission();
      setDeviceNotifStatus(perm);
    } else if (deviceNotifStatus === 'denied') {
      alert(t('settings.notifEnableInstructions') || 'Please open your app or device settings to enable notifications.');
    } else {
      alert(t('settings.notifAlreadyEnabled') || 'Notifications are already enabled. You can manage them in your device settings.');
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('appTheme', newTheme);
    if (typeof (window as any).updateTheme === 'function') { (window as any).updateTheme(); }
  };

  const handleLangSelect = (newLang: string) => {
    setLang(newLang as any);
  };

  const toggleExpand = (label: string) => {
    if (expanded === label) setExpanded(null);
    else setExpanded(label);
  };

  return (
    <div className="flex flex-col min-h-screen p-6 bg-gray-50 pb-32">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-[var(--dark)]">{t('settings.title')}</h1>
      </div>

      <div className="flex flex-col gap-3">
        {/* LANGUAGE SETTING */}
        <div className={`bg-white rounded-2xl border ${expanded === 'Language' ? 'border-[var(--primary)]' : 'border-gray-100'} transition-all shadow-sm overflow-hidden`}>
          <button onClick={() => toggleExpand('Language')} className="w-full p-4 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl shrink-0">🌐</div>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">{t('settings.language')}</p>
              <p className="text-gray-400 text-xs mt-0.5">{t('settings.changeLang')}</p>
            </div>
            <span className={`text-gray-300 text-xl transition-transform ${expanded === 'Language' ? 'rotate-90' : ''}`}>›</span>
          </button>
          {expanded === 'Language' && (
            <div className="px-4 pb-4 pt-1 flex flex-col gap-2 border-t border-gray-50 max-h-64 overflow-y-auto">
              {SUPPORTED_LANGUAGES.map((l) => (
                <button key={l.code} onClick={() => handleLangSelect(l.code)} className={`flex items-center justify-between p-3 rounded-xl border ${lang === l.code ? 'bg-blue-50 border-[var(--primary)] text-[var(--primary)]' : 'border-gray-100 text-[var(--dark)]'}`}>
                  <div>
                    <span className="font-bold text-sm block">{l.nativeName}</span>
                    <span className="text-xs text-gray-400">{l.name}</span>
                  </div>
                  {lang === l.code && <span className="font-bold text-[var(--primary)]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DEVICE PERMISSIONS */}
        <div className="bg-white rounded-2xl border border-gray-100 transition-all shadow-sm overflow-hidden p-4 flex flex-col gap-3 text-left">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('settings.permissions') || 'Permissions'}</p>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl shrink-0">🔔</div>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">{t('settings.deviceNotif') || 'Notifications'}</p>
              <p className="text-xs mt-0.5" style={{ color: deviceNotifStatus === 'granted' ? '#10B981' : deviceNotifStatus === 'denied' ? '#EF4444' : '#9CA3AF' }}>
                {deviceNotifStatus === 'granted' ? (t('settings.statusAllowed') || 'Allowed') : deviceNotifStatus === 'denied' ? (t('settings.statusDenied') || 'Denied') : (t('settings.statusNotRequested') || 'Not requested')}
              </p>
            </div>
            <button 
              onClick={handleManageDeviceNotif}
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${deviceNotifStatus === 'granted' ? 'bg-gray-100 text-gray-700' : 'bg-[var(--primary)] text-white shadow-sm'}`}
            >
              {deviceNotifStatus === 'granted' ? (t('settings.manage') || 'Manage') : (t('settings.enable') || 'Enable')}
            </button>
          </div>
        </div>

        {/* APP THEME SETTING */}
        <div className={`bg-white rounded-2xl border ${expanded === 'App Theme' ? 'border-[var(--primary)]' : 'border-gray-100'} transition-all shadow-sm overflow-hidden`}>
          <button onClick={() => toggleExpand('App Theme')} className="w-full p-4 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl shrink-0">🎨</div>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">{t('settings.appTheme')}</p>
              <p className="text-gray-400 text-xs mt-0.5">{theme.charAt(0).toUpperCase() + theme.slice(1)} Mode</p>
            </div>
            <span className={`text-gray-300 text-xl transition-transform ${expanded === 'App Theme' ? 'rotate-90' : ''}`}>›</span>
          </button>
          {expanded === 'App Theme' && (
            <div className="px-4 pb-4 pt-1 flex flex-col gap-2 border-t border-gray-50">
              {['light', 'dark', 'system'].map((tType) => (
                <button key={tType} onClick={() => handleThemeChange(tType)} className={`flex items-center justify-between p-3 rounded-xl border ${theme === tType ? 'bg-blue-50 border-[var(--primary)] text-[var(--primary)]' : 'border-gray-100 text-[var(--dark)]'}`}>
                  <span className="font-bold text-sm capitalize">{tType}</span>
                  {theme === tType && <span className="font-bold">✓</span>}
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
              <p className="font-bold text-[var(--dark)] text-sm">{t('settings.helpSupport')}</p>
              <p className="text-gray-400 text-xs mt-0.5">{t('settings.helpDesc')}</p>
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
                    <p className="text-sm font-bold text-[var(--dark)]">{t('settings.whatsapp')}</p>
                    <p className="text-xs text-gray-500">+91 8308816023</p>
                  </div>
                </a>
                <a href="mailto:support@TechArtha.com" className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-blue-300 transition-all">
                  <span className="text-xl">✉️</span>
                  <div>
                    <p className="text-sm font-bold text-[var(--dark)]">{t('settings.email')}</p>
                    <p className="text-xs text-gray-500">support@TechArtha.com</p>
                  </div>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* OTHER SETTINGS (Mocked) */}
        {[
          { icon: '🔒', label: 'Privacy & Security', desc: 'App Lock, Biometrics, and Data Privacy', key: 'privacy' },
          { icon: '📱', label: 'Linked Devices', desc: 'Manage devices logged into your account', key: 'devices' },
        ].map((item) => (
          <button key={item.label} onClick={() => alert(`${t('settings.' + item.key + 'Title') || item.label} configuration coming soon!`)} className="bg-white p-4 rounded-2xl flex items-center gap-4 text-left border border-gray-100 hover:border-[var(--primary)] transition-all shadow-sm">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl shrink-0">{item.icon}</div>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">{t('settings.' + item.key + 'Title') || item.label}</p>
              <p className="text-gray-400 text-xs mt-0.5">{t('settings.' + item.key + 'Desc') || item.desc}</p>
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
        {t('settings.logout') || 'Sign Out'}
      </button>

      <p className="text-xs text-gray-400 text-center mt-10">TechArtha v1.0.0 (Build 42)</p>
    </div>
  );
}
