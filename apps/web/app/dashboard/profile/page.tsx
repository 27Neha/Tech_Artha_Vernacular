'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const MENU_ITEMS = [
  { icon: '📋', label: 'My Goals', desc: 'View and manage your financial goals' },
  { icon: '🏦', label: 'Bank Accounts', desc: 'Manage your linked accounts' },
  { icon: '📝', label: 'Mandates & Autopay', desc: 'View active SIP mandates' },
  { icon: '👥', label: 'Nominee Details', desc: 'Add or update nominee information' },
  { icon: '📂', label: 'Statements & Tax', desc: 'Download CAS, Capital Gains, and Tax proofs' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('Priya Sharma');
  const [mobile, setMobile] = useState('+91 98765 43210');

  useEffect(() => {
    setName(localStorage.getItem('userName') || 'Priya Sharma');
    setMobile(localStorage.getItem('mobile') || '+91 98765 43210');
  }, []);

  return (
    <div className="p-5">
      {/* Avatar */}
      <div className="flex items-center gap-4 mt-2 mb-6">
        <div className="w-16 h-16 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-2xl font-extrabold shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-xl font-extrabold text-[var(--dark)]">{name}</p>
          <p className="text-gray-400 text-sm mb-1">{mobile}</p>
          <span className="bg-green-50 border border-green-100 text-green-600 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">KYC Verified</span>
        </div>
        <button 
          onClick={() => router.push('/dashboard/profile/edit')}
          className="text-xs font-bold text-[var(--primary)] bg-[var(--primary-light)] px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-[var(--primary)] hover:text-white transition-all shrink-0 shadow-sm"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          Edit
        </button>
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

      <p className="text-xs text-gray-300 text-center mt-6">TechArtha v1.0.0 · SEBI Registered MFD</p>
    </div>
  );
}
