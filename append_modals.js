const fs = require('fs');
let content = fs.readFileSync('apps/web/app/dashboard/profile/page.tsx', 'utf8');

const modalUI = `
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
`;

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

if (!content.includes('NOMINEE MODAL')) {
  // Use robust regex to append to the end before final div closing
  content = content.replace(/<\/\s*div>\s*<\/\s*div>\s*\);\s*}/m,
    modalUI + '\n' + bankModalStr + '\n    </div>\n  );\n}'
  );
} else {
  // Overwrite if it exists
  content = content.replace(/\{(\/\*\s*)?NOMINEE MODAL[\s\S]*$/, modalUI + '\n' + bankModalStr + '\n    </div>\n  );\n}');
}

fs.writeFileSync('apps/web/app/dashboard/profile/page.tsx', content, 'utf8');
