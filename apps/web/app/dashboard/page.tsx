'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const LEARN_CARDS = [
  { icon: '📈', title: 'What is a Mutual Fund?', desc: 'Learn how pooled investments work and why they are great for beginners.', time: '5 min read', slug: 'what-is-mutual-fund' },
  { icon: '💡', title: 'SIP vs Lump Sum', desc: 'Which investment approach suits your financial situation better?', time: '4 min read', slug: 'sip-vs-lump-sum' },
  { icon: '🛡️', title: 'Understanding Risk', desc: 'Learn how to assess and manage investment risk for your goals.', time: '6 min read', slug: 'understanding-risk' },
  { icon: '📊', title: 'Reading Fund Performance', desc: 'Understand NAV, returns, and how to compare mutual funds.', time: '7 min read', slug: 'fund-performance' },
];

const FUNDS_DB = {
  'Conservative': [
    { name: 'SBI Liquid Fund', type: 'Debt', returns: '7.1% p.a.', risk: 'Low Risk', logo: 'S' },
    { name: 'HDFC Corporate Bond Fund', type: 'Debt', returns: '7.5% p.a.', risk: 'Low-Mod Risk', logo: 'H' }
  ],
  'Moderately Conservative': [
    { name: 'ICICI Pru Equity & Debt', type: 'Hybrid', returns: '12.4% p.a.', risk: 'Mod Risk', logo: 'I' },
    { name: 'Kotak Debt Hybrid', type: 'Hybrid', returns: '9.8% p.a.', risk: 'Mod Risk', logo: 'K' }
  ],
  'Moderate': [
    { name: 'Parag Parikh Flexi Cap', type: 'Equity', returns: '18.2% p.a.', risk: 'High Risk', logo: 'P' },
    { name: 'Mirae Asset Large Cap', type: 'Equity', returns: '14.5% p.a.', risk: 'Mod-High Risk', logo: 'M' }
  ],
  'Moderately Aggressive': [
    { name: 'Nippon India Small Cap', type: 'Equity', returns: '24.1% p.a.', risk: 'Very High Risk', logo: 'N' },
    { name: 'Axis Midcap Fund', type: 'Equity', returns: '19.4% p.a.', risk: 'High Risk', logo: 'A' }
  ],
  'Aggressive': [
    { name: 'Quant Small Cap Fund', type: 'Equity', returns: '28.5% p.a.', risk: 'Very High Risk', logo: 'Q' },
    { name: 'Motilal Oswal Midcap', type: 'Equity', returns: '23.2% p.a.', risk: 'Very High Risk', logo: 'M' }
  ]
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState('Moderate');

  useEffect(() => {
    const saved = localStorage.getItem('user_risk_profile');
    if (saved && FUNDS_DB[saved as keyof typeof FUNDS_DB]) {
      setProfile(saved);
    }
  }, []);

  const recommendedFunds = FUNDS_DB[profile as keyof typeof FUNDS_DB] || FUNDS_DB['Moderate'];

  return (
    <div className="p-5">
      <h1 className="text-3xl font-extrabold text-[var(--dark)] mt-1">Your Portfolio</h1>
      <p className="text-gray-500 text-sm mt-1">Stay on track with your financial goals.</p>

      {/* Balance Card */}
      <div className="bg-[var(--primary)] rounded-3xl p-6 mt-5 text-white shadow-xl shadow-indigo-900/10">
        <p className="text-[#EBEAF8] text-xs font-bold tracking-widest uppercase">TOTAL INVESTED</p>
        <p className="text-5xl font-extrabold mt-2">₹9,286</p>
        <p className="text-[#EBEAF8] text-sm mt-1">This month's SIP · Next: 10th Sep</p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => router.push('/funds')}
            className="bg-white text-[var(--primary)] font-bold text-sm px-5 py-2.5 rounded-xl"
          >
            Browse Funds
          </button>
          <button 
            onClick={() => router.push('/dashboard/analytics')}
            className="bg-white/20 text-white font-bold text-sm px-5 py-2.5 rounded-xl"
          >
            View Details
          </button>
        </div>
      </div>

      {/* Recommended Funds based on Risk */}
      <div className="mt-8">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-[var(--dark)]">Recommended For You</h2>
            <p className="text-xs text-[var(--primary)] font-bold mt-0.5">Based on your {profile} profile</p>
          </div>
          <button onClick={() => router.push('/funds')} className="text-[var(--primary)] text-xs font-bold mb-0.5">See All</button>
        </div>
        
        <div className="flex flex-col gap-3">
          {recommendedFunds.map((fund) => (
            <div key={fund.name} className="card flex items-center gap-4 cursor-pointer hover:border-[var(--primary)] transition-all">
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-[var(--primary)] font-black flex items-center justify-center text-lg shrink-0">
                {fund.logo}
              </div>
              <div className="flex-1">
                <p className="font-bold text-[var(--dark)] text-sm">{fund.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{fund.type}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    fund.risk.includes('High') ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                  }`}>{fund.risk}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-green-600 font-extrabold text-sm">{fund.returns}</p>
                <p className="text-gray-400 text-[10px] font-semibold mt-0.5">3Y CAGR</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="card text-center py-4">
          <p className="text-2xl font-extrabold text-[var(--primary)]">12.4%</p>
          <p className="text-xs text-gray-400 mt-1 font-semibold">Annualised Returns</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-extrabold text-[var(--orange)]">8 yrs</p>
          <p className="text-xs text-gray-400 mt-1 font-semibold">Goal Horizon</p>
        </div>
      </div>

      {/* Safety Banner */}
      <div className="bg-[var(--primary-light)] rounded-2xl p-4 mt-5">
        <p className="text-[var(--primary)] font-bold text-sm">🔒 Your investments are safe</p>
        <p className="text-gray-500 text-xs mt-1 leading-relaxed">
          All funds are held in your name with CAMS/Karvy as registrar. TechArtha never holds your money.
        </p>
      </div>

      {/* Learn Section */}
      <h2 className="text-lg font-extrabold text-[var(--dark)] mt-7 mb-4">Learn & Grow</h2>
      <div className="flex flex-col gap-3">
        {LEARN_CARDS.map((c) => (
          <div 
            key={c.title} 
            onClick={() => router.push(`/dashboard/learn/${c.slug}`)}
            className="card flex items-center gap-4 cursor-pointer hover:border-[var(--primary)] transition-all"
          >
            <span className="text-3xl shrink-0">{c.icon}</span>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">{c.title}</p>
              <p className="text-gray-400 text-[11px] mt-0.5 leading-relaxed line-clamp-2">{c.desc}</p>
              <p className="text-[var(--orange)] text-[10px] font-bold mt-1 uppercase tracking-wider">{c.time}</p>
            </div>
            <span className="text-[var(--orange)] text-2xl shrink-0">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
