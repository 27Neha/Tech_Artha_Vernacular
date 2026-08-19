'use client';
import { useRouter } from 'next/navigation';

const MENU_ITEMS = [
  { icon: '📋', label: 'My Goals', desc: 'View and manage your financial goals' },
  { icon: '📂', label: 'Documents', desc: 'KYC documents and statements' },
  { icon: '🔔', label: 'Notifications', desc: 'SIP alerts and market updates' },
  { icon: '🌐', label: 'Language', desc: 'Change app language' },
  { icon: '🔒', label: 'Privacy & Security', desc: 'Manage your security settings' },
  { icon: '❓', label: 'Help & Support', desc: 'FAQs and contact us' },
];

export default function ProfilePage() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  return (
    <div className="p-5">
      {/* Avatar */}
      <div className="flex items-center gap-4 mt-2 mb-6">
        <div className="w-16 h-16 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-2xl font-extrabold">
          P
        </div>
        <div>
          <p className="text-xl font-extrabold text-[var(--dark)]">Priya Sharma</p>
          <p className="text-gray-400 text-sm">+91 98765 43210</p>
          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">KYC Verified ✓</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card text-center py-4">
          <p className="text-xl font-extrabold text-[var(--primary)]">1</p>
          <p className="text-xs text-gray-400 mt-1">Active Goal</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-xl font-extrabold text-[var(--orange)]">₹9.2K</p>
          <p className="text-xs text-gray-400 mt-1">Monthly SIP</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-xl font-extrabold text-green-600">+15%</p>
          <p className="text-xs text-gray-400 mt-1">Returns</p>
        </div>
      </div>

      {/* Menu */}
      <div className="flex flex-col gap-2">
        {MENU_ITEMS.map((item) => (
          <button key={item.label} className="card flex items-center gap-4 text-left hover:border-[var(--primary)] transition-all">
            <span className="text-2xl">{item.icon}</span>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">{item.label}</p>
              <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
            </div>
            <span className="text-gray-300 text-xl">›</span>
          </button>
        ))}
      </div>

      <button
        onClick={handleLogout}
        className="w-full mt-6 py-4 rounded-2xl border-2 border-red-200 text-red-500 font-bold hover:bg-red-50 transition-all"
      >
        Sign Out
      </button>

      <p className="text-xs text-gray-300 text-center mt-4">TechArtha v1.0.0 · SEBI Registered MFD</p>
    </div>
  );
}
