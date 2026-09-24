'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useMemo } from 'react';
import FundSearchModal from '../../components/FundSearchModal';
import PortfolioImpactAnalyzer from '../../components/PortfolioImpactAnalyzer';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const getBucketInfo = (profile: string) => {
    const p = profile?.toUpperCase() || 'MODERATE';
    if (p === 'CONSERVATIVE') return [
        { id: 'b1', name: 'STABILITY & CORE', targetAlloc: 60, targetFunds: '4–5 funds', desc: 'Built around your Conservative risk profile and wealth goal.' },
        { id: 'b2', name: 'BALANCED GROWTH', targetAlloc: 25, targetFunds: '2–3 funds', desc: 'Adds controlled growth exposure while considering your risk profile and horizon.' },
        { id: 'b3', name: 'DIVERSIFICATION', targetAlloc: 15, targetFunds: '1–2 funds', desc: 'Helps reduce concentration across categories and strategies.' }
    ];
    if (p === 'AGGRESSIVE') return [
        { id: 'b1', name: 'CORE GROWTH', targetAlloc: 60, targetFunds: '4–5 funds', desc: 'Built around your Aggressive risk profile and wealth goal.' },
        { id: 'b2', name: 'HIGH GROWTH', targetAlloc: 25, targetFunds: '2–3 funds', desc: 'Adds high growth exposure while considering your risk profile and horizon.' },
        { id: 'b3', name: 'DIVERSIFICATION', targetAlloc: 15, targetFunds: '1–2 funds', desc: 'Helps reduce concentration across categories and strategies.' }
    ];
    // MODERATE default
    return [
        { id: 'b1', name: 'BALANCED CORE', targetAlloc: 50, targetFunds: '3–4 funds', desc: 'Built around your Moderate risk profile and wealth goal.' },
        { id: 'b2', name: 'GROWTH', targetAlloc: 35, targetFunds: '2–3 funds', desc: 'Adds growth exposure while considering your risk profile and horizon.' },
        { id: 'b3', name: 'DIVERSIFICATION', targetAlloc: 15, targetFunds: '1–2 funds', desc: 'Helps reduce concentration across categories and strategies.' }
    ];
};

const getFundBucketId = (fund: any, profile: string) => {
    const cat = (fund.category || fund.normalizedCategory || '').toLowerCase();
    const p = profile?.toUpperCase() || 'MODERATE';
    
    if (p === 'CONSERVATIVE') {
        if (cat.includes('debt') || cat.includes('liquid') || cat.includes('money')) return 'b1';
        if (cat.includes('hybrid') || cat.includes('large')) return 'b2';
        return 'b3';
    }
    if (p === 'AGGRESSIVE') {
        if (cat.includes('large') || cat.includes('flexi') || cat.includes('multi')) return 'b1';
        if (cat.includes('mid') || cat.includes('small') || cat.includes('sector')) return 'b2';
        return 'b3';
    }
    // MODERATE
    if (cat.includes('hybrid') || cat.includes('large') || cat.includes('balanced')) return 'b1';
    if (cat.includes('mid') || cat.includes('flexi') || cat.includes('equity')) return 'b2';
    return 'b3';
};

const BUCKET_COLORS = { b1: 'bg-blue-500', b2: 'bg-green-500', b3: 'bg-purple-500' };

function BucketsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const goalStr = searchParams.get('goal') ?? 'Wealth Creation';
  
  const [loading, setLoading] = useState(true);
  const [investorProfile, setInvestorProfile] = useState<string>('MODERATE');
  const [portfolioFunds, setPortfolioFunds] = useState<any[]>([]);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pendingFund, setPendingFund] = useState<any | null>(null);
  const [targetBucketForSearch, setTargetBucketForSearch] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/buckets`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setInvestorProfile(data.investorProfile ?? 'MODERATE');
          
          if (data.buckets && data.buckets.length > 0) {
            const rec = data.buckets.find((b: any) => b.recommended) || data.buckets[0];
            if (rec.recommendedFunds?.length > 0) {
              const funds = rec.recommendedFunds;
              const N = funds.length;
              let mapped = funds.map((f: any) => ({ ...f, percentage: Math.floor(100/N) }));
              let sum = mapped.reduce((s: number, f: any) => s + f.percentage, 0);
              if (100 - sum > 0 && mapped.length > 0) {
                  mapped[0].percentage += (100 - sum);
              }
              setPortfolioFunds(mapped);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  const removeFund = (schemeCode: string) => {
      const remaining = portfolioFunds.filter(f => f.schemeCode !== schemeCode);
      if (remaining.length === 0) {
          setPortfolioFunds([]);
          return;
      }
      let sum = remaining.reduce((s, f) => s + f.percentage, 0);
      let mapped = remaining.map(f => ({ ...f, percentage: Math.floor((f.percentage / sum) * 100) }));
      let newSum = mapped.reduce((s, f) => s + f.percentage, 0);
      if (100 - newSum > 0 && mapped.length > 0) {
          mapped[0].percentage += (100 - newSum);
      }
      setPortfolioFunds(mapped);
  };

  const bucketsInfo = useMemo(() => getBucketInfo(investorProfile), [investorProfile]);
  
  const groupedFunds = useMemo(() => {
      const groups = { b1: [] as any[], b2: [] as any[], b3: [] as any[] };
      portfolioFunds.forEach(f => {
          const bId = getFundBucketId(f, investorProfile) as keyof typeof groups;
          if (groups[bId]) groups[bId].push(f);
      });
      return groups;
  }, [portfolioFunds, investorProfile]);

  const bucketAllocations = useMemo(() => {
      return {
          b1: groupedFunds.b1.reduce((sum, f) => sum + f.percentage, 0),
          b2: groupedFunds.b2.reduce((sum, f) => sum + f.percentage, 0),
          b3: groupedFunds.b3.reduce((sum, f) => sum + f.percentage, 0)
      };
  }, [groupedFunds]);

  return (
    <div className="flex flex-col min-h-screen p-4 md:p-6 bg-[#F8F9FB] max-w-2xl mx-auto">
      <div className="mb-6 mt-2 text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--dark)] mb-2 tracking-tight"><span>BUILD YOUR INVESTMENT PLAN</span></h1>
        <p className="text-gray-500 text-sm font-semibold mb-3">
          <span>{investorProfile.charAt(0).toUpperCase() + investorProfile.slice(1).toLowerCase()} • {goalStr} • 5 Years</span>
        </p>
        <p className="text-xs text-gray-500">
          <span>Your portfolio is structured around your risk profile, goal and investment horizon.</span>
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" /></div>
      ) : investorProfile === 'ASSESSMENT_REQUIRED' ? (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-4xl block mb-3">📋</span>
          <p className="font-bold text-[var(--dark)] mb-1"><span>Complete your risk assessment first</span></p>
          <button onClick={() => router.push('/risk')} className="px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-bold mt-4">
            Take the Risk Assessment
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* PORTFOLIO ALLOCATION VISUAL BAR */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4"><span>PORTFOLIO ALLOCATION</span></h2>
            
            <div className="flex justify-between items-end mb-2 px-1">
              {bucketsInfo.map(b => {
                  const alloc = bucketAllocations[b.id as keyof typeof bucketAllocations];
                  if (alloc === 0) return null;
                  return (
                    <div key={b.id} className="text-center" style={{ width: `${Math.max(alloc, 10)}%` }}>
                       <div className="font-black text-gray-900 text-sm"><span>{alloc}%</span></div>
                       <div className="text-[9px] font-bold text-gray-400 uppercase truncate"><span>{b.name.split(' ')[0]}</span></div>
                    </div>
                  );
              })}
            </div>
            
            <div className="h-3 w-full bg-gray-100 rounded-full flex overflow-hidden">
               {bucketsInfo.map(b => (
                  <div key={b.id} className={`h-full ${BUCKET_COLORS[b.id as keyof typeof BUCKET_COLORS]}`} style={{ width: `${bucketAllocations[b.id as keyof typeof bucketAllocations]}%` }} />
               ))}
            </div>
          </div>

          {/* BUCKETS */}
          <div className="flex flex-col gap-5">
            {bucketsInfo.map((bucket, index) => {
              const fundsInBucket = groupedFunds[bucket.id as keyof typeof groupedFunds];
              const alloc = bucketAllocations[bucket.id as keyof typeof bucketAllocations];
              
              return (
                <div key={bucket.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                  {/* Bucket Header */}
                  <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2">
                         <span className="text-gray-400 font-black text-sm">0{index + 1}</span>
                         <h3 className="font-extrabold text-gray-900 text-base tracking-tight uppercase"><span>{bucket.name}</span></h3>
                       </div>
                       <div className="text-lg font-black text-gray-900"><span>{alloc}%</span></div>
                    </div>
                    <div className="flex justify-between items-end">
                       <p className="text-xs text-gray-500 max-w-[70%] leading-relaxed">
                         <span className="block font-bold text-gray-700 mb-1">{bucket.targetFunds}</span>
                         <span>{bucket.desc}</span>
                       </p>
                    </div>
                  </div>

                  {/* Fund Cards */}
                  <div className="flex flex-col divide-y divide-gray-100">
                    {fundsInBucket.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400 font-medium"><span>No funds allocated to this section yet.</span></div>
                    ) : (
                      fundsInBucket.map(f => (
                        <div key={f.schemeCode} className="p-4 flex flex-col gap-3">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 text-sm leading-tight mb-1"><span>{f.fundName || f.schemeName || f.name}</span></h4>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-1"><span>{f.category}</span></p>
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">Risk: {f.suitability?.fundRiskLevel?.replace(/_/g, ' ') || 'Moderate'}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[9px] font-bold text-gray-400 uppercase">Alloc</p>
                              <div className="text-base font-black text-[var(--primary)] leading-none mt-1"><span>{f.percentage}%</span></div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mt-1 py-2 border-y border-dashed border-gray-100">
                            <div>
                               <p className="text-[9px] font-bold text-gray-400 uppercase">3Y CAGR</p>
                               <p className="text-xs font-bold text-gray-800"><span>{f.analytics?.cagr3Y ? f.analytics.cagr3Y.toFixed(1) + '%' : 'N/A'}</span></p>
                            </div>
                            <div>
                               <p className="text-[9px] font-bold text-gray-400 uppercase">Volatility</p>
                               <p className="text-xs font-bold text-gray-800"><span>{f.analytics?.volatility ? f.analytics.volatility.toFixed(1) + '%' : 'N/A'}</span></p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-1">
                            <button onClick={() => removeFund(f.schemeCode)} className="text-[10px] text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded transition-colors">Remove</button>
                            <button className="text-[10px] text-[var(--primary)] font-bold hover:bg-blue-50 px-2 py-1 rounded transition-colors">View Details</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Bucket Footer Actions */}
                  <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                     <button onClick={() => { setTargetBucketForSearch(bucket.id); setIsSearchOpen(true); }} className="text-xs font-bold text-[var(--primary)] flex items-center gap-1 hover:opacity-80">
                       <span className="text-base leading-none">+</span> Add Fund
                     </button>
                     <button className="text-xs font-bold text-gray-500 hover:text-gray-900">Edit</button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* PORTFOLIO SUMMARY */}
          <div className="bg-gray-900 rounded-2xl p-5 shadow-lg text-white mt-2">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4"><span>PORTFOLIO SUMMARY</span></h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
               <div>
                  <p className="text-[10px] text-gray-400 font-medium">Allocation</p>
                  <p className="text-sm font-bold text-green-400">100%</p>
               </div>
               <div>
                  <p className="text-[10px] text-gray-400 font-medium">Risk</p>
                  <p className="text-sm font-bold text-white">{investorProfile.charAt(0).toUpperCase() + investorProfile.slice(1).toLowerCase()}</p>
               </div>
               <div>
                  <p className="text-[10px] text-gray-400 font-medium">Goal Alignment</p>
                  <p className="text-sm font-bold text-white">Aligned</p>
               </div>
               <div>
                  <p className="text-[10px] text-gray-400 font-medium">Horizon</p>
                  <p className="text-sm font-bold text-white">5 Years</p>
               </div>
            </div>
          </div>
          
          {/* WHY THIS PORTFOLIO */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 mt-2">
             <h2 className="text-sm font-bold text-gray-900 mb-3"><span>Why this portfolio?</span></h2>
             <ul className="text-xs text-gray-600 flex flex-col gap-3 list-disc pl-4">
                <li><span>The {bucketsInfo[0].name} bucket holds the largest allocation to secure your core investments against high volatility, perfectly matching your {investorProfile.toLowerCase()} profile.</span></li>
                <li><span>The {bucketsInfo[1].name} bucket introduces calculated exposure to equity/hybrid assets to target your {goalStr} goal without breaching your risk tolerance.</span></li>
                <li><span>The Diversification section ensures your assets are not concentrated solely in one specific category or AMC, improving risk-adjusted stability.</span></li>
                <li><span>The overall structure is mathematically aligned with a 5-year investment horizon, balancing growth with necessary liquidity.</span></li>
             </ul>
             
             <div className="mt-5 pt-5 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-900 mb-2"><span>How this helps</span></h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                   <span>Your portfolio combines different fund categories so that your investment is not concentrated in one type of asset. The allocation is based strictly on your selected risk profile, goal, and investment horizon.</span>
                </p>
             </div>
          </div>

          <div className="pt-4 pb-8">
             <button className="w-full py-4 bg-[var(--primary)] text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity">
               Continue to SIP / Investment
             </button>
          </div>
          
        </div>
      )}

      <FundSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => { setIsSearchOpen(false); setTargetBucketForSearch(null); }} 
        onSelectFund={(fund) => {
            setIsSearchOpen(false);
            setPendingFund(fund);
        }} 
      />

      {pendingFund && (
        <PortfolioImpactAnalyzer 
          currentPortfolio={portfolioFunds}
          newFund={pendingFund}
          userProfile={investorProfile}
          onCancel={() => { setPendingFund(null); setTargetBucketForSearch(null); }}
          onConfirm={(rebalanced) => {
              setPortfolioFunds(rebalanced);
              setPendingFund(null);
              setTargetBucketForSearch(null);
          }}
        />
      )}
    </div>
  );
}

export default function BucketsPage() {
  return <Suspense fallback={<div className="p-6"><span>Loading portfolio...</span></div>}><BucketsContent /></Suspense>;
}
