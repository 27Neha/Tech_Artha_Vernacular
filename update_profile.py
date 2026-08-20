import os
import re

filepath = 'apps/web/app/dashboard/profile/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add `expanded` state
state_old = "const [mobile, setMobile] = useState('+91 98765 43210');"
state_new = "const [mobile, setMobile] = useState('+91 98765 43210');\n  const [expanded, setExpanded] = useState<string | null>(null);"
code = code.replace(state_old, state_new)

# 2. Add toggleExpand function
use_effect_old = "}, []);"
use_effect_new = "}, []);\n\n  const toggleExpand = (label: string) => { setExpanded(expanded === label ? null : label); };"
code = code.replace(use_effect_old, use_effect_new)

# 3. Replace MENU_ITEMS map with a fully expanded UI
start_str = "{/* Menu */}"
end_str = '<p className="text-xs text-gray-300 text-center mt-6">'

start_idx = code.find(start_str)
end_idx = code.find(end_str)

menu_block_new = '''{/* Menu */}
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
            <div className="px-4 pb-4 pt-2 border-t border-gray-50 flex flex-col gap-3">
              <div className="border border-gray-100 rounded-xl p-3 bg-gray-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-green-100 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">On Track</div>
                <p className="text-xs font-bold text-[var(--dark)]">Retirement Corpus</p>
                <div className="flex justify-between items-end mt-2">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Target (2045)</p>
                    <p className="text-sm font-extrabold text-[var(--primary)]">₹5,00,00,000</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Current</p>
                    <p className="text-sm font-extrabold text-[var(--dark)]">₹12,45,000</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-3"><div className="bg-green-500 h-1 rounded-full" style={{ width: '2.5%' }}></div></div>
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
              <div className="border border-indigo-100 bg-indigo-50/30 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-extrabold text-[var(--dark)] text-sm">HDFC Bank</p>
                    <p className="text-xs text-gray-500 font-bold">Savings Account</p>
                  </div>
                  <span className="text-[9px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Primary
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div><span className="text-gray-400 block text-[10px] font-bold uppercase">Account No</span><span className="font-bold text-[var(--dark)]">•••• 1234</span></div>
                  <div><span className="text-gray-400 block text-[10px] font-bold uppercase">IFSC Code</span><span className="font-bold text-[var(--dark)]">HDFC0000001</span></div>
                </div>
                <div className="mt-4 pt-3 border-t border-indigo-100/50 flex gap-2">
                  <span className="text-[10px] text-gray-500">✅ Penny Drop Verified</span>
                </div>
              </div>
              <button className="w-full mt-3 py-3 border border-dashed border-gray-300 rounded-xl text-xs font-bold text-[var(--primary)] hover:bg-gray-50 transition-all">+ Add New Bank Account</button>
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
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="font-extrabold text-[var(--dark)] text-sm">HDFC Bank</p>
                  <span className="text-[9px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Active</span>
                </div>
                <div className="grid grid-cols-2 gap-y-3 text-xs mb-3">
                  <div><span className="text-gray-400 block text-[10px] font-bold uppercase">UMRN</span><span className="font-bold text-[var(--dark)]">HDFC129384729183</span></div>
                  <div><span className="text-gray-400 block text-[10px] font-bold uppercase">Max Limit</span><span className="font-bold text-[var(--dark)]">₹1,00,000</span></div>
                  <div><span className="text-gray-400 block text-[10px] font-bold uppercase">Type</span><span className="font-bold text-[var(--dark)]">E-Mandate / NACH</span></div>
                  <div><span className="text-gray-400 block text-[10px] font-bold uppercase">Valid Till</span><span className="font-bold text-[var(--dark)]">31 Dec 2099</span></div>
                </div>
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
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-extrabold text-[var(--dark)] text-sm">Rohan Sharma</p>
                    <p className="text-xs text-gray-500 font-bold">Brother (100% Allocation)</p>
                  </div>
                  <span className="text-[9px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Opted-in</span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div><span className="text-gray-400 block text-[10px] font-bold uppercase">Date of Birth</span><span className="font-bold text-[var(--dark)]">12 May 1995</span></div>
                  <div><span className="text-gray-400 block text-[10px] font-bold uppercase">Status</span><span className="font-bold text-green-600">Verified</span></div>
                </div>
              </div>
              <button className="w-full mt-3 py-3 border border-gray-200 rounded-xl text-xs font-bold text-[var(--dark)] hover:bg-gray-50 transition-all">Update Nominee</button>
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
      
      '''

code = code[:start_idx] + menu_block_new + code[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated successfully!")
