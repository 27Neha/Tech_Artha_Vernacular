'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';



export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('Priya Sharma');
  const [mobile, setMobile] = useState('+91 98765 43210');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setName(localStorage.getItem('userName') || 'Priya Sharma');
    setMobile(localStorage.getItem('mobile') || '+91 98765 43210');
  }, []);

  const toggleExpand = (label: string) => { setExpanded(expanded === label ? null : label); };

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
          <span className="bg-amber-50 border border-amber-100 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">KYC Pending</span>
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
      <div className="flex flex-col gap-3 mb-6">
        {/* MY GOALS */}
        <div className={`bg-white rounded-2xl border ${expanded === 'My Goals' ? 'border-[var(--primary)]' : 'border-gray-100'} transition-all shadow-sm overflow-hidden`}>
          <button onClick={() => toggleExpand('My Goals')} className="w-full p-4 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-xl shrink-0">📋</div>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">My Goals</p>
              <p className="text-gray-400 text-xs mt-0.5">View and manage your financial goals</p>
            </div>
            <span className={`text-gray-300 text-xl transition-transform ${expanded === 'My Goals' ? 'rotate-90' : ''}`}>›</span>
          </button>
          {expanded === 'My Goals' && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-50">
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm font-bold mb-2">No active goals found.</p>
                <button className="text-xs font-bold text-white bg-[var(--primary)] px-4 py-2 rounded-lg">Create a Goal</button>
              </div>
            </div>
          )}
        </div>

        {/* BANK ACCOUNTS */}
        <div className={`bg-white rounded-2xl border ${expanded === 'Bank Accounts' ? 'border-[var(--primary)]' : 'border-gray-100'} transition-all shadow-sm overflow-hidden`}>
          <button onClick={() => toggleExpand('Bank Accounts')} className="w-full p-4 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-xl shrink-0">🏦</div>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">Bank Accounts</p>
              <p className="text-gray-400 text-xs mt-0.5">Primary bank for SIPs and withdrawals</p>
            </div>
            <span className={`text-gray-300 text-xl transition-transform ${expanded === 'Bank Accounts' ? 'rotate-90' : ''}`}>›</span>
          </button>
          {expanded === 'Bank Accounts' && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-50">
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm font-bold mb-2">No bank account added yet.</p>
                <button className="text-xs font-bold text-[var(--primary)] border border-dashed border-[var(--primary)] bg-[var(--primary-light)] px-4 py-2 rounded-lg">+ Add Bank Account</button>
              </div>
            </div>
          )}
        </div>

        {/* MANDATES & AUTOPAY */}
        <div className={`bg-white rounded-2xl border ${expanded === 'Mandates & Autopay' ? 'border-[var(--primary)]' : 'border-gray-100'} transition-all shadow-sm overflow-hidden`}>
          <button onClick={() => toggleExpand('Mandates & Autopay')} className="w-full p-4 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-xl shrink-0">📝</div>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">Mandates & Autopay</p>
              <p className="text-gray-400 text-xs mt-0.5">Active NACH/Biller SIP mandates</p>
            </div>
            <span className={`text-gray-300 text-xl transition-transform ${expanded === 'Mandates & Autopay' ? 'rotate-90' : ''}`}>›</span>
          </button>
          {expanded === 'Mandates & Autopay' && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-50">
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm font-bold mb-1">No active mandates found.</p>
                <p className="text-gray-400 text-[10px]">Set up a bank account first to create a mandate.</p>
              </div>
            </div>
          )}
        </div>

        {/* NOMINEE DETAILS */}
        <div className={`bg-white rounded-2xl border ${expanded === 'Nominee Details' ? 'border-[var(--primary)]' : 'border-gray-100'} transition-all shadow-sm overflow-hidden`}>
          <button onClick={() => toggleExpand('Nominee Details')} className="w-full p-4 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-xl shrink-0">👥</div>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">Nominee Details</p>
              <p className="text-gray-400 text-xs mt-0.5">SEBI regulatory requirement</p>
            </div>
            <span className={`text-gray-300 text-xl transition-transform ${expanded === 'Nominee Details' ? 'rotate-90' : ''}`}>›</span>
          </button>
          {expanded === 'Nominee Details' && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-50">
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm font-bold mb-2">No nominee added yet.</p>
                <button className="text-xs font-bold text-white bg-[var(--primary)] px-4 py-2 rounded-lg">+ Add Nominee</button>
              </div>
            </div>
          )}
        </div>

        {/* STATEMENTS & TAX */}
        <div className={`bg-white rounded-2xl border ${expanded === 'Statements & Tax' ? 'border-[var(--primary)]' : 'border-gray-100'} transition-all shadow-sm overflow-hidden`}>
          <button onClick={() => toggleExpand('Statements & Tax')} className="w-full p-4 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-xl shrink-0">📂</div>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">Statements & Tax</p>
              <p className="text-gray-400 text-xs mt-0.5">CAS, Capital Gains, Tax proofs</p>
            </div>
            <span className={`text-gray-300 text-xl transition-transform ${expanded === 'Statements & Tax' ? 'rotate-90' : ''}`}>›</span>
          </button>
          {expanded === 'Statements & Tax' && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-50">
               <div className="flex flex-col gap-2">
                 <button onClick={() => router.push('/dashboard/portfolio')} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-[var(--primary)] transition-all">
                    <div>
                      <p className="text-sm font-bold text-[var(--dark)] text-left">Consolidated Account Statement</p>
                      <p className="text-[10px] text-gray-500 text-left mt-0.5">Detailed holdings and folios (CAS)</p>
                    </div>
                    <span className="text-gray-300">›</span>
                 </button>
                 <button onClick={() => router.push('/dashboard/portfolio')} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-[var(--primary)] transition-all">
                    <div>
                      <p className="text-sm font-bold text-[var(--dark)] text-left">Capital Gains Statement</p>
                      <p className="text-[10px] text-gray-500 text-left mt-0.5">For Income Tax (ITR) filing</p>
                    </div>
                    <span className="text-gray-300">›</span>
                 </button>
                 <button onClick={() => router.push('/dashboard/portfolio')} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-[var(--primary)] transition-all">
                    <div>
                      <p className="text-sm font-bold text-[var(--dark)] text-left">ELSS Tax Proof (80C)</p>
                      <p className="text-[10px] text-gray-500 text-left mt-0.5">Investment proof for tax deductions</p>
                    </div>
                    <span className="text-gray-300">›</span>
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
      
      <p className="text-xs text-gray-300 text-center mt-6">TechArtha v1.0.0 · SEBI Registered MFD</p>
    </div>
  );
}
