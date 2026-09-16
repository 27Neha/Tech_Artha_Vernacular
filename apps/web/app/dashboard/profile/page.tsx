'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { useState, useEffect } from 'react';







export default function ProfilePage() {

  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState('');

  const [mobile, setMobile] = useState('');
  const [kycStatus, setKycStatus] = useState("Pending");

  const [fpProfileId, setFpProfileId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(searchParams.get('expand') || null);
  const [nominees, setNominees] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [isNomineeModalOpen, setIsNomineeModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankStep, setBankStep] = useState(1);
  const [bankData, setBankData] = useState({ account_number: '', confirm_account_number: '', ifsc_code: '', type: 'savings', primary_account_holder_name: name, showAccount: false });
  const [bankLoading, setBankLoading] = useState(false);
  const [bankResult, setBankResult] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [mandates, setMandates] = useState<any[]>([]);
  const [isMandateModalOpen, setIsMandateModalOpen] = useState(false);
  const [mandateData, setMandateData] = useState({ amount_limit: 100000, type: 'E_MANDATE', bank_account_id: '' });
  const [mandateLoading, setMandateLoading] = useState(false);
  const [mandateResult, setMandateResult] = useState<any>(null);
  const [nomineeLoading, setNomineeLoading] = useState(false);
  const [nomineeData, setNomineeData] = useState({ name: '', relationship: 'Spouse', dateOfBirth: '', percentage: 100, guardianName: '', guardianPan: '' });
  
  const fetchBankAndMandates = async (pId: string, token: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
      const banksRes = await fetch(`${API_URL}/cybrilla/sandbox/bank-accounts/${pId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (banksRes.ok) {
        const banksData = await banksRes.json();
        setBankAccounts(banksData.data?.bank_accounts || banksData.data || []);
      }
      const mandatesRes = await fetch(`${API_URL}/cybrilla/sandbox/mandates/${pId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (mandatesRes.ok) {
        const mData = await mandatesRes.json();
        setMandates(mData.data?.mandates || mData.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetBankModal = () => {
    setIsBankModalOpen(false);
    setBankStep(1);
    setBankData({ account_number: '', confirm_account_number: '', ifsc_code: '', type: 'savings', primary_account_holder_name: name, showAccount: false });
    setBankResult(null);
  };

  const handleNextStep = () => {
    setBankResult(null);
    if (bankData.account_number.length < 9 || bankData.account_number.length > 18) {
      setBankResult({ error: "Account Number must be between 9 and 18 digits." });
      return;
    }
    if (bankData.account_number !== bankData.confirm_account_number) {
      setBankResult({ error: "Account numbers do not match." });
      return;
    }
    if (bankData.ifsc_code.length !== 11) {
      setBankResult({ error: "Invalid IFSC Code. It must be exactly 11 characters." });
      return;
    }
    setBankStep(2);
  };

  const handleLinkBank = async () => {
    setBankLoading(true);
    setBankResult(null);
    try {
      const token = localStorage.getItem('access_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
      const payload = { ...bankData, profile: fpProfileId };
      const res = await fetch(`${API_URL}/cybrilla/sandbox/bank-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setBankResult({ success: true, message: 'Bank account linked successfully!' });
        if (fpProfileId) fetchBankAndMandates(fpProfileId, token || '');
      } else {
        setBankResult({ error: data.message || 'Failed to link bank account.' });
      }
    } catch (e: any) {
      setBankResult({ error: e.message });
    }
    setBankLoading(false);
  };

  const handleCreateMandate = async () => {
    setMandateLoading(true);
    setMandateResult(null);
    try {
      const token = localStorage.getItem('access_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
      const payload = {
        investor_profile_id: fpProfileId,
        bank_account_id: mandateData.bank_account_id,
        mandate_type: mandateData.type,
        amount_limit: Number(mandateData.amount_limit)
      };
      const res = await fetch(`${API_URL}/cybrilla/sandbox/mandate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setMandateResult({ success: true, message: 'Mandate created successfully!' });
        if (fpProfileId) fetchBankAndMandates(fpProfileId, token || '');
      } else {
        setMandateResult({ error: data.message || 'Failed to create mandate.' });
      }
    } catch (e: any) {
      setMandateResult({ error: e.message });
    }
    setMandateLoading(false);
  };

  const handleAddNominee = async () => {
    if (!nomineeData.name || !nomineeData.dateOfBirth) {
      alert('Please fill in required fields');
      return;
    }
    setNomineeLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
      const res = await fetch(`${API_URL}/auth/nominee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(nomineeData)
      });
      if (res.ok) {
        setIsNomineeModalOpen(false);
        // refresh profile
        const pRes = await fetch(`${API_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (pRes.ok) {
          const d = await pRes.json();
          setNominees(d.nominees || []);
        }
      } else {
        alert('Failed to save nominee');
      }
    } catch(e) {
      alert('Error saving nominee');
    }
    setNomineeLoading(false);
  };
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
        const res = await fetch(`${API_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setName(data.profile?.fullName || data.fpInvestorProfile?.name || 'User');
          setMobile(data.mobile || '');
          const pId = data.fpInvestorProfile?.fpProfileId || null;
          setFpProfileId(pId);
          if (pId) fetchBankAndMandates(pId, token);
          if (data.nominees) setNominees(data.nominees);
        }
        
        const kycRes = await fetch(`${API_URL}/kyc/status`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (kycRes.ok) {
          const kycData = await kycRes.json();
          setKycStatus(kycData.status || 'Pending');
        }
        
        const goalsRes = await fetch(`${API_URL}/goals`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (goalsRes.ok) {
          const goalsData = await goalsRes.json();
          setGoals(goalsData.data || goalsData || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchProfile();
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

          {kycStatus === 'VERIFIED' ? (
            <span className="bg-green-50 border border-green-100 text-green-600 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">KYC Verified</span>
          ) : (
            <span className="bg-amber-50 border border-amber-100 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">KYC {kycStatus}</span>
          )}

        </div>

        <button 

          onClick={() => router.push('/dashboard/profile/edit')}

          className="text-xs font-bold text-[var(--primary)] bg-[var(--primary-light)] px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-[var(--primary)] hover:text-white transition-all shrink-0 shadow-sm"

        >

          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>

          Edit

        </button>

      </div>



      



      {/* Menu */}

      <div className="flex flex-col gap-3 mb-6">

        {/* MY GOALS */}
        <div className={`bg-white rounded-2xl border ${expanded === 'My Goals' ? 'border-[var(--primary)]' : 'border-gray-100'} transition-all shadow-sm overflow-hidden`}>
          <button onClick={() => toggleExpand('My Goals')} className="w-full p-4 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-xl shrink-0">🎯</div>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">My Goals</p>
              <p className="text-gray-400 text-xs mt-0.5">View and manage your financial goals</p>
            </div>
            <span className={`text-gray-300 text-xl transition-transform ${expanded === 'My Goals' ? 'rotate-90' : ''}`}>›</span>
          </button>
          {expanded === 'My Goals' && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-50">
              {goals.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm font-bold mb-2">No active goals found.</p>
                  <button onClick={() => router.push('/goals')} className="text-xs font-bold text-white bg-[var(--primary)] px-4 py-2 rounded-lg">Create a Goal</button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {goals.map(g => (
                    <div key={g.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 shadow-sm relative">
                      <p className="text-sm font-extrabold text-[var(--dark)]">{g.name}</p>
                      <p className="text-xs text-gray-500 mt-1">Target: ₹{g.targetAmount} in {g.timePeriod} Years</p>
                      <p className="text-xs font-bold text-[var(--primary)] mt-1">Monthly SIP: ₹{g.monthlySip}</p>
                    </div>
                  ))}
                  <button onClick={() => router.push('/goals')} className="w-full py-2.5 border-2 border-[var(--primary)] text-[var(--primary)] font-bold rounded-xl text-xs hover:bg-[var(--primary-light)] transition-colors">
                    + Add Another Goal
                  </button>
                </div>
              )}
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
              {bankAccounts.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm font-bold mb-2">No bank account added yet.</p>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsBankModalOpen(true); }} className="text-xs font-bold text-[var(--primary)] border border-dashed border-[var(--primary)] bg-[var(--primary-light)] px-4 py-2 rounded-lg">+ Add Bank Account</button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {bankAccounts.map(b => (
                    <div key={b.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 shadow-sm relative">
                      <p className="text-sm font-extrabold text-[var(--dark)]">{b.bank_name}</p>
                      <p className="text-xs text-gray-500 mt-1">{b.account_number} • {b.type}</p>
                      <span className="absolute top-4 right-4 bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border border-green-100">Verified</span>
                    </div>
                  ))}
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsBankModalOpen(true); }} className="w-full py-2.5 border-2 border-[var(--primary)] text-[var(--primary)] font-bold rounded-xl text-xs hover:bg-[var(--primary-light)] transition-colors">
                    + Add Another Bank Account
                  </button>
                </div>
              )}
            </div>
          )}

        </div>



        {/* UPI & AUTOPAY */}
        <div className={`bg-white rounded-2xl border ${expanded === 'UPI & Autopay' ? 'border-[var(--primary)]' : 'border-gray-100'} transition-all shadow-sm overflow-hidden`}>
          <button onClick={() => toggleExpand('UPI & Autopay')} className="w-full p-4 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-xl shrink-0">💸</div>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">UPI & Autopay</p>
              <p className="text-gray-400 text-xs mt-0.5">Active NACH/Biller SIP mandates</p>
            </div>
            <span className={`text-gray-300 text-xl transition-transform ${expanded === 'UPI & Autopay' ? 'rotate-90' : ''}`}>›</span>
          </button>
          {expanded === 'UPI & Autopay' && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-50">
              <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-center">
                <p className="text-sm font-bold text-orange-800">Bank Account Required</p>
                <p className="text-xs text-orange-600 mt-1">You must link a verified bank account before setting up UPI or Autopay.</p>
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
              {nominees.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm font-bold mb-2">No nominee added yet.</p>
                  <button onClick={() => setIsNomineeModalOpen(true)} className="text-xs font-bold text-white bg-[var(--primary)] px-4 py-2 rounded-lg">+ Add Nominee</button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 mt-2">
                  {nominees.map(n => (
                    <div key={n.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 shadow-sm relative">
                      <p className="text-sm font-extrabold text-[var(--dark)]">{n.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{n.relationship} • {n.percentage}% Allocation</p>
                      {n.guardianName && <p className="text-[10px] text-gray-400 mt-1">Guardian: {n.guardianName}</p>}
                    </div>
                  ))}
                  <button onClick={() => setIsNomineeModalOpen(true)} className="w-full py-2.5 border-2 border-[var(--primary)] text-[var(--primary)] font-bold rounded-xl text-xs hover:bg-[var(--primary-light)] transition-colors">
                    + Add Another Nominee
                  </button>
                </div>
              )}
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

                 <button onClick={() => alert('Statement generation will be connected to the Cybrilla/ONDC provider soon.')} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-[var(--primary)] transition-all">

                    <div>

                      <p className="text-sm font-bold text-[var(--dark)] text-left">Consolidated Account Statement</p>

                      <p className="text-[10px] text-gray-500 text-left mt-0.5">Detailed holdings and folios (CAS)</p>

                    </div>

                    <span className="text-gray-300">›</span>

                 </button>

                 <button onClick={() => alert('Statement generation will be connected to the Cybrilla/ONDC provider soon.')} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-[var(--primary)] transition-all">

                    <div>

                      <p className="text-sm font-bold text-[var(--dark)] text-left">Capital Gains Statement</p>

                      <p className="text-[10px] text-gray-500 text-left mt-0.5">For Income Tax (ITR) filing</p>

                    </div>

                    <span className="text-gray-300">›</span>

                 </button>

                 <button onClick={() => alert('Statement generation will be connected to the Cybrilla/ONDC provider soon.')} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-[var(--primary)] transition-all">

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

    
      {/* NOMINEE MODAL */}
      {isNomineeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="bg-[var(--primary)] p-5 text-white flex justify-between items-center">
              <h2 className="font-extrabold text-lg">Add Nominee</h2>
              <button onClick={() => setIsNomineeModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Nominee Name *</label>
                <input type="text" value={nomineeData.name} onChange={e => setNomineeData({...nomineeData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[var(--dark)] font-bold focus:border-[var(--primary)] outline-none" placeholder="Full Name" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Relationship *</label>
                <select value={nomineeData.relationship} onChange={e => setNomineeData({...nomineeData, relationship: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[var(--dark)] font-bold focus:border-[var(--primary)] outline-none">
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Date of Birth *</label>
                <input type="date" value={nomineeData.dateOfBirth} onChange={e => setNomineeData({...nomineeData, dateOfBirth: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[var(--dark)] font-bold focus:border-[var(--primary)] outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Allocation % *</label>
                <input type="number" min="1" max="100" value={nomineeData.percentage} onChange={e => setNomineeData({...nomineeData, percentage: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[var(--dark)] font-bold focus:border-[var(--primary)] outline-none" />
              </div>
              {nomineeData.dateOfBirth && (new Date().getFullYear() - new Date(nomineeData.dateOfBirth).getFullYear() < 18) && (
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-orange-800">Minor Nominee Details</p>
                  <input type="text" placeholder="Guardian Name" value={nomineeData.guardianName} onChange={e => setNomineeData({...nomineeData, guardianName: e.target.value})} className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  <input type="text" placeholder="Guardian PAN" value={nomineeData.guardianPan} onChange={e => setNomineeData({...nomineeData, guardianPan: e.target.value})} className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
              )}
              <button onClick={handleAddNominee} disabled={nomineeLoading} className="w-full mt-2 bg-[var(--primary)] text-white font-bold py-4 rounded-2xl disabled:opacity-50 transition-all">
                {nomineeLoading ? 'Saving...' : 'Save Nominee'}
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* BANK MODAL */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            
            <div className="bg-[var(--primary)] p-5 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <h2 className="font-extrabold text-lg relative z-10">Link Bank Account</h2>
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); resetBankModal(); }} className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition-colors relative z-10">✕</button>
            </div>

            <div className="p-6">
              {!bankResult?.success && (
                <div className="flex gap-2 mb-6">
                  <div className={`h-1.5 flex-1 rounded-full ${bankStep >= 1 ? 'bg-[var(--primary)]' : 'bg-gray-100'}`}></div>
                  <div className={`h-1.5 flex-1 rounded-full ${bankStep >= 2 ? 'bg-[var(--primary)]' : 'bg-gray-100'}`}></div>
                </div>
              )}

              {bankStep === 1 && !bankResult?.success && (
                <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Account Number</label>
                    <div className="relative">
                      <input 
                        type={bankData.showAccount ? 'text' : 'password'}
                        value={bankData.account_number}
                        onChange={e => setBankData(prev => ({...prev, account_number: e.target.value.replace(/\D/g, '')}))}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 pr-16 text-[var(--dark)] font-bold focus:border-[var(--primary)] outline-none"
                        placeholder="Enter account number"
                      />
                      <button 
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBankData(prev => ({...prev, showAccount: !prev.showAccount})); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--primary)] uppercase"
                      >
                        {bankData.showAccount ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Confirm Account Number</label>
                    <input 
                      type="text" 
                      value={bankData.confirm_account_number}
                      onChange={e => setBankData(prev => ({...prev, confirm_account_number: e.target.value.replace(/\D/g, '')}))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[var(--dark)] font-bold focus:border-[var(--primary)] outline-none"
                      placeholder="Re-enter account number"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">IFSC Code</label>
                    <input 
                      type="text" 
                      value={bankData.ifsc_code}
                      onChange={e => setBankData(prev => ({...prev, ifsc_code: e.target.value.toUpperCase()}))}
                      maxLength={11}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[var(--dark)] font-bold focus:border-[var(--primary)] outline-none"
                      placeholder="e.g. HDFC0001234"
                    />
                  </div>
                  
                  {bankResult?.error && <p className="text-red-500 text-xs font-bold text-center">{bankResult.error}</p>}

                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNextStep(); }}
                    disabled={!bankData.account_number || !bankData.confirm_account_number || !bankData.ifsc_code}
                    className="w-full mt-2 bg-[var(--primary)] text-white font-bold py-4 rounded-2xl disabled:opacity-50 transition-all"
                  >
                    Continue
                  </button>
                </div>
              )}

              {bankStep === 2 && !bankResult?.success && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Account Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBankData(prev => ({...prev, type: 'savings'})); }}
                        className={`py-3 rounded-xl font-bold border-2 transition-all ${bankData.type === 'savings' ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                      >Savings</button>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBankData(prev => ({...prev, type: 'current'})); }}
                        className={`py-3 rounded-xl font-bold border-2 transition-all ${bankData.type === 'current' ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                      >Current</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Account Holder Name</label>
                    <input 
                      type="text" 
                      value={bankData.primary_account_holder_name}
                      onChange={e => setBankData(prev => ({...prev, primary_account_holder_name: e.target.value}))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[var(--dark)] font-bold focus:border-[var(--primary)] outline-none"
                      placeholder="As per bank records"
                    />
                    <p className="text-[10px] text-gray-400 mt-1.5 ml-1">Must exactly match your KYC name</p>
                  </div>

                  {bankResult?.error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 rounded-lg">{bankResult.error}</p>}

                  <div className="flex gap-3 mt-2">
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBankStep(1); }} className="px-6 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl">Back</button>
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLinkBank(); }} 
                      disabled={bankLoading || !bankData.primary_account_holder_name}
                      className="flex-1 bg-[var(--primary)] text-white font-bold py-4 rounded-2xl disabled:opacity-50 transition-all"
                    >
                      {bankLoading ? 'Verifying...' : 'Verify & Link Bank'}
                    </button>
                  </div>
                </div>
              )}

              {bankResult?.success && (
                <div className="text-center py-4 animate-in zoom-in-95 duration-500">
                  <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border-4 border-white shadow-lg">✓</div>
                  <h3 className="font-extrabold text-[var(--dark)] text-lg mb-1">Bank Linked Successfully</h3>
                  <p className="text-sm text-gray-500 mb-6">{bankResult.message}</p>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); resetBankModal(); }} className="w-full bg-[var(--primary)] text-white font-bold py-4 rounded-2xl transition-all">Done</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}