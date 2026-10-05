'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FamilyPortfolioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [inviteMobile, setInviteMobile] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const fetchFamily = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/family`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamily();
  }, []);

  const createFamily = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/family`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'My Family Portfolio' })
      });
      if (res.ok) {
        await fetchFamily();
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to create family portfolio');
        setLoading(false);
      }
    } catch (e) {
      setLoading(false);
    }
  };

  const inviteMember = async () => {
    if (!inviteMobile) return;
    setInviting(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/family/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mobile: inviteMobile })
      });
      if (res.ok) {
        setInviteMobile('');
        await fetchFamily();
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to add member');
      }
    } catch (e) {
      setError('An error occurred');
    } finally {
      setInviting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Family Portfolio...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-[var(--primary)] text-white px-6 py-5 flex items-center gap-4 shadow-md sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-white hover:bg-white/20 p-2 rounded-full transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="text-xl font-extrabold tracking-tight">Family Portfolio</h1>
      </div>

      <div className="p-5 flex-1">
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-4 text-sm font-bold border border-red-100">{error}</div>}

        {!portfolio ? (
          <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100 mt-10">
            <div className="w-20 h-20 bg-blue-50 text-[var(--primary)] rounded-full flex items-center justify-center text-4xl mx-auto mb-6">👨‍👩‍👧‍👦</div>
            <h2 className="text-xl font-extrabold text-[var(--dark)] mb-3">Create Family Portfolio</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">Manage and track your entire family's wealth in one place. You will be designated as the Family Head.</p>
            <button onClick={createFamily} className="w-full bg-[var(--primary)] text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/20 hover:opacity-90 transition-all">
              Create Now
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-[var(--primary)] rounded-3xl p-6 text-white shadow-lg overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <p className="text-white/80 text-sm font-bold uppercase tracking-wider mb-2">Total Family Wealth</p>
              <h2 className="text-4xl font-extrabold mb-1">₹{Math.round(portfolio.totalCurrentValue).toLocaleString('en-IN')}</h2>
              <p className="text-white/90 text-sm">₹{portfolio.totalInvested.toLocaleString('en-IN')} Invested</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="font-extrabold text-[var(--dark)] text-lg">Family Members</h3>
                <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded-md uppercase tracking-wider">{portfolio.members.length} Members</span>
              </div>
              
              <div className="grid gap-3">
                {portfolio.members.map((m: any) => (
                  <div key={m.userId} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-[var(--dark)] font-extrabold shrink-0">
                      {m.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[var(--dark)] truncate">{m.name}</p>
                        {m.role === 'HEAD' && <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Head</span>}
                      </div>
                      <p className="text-xs text-gray-400">{m.mobile}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-[var(--primary)] text-sm">₹{Math.round(m.currentValue).toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-gray-400">Inv: ₹{m.investedValue.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {portfolio.isHead && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mt-4">
                <h4 className="font-bold text-[var(--dark)] text-sm mb-3">Add Family Member</h4>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter mobile number" 
                    value={inviteMobile}
                    onChange={e => setInviteMobile(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[var(--primary)]"
                  />
                  <button 
                    onClick={inviteMember} 
                    disabled={inviting || !inviteMobile}
                    className="bg-[var(--dark)] text-white px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                  >
                    {inviting ? '...' : 'Add'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
