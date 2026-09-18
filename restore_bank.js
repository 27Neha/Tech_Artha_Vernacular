const fs = require('fs');
let content = fs.readFileSync('apps/web/app/dashboard/profile/page.tsx', 'utf8');

if (!content.includes('isBankModalOpen')) {
  // Insert states
  content = content.replace(
    /const \[isNomineeModalOpen, setIsNomineeModalOpen\] = useState\(false\);/,
    `const [isNomineeModalOpen, setIsNomineeModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankStep, setBankStep] = useState(1);
  const [bankData, setBankData] = useState({ account_number: '', confirm_account_number: '', ifsc_code: '', type: 'savings', primary_account_holder_name: name });
  const [bankLoading, setBankLoading] = useState(false);
  const [bankResult, setBankResult] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [mandates, setMandates] = useState<any[]>([]);
  const [isMandateModalOpen, setIsMandateModalOpen] = useState(false);
  const [mandateData, setMandateData] = useState({ amount_limit: 100000, type: 'E_MANDATE', bank_account_id: '' });
  const [mandateLoading, setMandateLoading] = useState(false);
  const [mandateResult, setMandateResult] = useState<any>(null);`
  );

  // Update fetchProfile to fetch bank accounts and mandates
  content = content.replace(
    /setFpProfileId\(pId\);/,
    `setFpProfileId(pId);
            if (pId) {
              fetchBankAndMandates(pId, token);
            }`
  );

  // Insert fetchBankAndMandates and Bank handlers
  content = content.replace(
    /const handleAddNominee = async \(\) => \{/,
    `const fetchBankAndMandates = async (pId: string, token: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
      const banksRes = await fetch(\`\${API_URL}/cybrilla/sandbox/bank-accounts/\${pId}\`, { headers: { 'Authorization': \`Bearer \${token}\` } });
      if (banksRes.ok) {
        const banksData = await banksRes.json();
        setBankAccounts(banksData.data?.bank_accounts || banksData.data || []);
      }
      const mandatesRes = await fetch(\`\${API_URL}/cybrilla/sandbox/mandates/\${pId}\`, { headers: { 'Authorization': \`Bearer \${token}\` } });
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
    setBankData({ account_number: '', confirm_account_number: '', ifsc_code: '', type: 'savings', primary_account_holder_name: name });
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
      const res = await fetch(\`\${API_URL}/cybrilla/sandbox/bank-account\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
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
      const res = await fetch(\`\${API_URL}/cybrilla/sandbox/mandate\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
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

  const handleAddNominee = async () => {`
  );

  // Replace Bank Accounts UI
  content = content.replace(
    /\{expanded === 'Bank Accounts' && \([\s\S]*?\}\)/,
    `{expanded === 'Bank Accounts' && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-50">
              {bankAccounts.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm font-bold mb-2">No bank account added yet.</p>
                  <button onClick={() => setIsBankModalOpen(true)} className="text-xs font-bold text-[var(--primary)] border border-dashed border-[var(--primary)] bg-[var(--primary-light)] px-4 py-2 rounded-lg">+ Add Bank Account</button>
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
                  <button onClick={() => setIsBankModalOpen(true)} className="w-full py-2.5 border-2 border-[var(--primary)] text-[var(--primary)] font-bold rounded-xl text-xs hover:bg-[var(--primary-light)] transition-colors">
                    + Add Another Bank Account
                  </button>
                </div>
              )}
            </div>
          )}`
  );

  // Add Bank Modal to the end of the file
  const bankModalStr = `
      {/* BANK MODAL */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            
            <div className="bg-[var(--primary)] p-5 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <h2 className="font-extrabold text-lg relative z-10">Link Bank Account</h2>
              <button onClick={resetBankModal} className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition-colors relative z-10">✕</button>
            </div>

            <div className="p-6">
              {!bankResult?.success && (
                <div className="flex gap-2 mb-6">
                  <div className={\`h-1.5 flex-1 rounded-full \${bankStep >= 1 ? 'bg-[var(--primary)]' : 'bg-gray-100'}\`}></div>
                  <div className={\`h-1.5 flex-1 rounded-full \${bankStep >= 2 ? 'bg-[var(--primary)]' : 'bg-gray-100'}\`}></div>
                </div>
              )}

              {bankStep === 1 && !bankResult?.success && (
                <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Account Number</label>
                    <input 
                      type="password" 
                      value={bankData.account_number}
                      onChange={e => setBankData(prev => ({...prev, account_number: e.target.value.replace(/\\D/g, '')}))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[var(--dark)] font-bold focus:border-[var(--primary)] outline-none"
                      placeholder="Enter account number"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Confirm Account Number</label>
                    <input 
                      type="text" 
                      value={bankData.confirm_account_number}
                      onChange={e => setBankData(prev => ({...prev, confirm_account_number: e.target.value.replace(/\\D/g, '')}))}
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
                    onClick={handleNextStep}
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
                        onClick={() => setBankData(prev => ({...prev, type: 'savings'}))}
                        className={\`py-3 rounded-xl font-bold border-2 transition-all \${bankData.type === 'savings' ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]' : 'border-gray-100 text-gray-400 hover:border-gray-200'}\`}
                      >Savings</button>
                      <button 
                        onClick={() => setBankData(prev => ({...prev, type: 'current'}))}
                        className={\`py-3 rounded-xl font-bold border-2 transition-all \${bankData.type === 'current' ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]' : 'border-gray-100 text-gray-400 hover:border-gray-200'}\`}
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
                    <button onClick={() => setBankStep(1)} className="px-6 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl">Back</button>
                    <button 
                      onClick={handleLinkBank} 
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
                  <button onClick={resetBankModal} className="w-full bg-[var(--primary)] text-white font-bold py-4 rounded-2xl transition-all">Done</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
`;
  content = content.replace('    </div>\n  );\n}', bankModalStr + '\n    </div>\n  );\n}');
}

fs.writeFileSync('apps/web/app/dashboard/profile/page.tsx', content, 'utf8');
