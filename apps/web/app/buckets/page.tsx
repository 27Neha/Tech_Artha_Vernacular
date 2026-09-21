'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Suspense, useState, useEffect } from 'react';

const BUCKETS = [
  { id: 'stable', name: 'Stable Income Bucket', desc: 'Low risk, steady returns. Ideal for short-term goals.', risk: 'Conservative', color: 'bg-green-50 border-green-200 text-green-700' },
  { id: 'balanced', name: 'Balanced Growth Bucket', desc: 'Mix of equity and debt. Balances risk and return.', risk: 'Moderate', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'high', name: 'High Growth Bucket', desc: 'High equity exposure. Best for long-term wealth creation.', risk: 'Aggressive', color: 'bg-orange-50 border-orange-200 text-orange-700' }
];


const autoBalance = (funds: any[]) => {
  if (funds.length === 0) return [];
  const equalShare = Math.floor(100 / funds.length);
  let remainder = 100 % funds.length;
  return funds.map(f => {
    let p = equalShare;
    if (remainder > 0) {
      p += 1;
      remainder -= 1;
    }
    return { ...f, percentage: p };
  });
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const emptyInvestForm = { amount: '', gender: 'male', email: '', bankAccountHolderName: '', bankAccountNumber: '', ifscCode: '', addressLine1: '', postalCode: '' };

function BucketsContent() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const goal = searchParams.get('goal') ?? 'wealth';

  const amount = searchParams.get('amount') ?? '1500000';
  const period = searchParams.get('period') ?? '8';
  
  const [buckets, setBuckets] = useState<any[]>([]);
  const [investorProfile, setInvestorProfile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [investingBucketId, setInvestingBucketId] = useState<string | null>(null);
  const [investForm, setInvestForm] = useState(emptyInvestForm);
  const [investLoading, setInvestLoading] = useState(false);
  const [investError, setInvestError] = useState('');
  const [investSuccess, setInvestSuccess] = useState<any>(null);

  const openInvestForm = (bucketId: string) => {
    setInvestingBucketId(bucketId);
    setInvestForm(emptyInvestForm);
    setInvestError('');
    setInvestSuccess(null);
  };

  const submitInvest = async () => {
    setInvestError('');
    setInvestLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/buckets/${investingBucketId}/invest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: Number(investForm.amount),
          gender: investForm.gender,
          email: investForm.email,
          bankAccountHolderName: investForm.bankAccountHolderName,
          bankAccountNumber: investForm.bankAccountNumber,
          ifscCode: investForm.ifscCode,
          addressLine1: investForm.addressLine1,
          postalCode: investForm.postalCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message.map((m: any) => m.message || m).join(', ') : data.message || 'Could not place your order.');
      setInvestSuccess(data);
    } catch (e: any) {
      setInvestError(e.message || 'Something went wrong.');
    } finally {
      setInvestLoading(false);
    }
  };

  useEffect(() => {
    const fetchBuckets = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/buckets`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.investorProfile === 'ASSESSMENT_REQUIRED') {
          router.push('/risk');
          return;
        }

        setInvestorProfile(data.investorProfile);
        setBuckets(data.buckets || []);
      } catch {
        console.error("Failed to fetch buckets");
      } finally {
        setLoading(false);
      }
    };
    fetchBuckets();
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen p-6 bg-gray-50">
      <div className="flex items-center justify-between py-2 mb-4">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-50 rounded-full transition-colors shadow-sm">
          <span className="text-xl">←</span>
        </button>
      </div>

      <h1 className="text-3xl font-extrabold text-[var(--dark)] mb-2">{t('buckets.recommended')}</h1>
      <p className="text-gray-500 mb-6">{t('buckets.basedOnAnswers')}</p>

      {investorProfile && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6 flex justify-between items-center shadow-sm">
          <div>
            <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">{t('buckets.yourRisk')}</p>
            <p className="text-lg font-extrabold text-indigo-700 capitalize">{investorProfile.toLowerCase()}</p>
          </div>
          <button 
            onClick={() => router.push('/risk')}
            className="text-xs font-bold text-indigo-600 bg-white border border-indigo-200 px-3 py-2 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm"
          >
            Retake Assessment
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center mt-12"><div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" /></div>
      ) : (
        <div className="flex flex-col gap-5 pb-10">
          {Array.isArray(buckets) && buckets.map(b => (
            <div
              key={b.id}
              className={`p-5 rounded-3xl border-2 transition-all text-left relative bg-white ${
                b.recommended ? 'border-[var(--primary)] shadow-lg shadow-[var(--primary-light)]/50' : 'border-gray-100 shadow-sm'
              }`}
            >
              {b.recommended && (
                <span className="absolute -top-3 left-5 bg-[var(--orange)] text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-sm">
                  ★ Best Match
                </span>
              )}
              <div className="flex items-center justify-between mb-2 mt-1">
                <h3 className="font-bold text-xl text-[var(--dark)]">{b.name}</h3>
                {b.bucketRiskLevel && (
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${b.bucketRiskLevel === 'Conservative' ? 'bg-green-50 text-green-700' : b.bucketRiskLevel === 'Aggressive' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                    {b.bucketRiskLevel} Risk
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-5 leading-relaxed">{b.explanation}</p>
              
              <div className="bg-gray-50 rounded-2xl p-4 mb-5 border border-gray-100">
                 <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-3">{t('buckets.includedFunds')}</p>
                 {b.recommendedFunds?.map((f: any) => (
                   <div key={f.schemeCode} className="flex justify-between items-center py-2.5 border-b border-gray-200 last:border-0 cursor-pointer hover:opacity-70 transition-opacity" onClick={() => router.push(`/funds/${f.schemeCode}`)}>
                      <div className="flex-1 pr-3 min-w-0">
                        <p className="text-sm font-bold text-[var(--dark)] truncate">{f.name}</p>
                        <p className="text-[10px] font-semibold text-gray-400 truncate mt-0.5">{f.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-xs font-bold text-[var(--primary)]">₹{f.nav ? parseFloat(f.nav).toFixed(2) : 'N/A'}</p>
                        <p className="text-[9px] text-gray-400 font-medium">{f.navDate}</p>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="flex gap-3 mt-2">
                <button 
                  onClick={() => {
                    let customFunds = (b.recommendedFunds || []).map((f: any) => ({
                      id: f.schemeCode,
                      name: f.name,
                      category: f.category,
                      percentage: 0
                    }));
                    customFunds = autoBalance(customFunds);
                    localStorage.setItem('customBucketFunds', JSON.stringify(customFunds));
                    router.push('/buckets/custom');
                  }} 
                  className="flex-1 py-3.5 bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 rounded-xl font-bold transition-all text-sm"
                >
                  Customize
                </button>
                <button onClick={() => router.push(`/plan?goal=${goal}&bucket=${b.id}&amount=${amount}&period=${period}`)} className="flex-[2] py-3.5 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl font-extrabold shadow-md shadow-[var(--primary-light)] transition-all flex items-center justify-center gap-2">
                  <span>{t('buckets.investNow')}</span>
                  <span>→</span>
                </button>
              </div>
              <button onClick={() => openInvestForm(b.id)} className="w-full mt-3 py-3 bg-[var(--dark)] hover:opacity-90 text-white rounded-xl font-bold">
                Invest Now (Start SIP)
              </button>
            </div>
          ))}
        </div>
      )}

      {investingBucketId && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            {investSuccess ? (
              <div className="text-center py-4">
                <span className="text-4xl block mb-3">✅</span>
                <h3 className="font-extrabold text-lg text-[var(--dark)] mb-2">{t('buckets.orderPlaced')}</h3>
                <p className="text-sm text-gray-500 mb-1">{investSuccess.fundName}</p>
                <p className="text-sm text-gray-500 mb-4">₹{investSuccess.amount} one-time investment</p>
                <div className="bg-amber-50 text-amber-700 text-xs font-bold rounded-xl p-3 mb-4">{investSuccess.statusLabel}: {investSuccess.message}</div>
                <button onClick={() => { setInvestingBucketId(null); router.push('/dashboard'); }} className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold">
                  View on Dashboard
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-lg text-[var(--dark)]">{t('buckets.investNowOneTime')}</h3>
                  <button onClick={() => setInvestingBucketId(null)} className="text-gray-400 text-xl leading-none">✕</button>
                </div>
                <p className="text-xs text-gray-400 -mt-2 mb-2">{t('buckets.sipNotice')}</p>

                {investError && <div className="bg-red-50 text-red-500 text-xs font-bold rounded-xl p-3 mb-4">{investError}</div>}

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('buckets.amount')}</label>
                    <input type="number" min={100} value={investForm.amount} onChange={(e) => setInvestForm({ ...investForm, amount: e.target.value })} className="input-field w-full mt-1" placeholder="5000" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Gender</label>
                    <select value={investForm.gender} onChange={(e) => setInvestForm({ ...investForm, gender: e.target.value })} className="input-field w-full mt-1">
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="transgender">Transgender</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                    <input type="email" value={investForm.email} onChange={(e) => setInvestForm({ ...investForm, email: e.target.value })} className="input-field w-full mt-1" placeholder="you@example.com" />
                  </div>
                  <p className="text-xs font-bold text-gray-500 uppercase mt-2">{t('buckets.bankAccount')}</p>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('buckets.accHolder')}</label>
                    <input value={investForm.bankAccountHolderName} onChange={(e) => setInvestForm({ ...investForm, bankAccountHolderName: e.target.value })} className="input-field w-full mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('buckets.accNumber')}</label>
                    <input value={investForm.bankAccountNumber} onChange={(e) => setInvestForm({ ...investForm, bankAccountNumber: e.target.value })} className="input-field w-full mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('buckets.ifsc')}</label>
                    <input value={investForm.ifscCode} onChange={(e) => setInvestForm({ ...investForm, ifscCode: e.target.value.toUpperCase() })} className="input-field w-full mt-1" placeholder="HDFC0000001" />
                  </div>
                  <p className="text-xs font-bold text-gray-500 uppercase mt-2">{t('buckets.commAddress')}</p>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('buckets.addrLine1')}</label>
                    <input value={investForm.addressLine1} onChange={(e) => setInvestForm({ ...investForm, addressLine1: e.target.value })} className="input-field w-full mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('buckets.postal')}</label>
                    <input value={investForm.postalCode} onChange={(e) => setInvestForm({ ...investForm, postalCode: e.target.value })} className="input-field w-full mt-1" placeholder="400001" />
                  </div>

                  <button
                    onClick={submitInvest}
                    disabled={
                      investLoading ||
                      !investForm.amount ||
                      !investForm.email ||
                      !investForm.bankAccountHolderName ||
                      !investForm.bankAccountNumber ||
                      investForm.ifscCode.length < 11 ||
                      !investForm.addressLine1 ||
                      investForm.postalCode.length < 6
                    }
                    className="w-full py-3 mt-2 bg-[var(--primary)] disabled:opacity-40 text-white rounded-xl font-bold"
                  >
                    {investLoading ? 'Placing order...' : 'Confirm Order'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BucketsPage() {
  const { t } = useTranslation('common');
  return (
    <Suspense>
      <BucketsContent />
    </Suspense>
  );
}
