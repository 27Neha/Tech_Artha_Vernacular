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

  const [buckets, setBuckets] = useState<any[]>([]);
  const [investorProfile, setInvestorProfile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customBuckets, setCustomBuckets] = useState<any[]>([]);

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
        setBuckets(data.buckets || []);
        setInvestorProfile(data.investorProfile ?? null);
      } catch {
        console.error("Failed to fetch buckets");
      } finally {
        setLoading(false);
      }
    };
    fetchBuckets();

    const fetchCustomBuckets = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/buckets/custom`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setCustomBuckets(await res.json());
      } catch {
        console.error("Failed to fetch custom buckets");
      }
    };
    fetchCustomBuckets();
  }, []);

  return (
    <div className="flex flex-col min-h-screen p-6 bg-white">
                  <div className="flex items-center justify-between py-5 mb-4">
        <div 
          onClick={() => router.push('/funds')}
          className="w-full flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-200 transition-all shadow-inner"
        >
          <span className="text-gray-400 text-lg">🔍</span>
          <span className="text-gray-400 font-bold">Search for specific mutual funds...</span>
        </div>
      </div>

      {customBuckets.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-extrabold text-[var(--dark)] mb-3">{t('buckets.yourCustomBuckets')}</h2>
          <div className="flex flex-col gap-3">
            {customBuckets.map((cb) => (
              <div key={cb.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
                <p className="font-bold text-[var(--dark)] text-sm mb-2">{cb.name}</p>
                <div className="flex flex-col gap-1.5">
                  {(cb.funds as any[]).map((f, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-500">
                      <span className="truncate pr-2">{f.name}</span>
                      <span className="font-bold shrink-0">{f.allocation}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h1 className="text-3xl font-extrabold text-[var(--dark)] mb-2">{t('buckets.chooseBucket')}</h1>
      <p className="text-gray-500 mb-8">{t('buckets.availableForYou')}</p>

      {loading ? (
        <div className="flex justify-center mt-12"><div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" /></div>
      ) : investorProfile === 'ASSESSMENT_REQUIRED' ? (
        <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border border-gray-100">
          <span className="text-4xl block mb-3">📋</span>
          <p className="font-bold text-[var(--dark)] mb-1">{t('buckets.completeRiskAssessment')}</p>
          <p className="text-sm text-gray-500 mb-5">{t('buckets.weUseIt')}</p>
          <button onClick={() => router.push('/risk')} className="px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-bold">
            Take the Risk Assessment
          </button>
        </div>
      ) : buckets.length === 0 ? (
        <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border border-gray-100">
          <span className="text-4xl block mb-3">🗂️</span>
          <p className="font-bold text-[var(--dark)] mb-1">{t('buckets.noBucketsAvailable')}</p>
          <p className="text-sm text-gray-500">{t('buckets.tryAgain')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {Array.isArray(buckets) && buckets.map(b => (
            <div
              key={b.id}
              className={`p-5 rounded-2xl border-2 transition-all text-left relative ${
                b.recommended ? 'border-[var(--primary)] shadow-md' : 'border-gray-100 hover:border-[var(--primary-light)]'
              }`}
            >
              {b.recommended && (
                <span className="absolute -top-3 left-4 bg-[var(--orange)] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  Matches Your Profile
                </span>
              )}
                            <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-[var(--dark)]">{b.name}</h3>
                {b.bucketRiskLevel && (
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {b.bucketRiskLevel}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-3">{b.explanation}</p>
              
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                 <p className="text-xs font-bold text-gray-500 uppercase mb-2">{t('buckets.fundsInThisBucket')}</p>
                 {b.recommendedFunds?.map((f: any) => (
                   <div key={f.schemeCode} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0 cursor-pointer hover:text-[var(--primary)]" onClick={() => router.push(`/funds/${f.schemeCode}`)}>
                      <div className="flex-1 pr-2 min-w-0">
                        <p className="text-sm font-bold truncate">{f.name}</p>
                        <p className="text-xs text-gray-400 truncate">{f.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2">
                        <p className="text-sm font-bold text-[var(--primary)]">₹{f.nav ? parseFloat(f.nav).toFixed(2) : 'N/A'}</p>
                        <p className="text-[10px] text-gray-400">{f.navDate}</p>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="flex gap-3">
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
                  className="flex-1 py-3 bg-white border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary-light)] rounded-xl font-bold"
                >
                  Edit Bucket
                </button>
                <button onClick={() => router.push(`/plan?goal=${goal}&bucket=${b.id}`)} className="flex-1 py-3 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl font-bold">
                  Select
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
                <p className="text-xs text-gray-400 -mt-2 mb-2">Recurring SIP auto-debit is coming soon. This places a single one-time order.</p>

                {investError && <div className="bg-red-50 text-red-500 text-xs font-bold rounded-xl p-3 mb-4">{investError}</div>}

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('buckets.amount')}</label>
                    <input type="number" min={100} value={investForm.amount} onChange={(e) => setInvestForm({ ...investForm, amount: e.target.value })} className="input-field w-full mt-1" placeholder="5000" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('buckets.gender')}</label>
                    <select value={investForm.gender} onChange={(e) => setInvestForm({ ...investForm, gender: e.target.value })} className="input-field w-full mt-1">
                      <option value="male">{t('buckets.male')}</option>
                      <option value="female">{t('buckets.female')}</option>
                      <option value="transgender">{t('buckets.transgender')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('buckets.email')}</label>
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
