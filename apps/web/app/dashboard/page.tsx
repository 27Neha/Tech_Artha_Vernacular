'use client';
import { useRouter } from 'next/navigation';
import { useKyc } from '../../hooks/useKyc';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

const LEARN_CARDS = [
  { icon: '📚', title: 'What is a Mutual Fund?', desc: 'Learn how pooled investments work and why they are great for beginners.', time: '5 min read', slug: 'what-is-mutual-fund' },
  { icon: '⚖️', title: 'SIP vs Lump Sum', desc: 'Which investment approach suits your financial situation better?', time: '4 min read', slug: 'sip-vs-lump-sum' },
  { icon: '🛡️', title: 'Understanding Risk', desc: 'Learn how to assess and manage investment risk for your goals.', time: '6 min read', slug: 'understanding-risk' },
  { icon: '📈', title: 'Reading Fund Performance', desc: 'Understand NAV, returns, and how to compare mutual funds.', time: '7 min read', slug: 'fund-performance' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function DashboardPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { requireKyc, isCheckingKyc } = useKyc();
  const [profile, setProfile] = useState('');
  const [recommendedFunds, setRecommendedFunds] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState({ totalInvested: 0, currentValue: 0, holdings: [] });
  const [fetchingPortfolio, setFetchingPortfolio] = useState(true);
  const [sipPlans, setSipPlans] = useState<any[]>([]);
  const [fetchingSips, setFetchingSips] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);
  const [fetchingGoals, setFetchingGoals] = useState(true);

  useEffect(() => {
    const fetchGoalsData = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/goals`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setGoals(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch goals', err);
      } finally {
        setFetchingGoals(false);
      }
    };
    fetchGoalsData();

    const fetchInvestments = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/buckets/investments`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          const orders = (data.orders || []).map((o: any) => ({ ...o, kind: 'order' }));
          const plans = (data.plans || []).map((p: any) => ({ ...p, kind: 'plan' }));
          setSipPlans([...orders, ...plans]);
        }
      } catch (err) {
        console.error('Failed to fetch SIPs', err);
      } finally {
        setFetchingSips(false);
      }
    };
    fetchInvestments();
  }, []);

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

    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/auth/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (data.riskProfile?.category) {
            const cat = data.riskProfile.category;
            const formatted = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
            setProfile(formatted);
            localStorage.setItem('investorProfile', formatted);
          }
        }
      } catch (e) {
        console.error('Failed to fetch profile', e);
      }
    };
    fetchProfile();

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
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">{t('dash.welcomeBack')}</p>
          <h1 className="text-2xl font-extrabold text-[var(--dark)] mt-1">{t('dash.startWealthCreation')}</h1>
        </div>
        
      </div>

      {/* Balance Card */}
      <div className="bg-[var(--primary)] rounded-3xl p-6 mb-6 text-white shadow-xl shadow-indigo-900/10">
        <p className="text-[#EBEAF8] text-xs font-bold tracking-widest uppercase">{t('dash.totalInvested')}</p>
        <p className="text-5xl font-extrabold mt-2">
            {fetchingPortfolio ? '₹...' : `₹${portfolio.totalInvested.toLocaleString('en-IN')}`}
          </p>
        <p className="text-[#EBEAF8] text-sm mt-1">
            {portfolio.totalInvested === 0 ? t('dash.noInvestmentsYet') : t('dash.verifiedVia')}
          </p>
        
        <div className="flex gap-3 mt-4">
          {portfolio.totalInvested === 0 ? (
            <button
              onClick={() => requireKyc('/goals')}
              disabled={isCheckingKyc}
              className="bg-white text-[var(--primary)] font-bold text-sm px-5 py-2.5 rounded-xl disabled:opacity-70"
            >
              {isCheckingKyc ? "Checking your verification status..." : "Start My Onboarding Journey"}
            </button>
          ) : (
            <>
              <button
                onClick={() => router.push('/funds')}
                className="bg-white text-[var(--primary)] font-bold text-sm px-5 py-2.5 rounded-xl"
              >
                {t('dash.browseFunds', { defaultValue: 'Browse Funds' })}
              </button>
              <button 
                onClick={() => router.push('/dashboard/analytics')}
                className="bg-white/20 text-white font-bold text-sm px-5 py-2.5 rounded-xl"
              >
                {t('dash.viewDetails', { defaultValue: 'View Details' })}
              </button>
            </>
          )}
        </div>
      </div>

      
      {/* My Goals Progress Section */}
            {/* My Goals Progress Section */}
      {!fetchingGoals && (
        <div className="mb-6">
          <div className="flex justify-between items-end mb-3">
            <h2 className="text-lg font-extrabold text-[var(--dark)]">My Goals</h2>
            {goals.length > 0 && (
              <button onClick={() => router.push('/goals')} className="text-[var(--primary)] text-xs font-bold mb-0.5">Add New</button>
            )}
          </div>
          <div className="flex flex-col gap-4">
            {goals.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <span className="text-4xl mb-3">🎯</span>
                <h3 className="font-bold text-[var(--dark)] text-sm mb-1">No goals created yet</h3>
                <p className="text-xs text-gray-500 mb-4">Start planning for your future by setting a financial goal.</p>
                <button 
                  onClick={() => router.push('/goals')}
                  className="bg-[var(--primary-light)] text-[var(--primary)] font-bold text-sm px-6 py-2.5 rounded-full"
                >
                  Plan a Goal
                </button>
              </div>
            ) : (
              goals.map((g) => {
                const p = g.progressPercentage || 0;
                return (
                  <div key={g.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-[var(--dark)] text-sm">{g.name}</h3>
                        <p className="text-xs text-gray-500 font-medium">{g.timePeriod} Years · {g.bucketName === 'stable' ? 'Conservative' : g.bucketName === 'growth' ? 'Aggressive' : 'Moderate'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-[var(--primary)] text-sm">₹{g.targetAmount?.toLocaleString('en-IN')}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">Future Target: ₹{g.inflationAdjustedAmount ? Math.round(g.inflationAdjustedAmount).toLocaleString('en-IN') : g.targetAmount?.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4 mb-2">
                      <div className="flex justify-between text-[11px] font-bold mb-1.5">
                        <span className="text-[var(--primary)]">₹{g.currentInvestmentValue?.toLocaleString('en-IN')} Saved</span>
                        <span className="text-gray-500">{p.toFixed(1)}%</span>
                      </div>
                      <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--primary)] rounded-full transition-all duration-1000 ease-out" style={{ width: `${p}%` }}></div>
                      </div>
                      {g.remainingAmount > 0 && (
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-[10px] text-gray-500 font-bold">₹{g.remainingAmount?.toLocaleString('en-IN')} left</p>
                          <p className="text-[10px] text-[var(--primary)] font-bold">SIP: ₹{g.monthlySip?.toLocaleString('en-IN')}/mo</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Active orders / SIPs from bucket investments */}
      {!fetchingSips && sipPlans.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-extrabold text-[var(--dark)] mb-3">{t('dash.yourOrders')}</h2>
          <div className="flex flex-col gap-3">
            {sipPlans.map((p) => {
              const badge =
                p.statusLabel === 'Order fulfilled'
                  ? 'bg-green-50 text-green-700'
                  : p.statusLabel === 'Order failed'
                  ? 'bg-red-50 text-red-600'
                  : 'bg-amber-50 text-amber-700';
              return (
                <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-[var(--dark)] text-sm truncate pr-2">{p.fundName}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${badge}`}>{p.statusLabel}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    ₹{p.amount.toLocaleString('en-IN')} {p.kind === 'plan' ? `/${p.frequency.toLowerCase()} · day ${p.installmentDay}` : '· one-time'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommended Funds based on Risk */}
      <div>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-[var(--dark)]">{t('dash.forYourRiskProfile')}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-500 font-bold">{t('dash.basedOnProfile')} {profile}</p>
              <button onClick={() => router.push('/risk')} className="text-[10px] text-[var(--primary)] bg-[var(--primary-light)] px-2 py-0.5 rounded-full font-bold">{t('dash.retake')} ✎</button>
            </div>
          </div>
          <button onClick={() => router.push('/buckets')} className="text-[var(--primary)] text-xs font-bold mb-0.5">{t('dash.seeBuckets')}</button>
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
            <p className="text-sm font-bold text-[var(--dark)]">{t('dash.loadingFunds')}</p>
          </div>
        )}
      </div>

      {/* Safety Banner */}
      <div className="bg-[var(--primary-light)] rounded-2xl p-4 mt-6">
        <p className="text-[var(--primary)] font-bold text-sm">🛡️ {t('dash.bankSecurity')}</p>
        <p className="text-[var(--primary)]/70 text-[10px] mt-1 leading-relaxed font-semibold">
          {t('dash.bankSecurityDesc')}
        </p>
      </div>

      
      

      {/* Learn Section */}

      <h2 className="text-lg font-extrabold text-[var(--dark)] mt-8 mb-4">{t('dash.learnAndGrow')}</h2>
      <div className="flex flex-col gap-3 pb-8">
        {LEARN_CARDS.map((c) => (
          <div 
            key={c.title} 
            onClick={() => router.push(`/dashboard/learn/${c.slug}`)}
            className="bg-white p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-[var(--primary)] transition-all shadow-sm border border-gray-100"
          >
            <span className="text-3xl shrink-0">{c.icon}</span>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">{t("learn." + c.slug.replace(/-([a-z])/g, g => g[1].toUpperCase()) + ".title") || c.title}</p>
              <p className="text-gray-400 text-[11px] mt-0.5 leading-relaxed line-clamp-2">{t("learn." + c.slug.replace(/-([a-z])/g, g => g[1].toUpperCase()) + ".desc") || c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

