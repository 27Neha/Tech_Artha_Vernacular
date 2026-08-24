'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const LEARN_CARDS = [
  { icon: '📚', title: 'What is a Mutual Fund?', desc: 'Learn how pooled investments work and why they are great for beginners.', time: '5 min read', slug: 'what-is-mutual-fund' },
  { icon: '⚖️', title: 'SIP vs Lump Sum', desc: 'Which investment approach suits your financial situation better?', time: '4 min read', slug: 'sip-vs-lump-sum' },
  { icon: '🛡️', title: 'Understanding Risk', desc: 'Learn how to assess and manage investment risk for your goals.', time: '6 min read', slug: 'understanding-risk' },
  { icon: '📈', title: 'Reading Fund Performance', desc: 'Understand NAV, returns, and how to compare mutual funds.', time: '7 min read', slug: 'fund-performance' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState('Moderate');
  const [recommendedFunds, setRecommendedFunds] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState({ totalInvested: 0, currentValue: 0, holdings: [] });
  const [fetchingPortfolio, setFetchingPortfolio] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/portfolio`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.data) {
            setPortfolio(data.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch portfolio', err);
      } finally {
        setFetchingPortfolio(false);
      }
    };
    fetchPortfolio();

    const saved = localStorage.getItem('investorProfile');
    if (saved) setProfile(saved);

    const fetchRecs = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/buckets`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        const recBucket = data.buckets?.find((b: any) => b.recommended);
        if (recBucket?.recommendedFunds) {
          setRecommendedFunds(recBucket.recommendedFunds);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchRecs();
  }, []);

  return (
    <div className="p-5 bg-[#F8F9FB] min-h-screen">
      <div className="flex justify-between items-center mt-2 mb-6">
        <div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Welcome Back</p>
          <h1 className="text-2xl font-extrabold text-[var(--dark)] mt-1">Start Wealth Creation</h1>
        </div>
        
      </div>

      {/* Balance Card */}
      <div className="bg-[var(--primary)] rounded-3xl p-6 mb-6 text-white shadow-xl shadow-indigo-900/10">
        <p className="text-[#EBEAF8] text-xs font-bold tracking-widest uppercase">TOTAL INVESTED</p>
        <p className="text-5xl font-extrabold mt-2">
            {fetchingPortfolio ? '₹...' : `₹${portfolio.totalInvested.toLocaleString('en-IN')}`}
          </p>
        <p className="text-[#EBEAF8] text-sm mt-1">
            {portfolio.totalInvested === 0 ? "You haven't made any investments yet." : "Verified via Cybrilla/ONDC"}
          </p>
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
      <div>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-[var(--dark)]">Recommended For You</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-500 font-bold">Based on your {profile} profile</p>
              <button onClick={() => router.push('/risk')} className="text-[10px] text-[var(--primary)] bg-[var(--primary-light)] px-2 py-0.5 rounded-full font-bold">Retake ✎</button>
            </div>
          </div>
          <button onClick={() => router.push('/buckets')} className="text-[var(--primary)] text-xs font-bold mb-0.5">See Buckets</button>
        </div>
        
        {recommendedFunds.length > 0 ? (
          <div className="flex flex-col gap-3">
            {recommendedFunds.map((fund) => (
              <div key={fund.schemeCode} onClick={() => router.push(`/funds/${fund.schemeCode}`)} className="bg-white p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-[var(--primary)] transition-all shadow-sm border border-gray-100">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-bold text-[var(--dark)] text-sm truncate">{fund.name}</p>
                  <p className="text-[10px] font-bold bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md inline-block mt-1 truncate max-w-full">{fund.category}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[var(--primary)] font-extrabold text-sm">₹{fund.nav ? parseFloat(fund.nav).toFixed(2) : 'N/A'}</p>
                  <span className="text-gray-300 text-lg font-bold block mt-1">→</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl text-center border border-gray-100 shadow-sm">
            <span className="text-3xl mb-2 block">📊</span>
            <p className="text-sm font-bold text-[var(--dark)]">Recommendations Loading...</p>
          </div>
        )}
      </div>

      {/* Safety Banner */}
      <div className="bg-[var(--primary-light)] rounded-2xl p-4 mt-6">
        <p className="text-[var(--primary)] font-bold text-sm">🛡️ Bank-grade Security</p>
        <p className="text-[var(--primary)]/70 text-[10px] mt-1 leading-relaxed font-semibold">
          Your investments are safe. All funds are held in your name directly with the AMC.
        </p>
      </div>

      
      

      {/* Learn Section */}

      <h2 className="text-lg font-extrabold text-[var(--dark)] mt-8 mb-4">Learn & Grow</h2>
      <div className="flex flex-col gap-3 pb-8">
        {LEARN_CARDS.map((c) => (
          <div 
            key={c.title} 
            onClick={() => router.push(`/dashboard/learn/${c.slug}`)}
            className="bg-white p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-[var(--primary)] transition-all shadow-sm border border-gray-100"
          >
            <span className="text-3xl shrink-0">{c.icon}</span>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">{c.title}</p>
              <p className="text-gray-400 text-[11px] mt-0.5 leading-relaxed line-clamp-2">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
