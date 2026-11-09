'use client';
import { useMemo } from 'react';

const proportionalRebalanceWithNew = (existingFunds: any[], newFund: any) => {
    if (existingFunds.length === 0) {
        return [{ ...newFund, percentage: 100 }];
    }
    
    const N = existingFunds.length + 1;
    const newWeight = Math.floor(100 / N);
    const remainingWeight = 100 - newWeight;
    
    let updated = existingFunds.map(f => {
        const oldP = f.percentage || (100 / existingFunds.length);
        const w = Math.floor((oldP / 100) * remainingWeight);
        return { ...f, percentage: w };
    });
    
    let sum = updated.reduce((s, f) => s + f.percentage, 0) + newWeight;
    let remainder = 100 - sum;
    if (remainder > 0 && updated.length > 0) {
        updated.sort((a,b) => b.percentage - a.percentage)[0].percentage += remainder;
    }
    
    return [...updated, { ...newFund, percentage: newWeight }];
};

const calcMetrics = (funds: any[]) => {
    if (funds.length === 0) return { volatility: 0, equity: 0, debt: 0, risk: 'N/A' };
    
    let vol = 0;
    let eq = 0;
    let de = 0;
    let totalValidVolWeight = 0;
    
    funds.forEach(f => {
        const p = (f.percentage || 0) / 100;
        if (f.analytics?.volatility) {
            vol += f.analytics.volatility * p;
            totalValidVolWeight += p;
        }
        
        const catStr = (f.category || f.normalizedCategory || '').toLowerCase();
        if (catStr.includes('equity')) {
            eq += p;
        } else if (catStr.includes('debt') || catStr.includes('liquid') || catStr.includes('money market')) {
            de += p;
        } else if (catStr.includes('hybrid')) {
            eq += p * 0.65;
            de += p * 0.35;
        } else {
            de += p;
        }
    });
    
    if (totalValidVolWeight > 0) vol = vol / totalValidVolWeight;
    
    eq = eq * 100;
    de = de * 100;
    
    let risk = 'Low';
    if (vol > 15) risk = 'Very High';
    else if (vol > 10) risk = 'High';
    else if (vol > 7) risk = 'Moderately High';
    else if (vol > 4) risk = 'Moderate';
    else if (vol > 2) risk = 'Moderately Low';

    return { volatility: vol, equity: eq, debt: de, risk };
};

export default function PortfolioImpactAnalyzer({
  currentPortfolio,
  newFund,
  onConfirm,
  onCancel,
  userProfile
}: {
  currentPortfolio: any[];
  newFund: any;
  onConfirm: (rebalancedPortfolio: any[]) => void;
  onCancel: () => void;
  userProfile: string;
}) {
  const newPortfolio = useMemo(() => proportionalRebalanceWithNew(currentPortfolio, newFund), [currentPortfolio, newFund]);
  
  const before = useMemo(() => calcMetrics(currentPortfolio), [currentPortfolio]);
  const after = useMemo(() => calcMetrics(newPortfolio), [newPortfolio]);
  
  const volChange = after.volatility - before.volatility;
  const eqChange = after.equity - before.equity;
  
  // Basic risk level to number for comparison
  const riskLevels = { 'Low': 1, 'Moderately Low': 2, 'Moderate': 3, 'Moderately High': 4, 'High': 5, 'Very High': 6 };
  const getRiskNum = (r: string) => riskLevels[r as keyof typeof riskLevels] || 3;
  const userRiskNum = getRiskNum(userProfile === 'CONSERVATIVE' ? 'Moderately Low' : userProfile === 'AGGRESSIVE' ? 'High' : 'Moderate');
  const fundRiskNum = getRiskNum(newFund.suitability?.fundRiskLevel?.replace(/_/g, ' ') || 'Moderate');
  const mismatch = fundRiskNum > userRiskNum + 1; // Significant mismatch

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-start gap-3">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900 leading-tight"><span>{newFund.fundName}</span></h3>
            <p className="text-xs text-gray-500 mt-1"><span>{newFund.category}</span></p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Current NAV</p>
            <p className="text-sm font-bold text-gray-900">₹<span>{parseFloat(newFund.currentNav || '0').toFixed(2)}</span></p>
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          {mismatch && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-2"><span>⚠️ Risk Profile Mismatch</span></h4>
              <p className="text-xs text-amber-700 leading-relaxed">
                <span>Your profile is {userProfile.toLowerCase()}, while this fund has a higher risk level. Adding it may increase portfolio volatility and cause larger short-term fluctuations.</span>
              </p>
            </div>
          )}

          <h4 className="font-bold text-gray-900 mb-4 text-sm"><span>How this impacts your portfolio</span></h4>
          
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="col-span-1"></div>
            <div className="text-center text-xs font-bold text-gray-400 uppercase">Before</div>
            <div className="text-center text-xs font-bold text-gray-900 uppercase">After</div>
            
            <div className="text-xs font-bold text-gray-600">Risk</div>
            <div className="text-center text-sm font-semibold text-gray-500"><span>{currentPortfolio.length > 0 ? before.risk : 'N/A'}</span></div>
            <div className={`text-center text-sm font-bold ${after.risk !== before.risk ? 'text-blue-600' : 'text-gray-900'}`}><span>{after.risk}</span></div>
            
            <div className="text-xs font-bold text-gray-600">Volatility*</div>
            <div className="text-center text-sm font-semibold text-gray-500"><span>{currentPortfolio.length > 0 ? `${before.volatility.toFixed(1)}%` : '0%'}</span></div>
            <div className={`text-center text-sm font-bold ${volChange > 0 ? 'text-amber-600' : 'text-green-600'}`}><span>{after.volatility.toFixed(1)}%</span></div>

            <div className="text-xs font-bold text-gray-600">Equity</div>
            <div className="text-center text-sm font-semibold text-gray-500"><span>{currentPortfolio.length > 0 ? `${Math.round(before.equity)}%` : '0%'}</span></div>
            <div className={`text-center text-sm font-bold ${eqChange > 0 ? 'text-blue-600' : 'text-gray-900'}`}><span>{Math.round(after.equity)}%</span></div>
          </div>
          
          <p className="text-[9px] text-gray-400 mb-6 italic">* Volatility projection assumes a conservative weighted maximum.</p>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <h5 className="text-xs font-bold text-blue-900 mb-1">What this means for you</h5>
            <p className="text-xs text-blue-800 leading-relaxed">
              {eqChange > 5 ? (
                <span>Because equity exposure increases by {Math.round(eqChange)}%, your portfolio may experience larger short-term fluctuations. This shifts your portfolio closer to a growth-oriented structure.</span>
              ) : volChange > 1 ? (
                <span>Adding this fund increases your portfolio's expected volatility by {volChange.toFixed(1)}%. It may be less aligned with a short-term investment horizon.</span>
              ) : eqChange < -5 ? (
                <span>Because equity exposure decreases, your portfolio structure becomes more conservative, which prioritizes stability over high growth.</span>
              ) : (
                <span>Adding this fund provides additional diversification without significantly shifting your overall portfolio risk or equity exposure.</span>
              )}
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(newPortfolio)} className="py-3 px-4 bg-[var(--primary)] rounded-xl text-white font-bold hover:opacity-90 transition-opacity">
            Add to Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}
