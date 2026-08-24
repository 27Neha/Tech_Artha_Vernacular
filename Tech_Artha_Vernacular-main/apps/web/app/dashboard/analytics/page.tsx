'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AnalyticsPage() {
  const router = useRouter();
  const [growthFilter, setGrowthFilter] = useState('1Y');
  const [returnFilter, setReturnFilter] = useState('1Y');

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-6 border-b border-gray-100 flex items-center gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[var(--dark)] leading-tight">Portfolio Analytics</h1>
          <p className="text-xs text-gray-500 mt-0.5">Understand how your investments are performing.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="px-5 mt-6">
        <div className="bg-[var(--primary)] text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <p className="text-[#EBEAF8] text-xs font-bold tracking-widest uppercase mb-1">Current Value</p>
          <p className="text-4xl font-extrabold mb-5">₹10,437</p>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#EBEAF8] text-[10px] uppercase tracking-wider mb-1">Total Invested</p>
              <p className="font-bold text-base">₹9,286</p>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div>
              <p className="text-[#EBEAF8] text-[10px] uppercase tracking-wider mb-1">Total Returns</p>
              <p className="font-bold text-base text-green-300">+₹1,151</p>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-right">
              <p className="text-[#EBEAF8] text-[10px] uppercase tracking-wider mb-1">Return</p>
              <p className="font-bold text-base text-green-300">+12.4%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-6 mt-2">
        {/* A. PORTFOLIO GROWTH */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="font-extrabold text-[var(--dark)] mb-4">Portfolio Growth</h2>
          <div className="flex gap-2 mb-6">
            {['1M', '6M', '1Y', '3Y', 'ALL'].map(f => (
              <button key={f} onClick={() => setGrowthFilter(f)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${growthFilter === f ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'bg-gray-50 text-gray-500'}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="h-40 relative flex items-end w-full border-b border-gray-100 pb-2">
            {/* SVG Line Chart Mock */}
            <svg viewBox="0 0 100 40" className="w-full h-full absolute inset-0 overflow-visible" preserveAspectRatio="none">
              <polyline points="0,40 20,35 40,28 60,30 80,15 100,5" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="0,40 20,38 40,35 60,32 80,28 100,25" fill="none" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="2,2" />
            </svg>
            <div className="absolute right-0 top-0 bg-[var(--dark)] text-white text-[10px] px-2 py-1 rounded-md translate-x-2 -translate-y-2">Current Value</div>
            <div className="absolute right-0 top-[20px] bg-gray-200 text-gray-600 text-[10px] px-2 py-1 rounded-md translate-x-2">Invested</div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-2 font-bold">
            <span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span>
          </div>
        </div>

        {/* B. RETURNS TREND */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="font-extrabold text-[var(--dark)] mb-4">Returns Trend</h2>
          <div className="flex gap-2 mb-6">
            {['1Y', '3Y', '5Y', 'ALL'].map(f => (
              <button key={f} onClick={() => setReturnFilter(f)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${returnFilter === f ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="h-32 relative flex items-end w-full border-b border-gray-100 pb-2">
            <svg viewBox="0 0 100 30" className="w-full h-full absolute inset-0 overflow-visible" preserveAspectRatio="none">
              <polyline points="0,30 25,20 50,22 75,10 100,5" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-2 font-bold">
            <span>2023</span><span>2024</span><span>2025</span><span>2026</span>
          </div>
        </div>

        {/* C. MONTHLY INVESTMENT */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="font-extrabold text-[var(--dark)] mb-1">Monthly Investment</h2>
          <p className="text-xs text-gray-400 mb-6">SIP vs Lumpsum trends</p>
          <div className="flex items-end justify-between h-32 px-2">
            {[
              { m: 'Apr', sip: 40, lump: 0 },
              { m: 'May', sip: 40, lump: 0 },
              { m: 'Jun', sip: 40, lump: 30 },
              { m: 'Jul', sip: 40, lump: 0 },
              { m: 'Aug', sip: 40, lump: 0 }
            ].map(col => (
              <div key={col.m} className="flex flex-col items-center gap-2 w-8">
                <div className="flex flex-col justify-end h-full w-4 gap-0.5">
                  {col.lump > 0 && <div className="bg-purple-400 w-full rounded-t-sm" style={{ height: `${col.lump}%` }}></div>}
                  <div className={`bg-blue-500 w-full ${col.lump === 0 ? 'rounded-t-sm' : ''} rounded-b-sm`} style={{ height: `${col.sip}%` }}></div>
                </div>
                <span className="text-[10px] font-bold text-gray-400">{col.m}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-gray-50">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500"><div className="w-2 h-2 rounded-full bg-blue-500"></div>SIP</div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500"><div className="w-2 h-2 rounded-full bg-purple-400"></div>Lumpsum</div>
          </div>
        </div>

        {/* D. ASSET ALLOCATION */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="font-extrabold text-[var(--dark)] mb-6">Asset Allocation</h2>
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32 shrink-0 drop-shadow-md">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" stroke="#f3f4f6" strokeWidth="14" fill="transparent" />
                <circle cx="50" cy="50" r="38" stroke="#10b981" strokeWidth="14" fill="transparent" strokeDasharray="238.76" strokeDashoffset="83.5" strokeLinecap="round" className="transition-all duration-1000 ease-out" /> {/* 65% Equity */}
                <circle cx="50" cy="50" r="38" stroke="#8b5cf6" strokeWidth="14" fill="transparent" strokeDasharray="238.76" strokeDashoffset="179" className="transform origin-center rotate-[234deg] transition-all duration-1000 ease-out" strokeLinecap="round" /> {/* 25% Debt */}
                <circle cx="50" cy="50" r="38" stroke="#f59e0b" strokeWidth="14" fill="transparent" strokeDasharray="238.76" strokeDashoffset="214.8" className="transform origin-center rotate-[324deg] transition-all duration-1000 ease-out" strokeLinecap="round" /> {/* 10% Hybrid */}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--dark)] bg-white rounded-full m-4 shadow-inner">
                <span className="font-extrabold text-sm">₹10.4K</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Current</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div><span className="text-xs font-bold text-[var(--dark)]">Equity</span></div><span className="text-xs font-bold text-gray-500">65%</span></div>
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]"></div><span className="text-xs font-bold text-[var(--dark)]">Debt</span></div><span className="text-xs font-bold text-gray-500">25%</span></div>
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></div><span className="text-xs font-bold text-[var(--dark)]">Hybrid</span></div><span className="text-xs font-bold text-gray-500">10%</span></div>
            </div>
          </div>
        </div>

        {/* E. FUND ALLOCATION */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="font-extrabold text-[var(--dark)] mb-4">Fund Allocation</h2>
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1"><span className="text-[var(--dark)]">Stable Income Fund</span><span className="text-[var(--primary)]">41%</span></div>
              <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-[var(--primary)] h-1.5 rounded-full" style={{ width: '41%' }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1"><span className="text-[var(--dark)]">Multi-Cap Growth Fund</span><span className="text-[var(--primary)]">38%</span></div>
              <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-[var(--primary)] h-1.5 rounded-full" style={{ width: '38%' }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1"><span className="text-[var(--dark)]">Liquid Safety Fund</span><span className="text-[var(--primary)]">21%</span></div>
              <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-[var(--primary)] h-1.5 rounded-full" style={{ width: '21%' }}></div></div>
            </div>
          </div>
        </div>

        {/* F. GOAL PROGRESS */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="font-extrabold text-[var(--dark)] mb-1">Goal Progress</h2>
          <p className="text-xs text-[var(--primary)] font-bold mb-5 bg-[var(--primary-light)] inline-block px-2 py-1 rounded-md">Child Education</p>
          
          <div className="flex justify-between items-end mb-2">
            <span className="font-extrabold text-[var(--dark)] text-lg">₹10,437</span>
            <span className="text-xs font-bold text-gray-400">Target: ₹15,00,000</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '0.7%' }}></div>
          </div>
          <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-5">
            <span>0.7% Complete</span>
            <span>Target Date: 2034</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Remaining</p>
              <p className="font-extrabold text-[var(--dark)] text-sm">₹14,89,563</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Monthly SIP</p>
              <p className="font-extrabold text-[var(--dark)] text-sm">₹2,000</p>
            </div>
          </div>
        </div>

        {/* G. RISK OVERVIEW */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="font-extrabold text-[var(--dark)] mb-4">Risk Overview</h2>
          <div className="bg-gray-50 p-4 rounded-xl mb-3">
            <p className="text-xs text-gray-500 mb-1 font-bold">Your Investor Profile</p>
            <p className="font-extrabold text-[var(--primary)]">Moderately Aggressive</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
            <p className="text-xs text-orange-600 mb-1 font-bold">Portfolio Exposure</p>
            <p className="font-extrabold text-orange-700">Moderate Risk</p>
            <p className="text-[10px] text-orange-600/80 mt-2 leading-relaxed">
              Your portfolio's scheme-level risk exposure is well within your personal profile's capacity.
            </p>
          </div>
        </div>

        {/* H. PORTFOLIO HEALTH */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-extrabold text-[var(--dark)]">Portfolio Health</h2>
            <div className="bg-green-100 text-green-700 font-extrabold px-3 py-1 rounded-xl text-lg">78 <span className="text-xs text-green-600 font-bold">/ 100</span></div>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Diversification', score: 78, color: 'bg-blue-500' },
              { label: 'Risk Alignment', score: 72, color: 'bg-amber-500' },
              { label: 'Goal Alignment', score: 85, color: 'bg-green-500' },
              { label: 'SIP Consistency', score: 91, color: 'bg-purple-500' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-[var(--dark)] w-24">{item.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5"><div className={`${item.color} h-1.5 rounded-full`} style={{ width: `${item.score}%` }}></div></div>
                <span className="text-xs font-bold text-gray-500 w-6 text-right">{item.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* I. PORTFOLIO INSIGHTS */}
        <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
          <h2 className="font-extrabold text-[var(--primary)] mb-3 flex items-center gap-2">💡 Insights for You</h2>
          <ul className="flex flex-col gap-3">
            <li className="flex items-start gap-2 text-xs text-[var(--dark)] leading-relaxed font-medium">
              <span className="text-[var(--primary)] mt-0.5">•</span> Your SIP has been consistent for 4 months.
            </li>
            <li className="flex items-start gap-2 text-xs text-[var(--dark)] leading-relaxed font-medium">
              <span className="text-[var(--primary)] mt-0.5">•</span> Your portfolio is currently invested across 3 funds.
            </li>
            <li className="flex items-start gap-2 text-xs text-[var(--dark)] leading-relaxed font-medium">
              <span className="text-[var(--primary)] mt-0.5">•</span> Your equity allocation is currently 65%, aligning perfectly with long-term wealth creation.
            </li>
          </ul>
        </div>
      </div>

      {/* BOTTOM ACTION */}
      <div className="p-5 mt-4 mb-16">
        <button 
          onClick={() => router.push('/dashboard/portfolio')} 
          className="btn-primary w-full shadow-lg shadow-indigo-200 py-4 text-base font-extrabold"
        >
          VIEW FULL PORTFOLIO →
        </button>
      </div>
    </div>
  );
}
