'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

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

export default function FundDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [details, setDetails] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetailsAndEvaluate = async () => {
      try {
        // 1. Fetch raw details for NAV graph
        const res = await fetch(`${API_URL}/funds/${params.id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setDetails(data);

        // 2. Fetch full suitability evaluation
        const token = localStorage.getItem('access_token');
        if (token) {
          const evalRes = await fetch(`${API_URL}/buckets/evaluate-fund?schemeCode=${params.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (evalRes.ok) {
            setEvaluation(await evalRes.json());
          }
        }
      } catch {
        setError('Fund data is temporarily unavailable.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetailsAndEvaluate();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen p-6 justify-center items-center bg-white">
        <div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
        <p className="mt-4 text-gray-500 font-bold">Analyzing fund details...</p>
      </div>
    );
  }

  if (error || !details?.data) {
    return (
      <div className="flex flex-col min-h-screen p-6 justify-center items-center bg-white text-center">
        <span className="text-5xl">😞</span>
        <p className="mt-4 text-red-500 font-bold">{error || 'Fund not found.'}</p>
        <button onClick={() => router.back()} className="mt-6 py-2 px-6 border-2 border-[var(--primary)] text-[var(--primary)] rounded-lg font-bold">Go Back</button>
      </div>
    );
  }

  const meta = details.meta;
  const navHistory = details.data;
  const latestNav = navHistory[0] ?? { nav: 'N/A', date: 'N/A' };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB]">
      <div className="bg-[var(--primary)] p-4 flex items-center justify-between text-white">
        <button onClick={() => router.back()} className="font-bold">← Back</button>
        <h2 className="font-bold text-lg">Fund Analysis</h2>
      </div>

      {evaluation?.riskAlert && (
        <div className={`p-4 m-4 rounded-xl border-l-4 ${evaluation.riskAlert.severity === 'HIGH' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">⚠</span>
            <div>
              <p className={`font-extrabold text-sm mb-1 ${evaluation.riskAlert.severity === 'HIGH' ? 'text-red-800' : 'text-amber-800'}`}>
                Risk Profile Mismatch
              </p>
              <p className={`text-xs ${evaluation.riskAlert.severity === 'HIGH' ? 'text-red-700' : 'text-amber-700'}`}>
                {evaluation.riskAlert.message}
              </p>
              <p className="text-xs mt-2 font-bold opacity-75">Please review the fund's risk and suitability before proceeding.</p>
            </div>
          </div>
        </div>
      )}

      {evaluation?.dataQuality?.status !== 'VALID_FRESH' && (
        <div className="p-4 m-4 bg-gray-100 border border-gray-300 rounded-xl">
           <p className="font-bold text-gray-800 text-sm mb-1">Data Quality Warning</p>
           <p className="text-xs text-gray-600">The historical data for this fund is categorized as <b>{evaluation?.dataQuality?.status?.replace(/_/g, ' ')}</b>. It may have stopped reporting NAVs or lacks sufficient history for accurate analysis.</p>
        </div>
      )}

      <div className="p-5 bg-white mb-4 border-b border-gray-100 shadow-sm">
        <h1 className="text-2xl font-extrabold text-[var(--dark)] leading-tight">{meta.scheme_name}</h1>
        <p className="text-sm text-gray-500 mt-2">{meta.fund_house} • {meta.scheme_category}</p>
        <div className="flex gap-2 mt-3">
          <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md uppercase tracking-wider">{meta.scheme_type}</span>
          {evaluation?.suitability?.fundRiskLevel && (
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-md uppercase tracking-wider">Risk: {evaluation.suitability.fundRiskLevel.replace(/_/g, ' ')}</span>
          )}
        </div>
      </div>

      <div className="px-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Latest NAV</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-3xl font-extrabold text-[var(--dark)]">₹{parseFloat(latestNav.nav).toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">As of: {latestNav.date}</p>
          </div>
          {evaluation?.analytics && (
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">3Y CAGR</p>
              <p className="text-2xl font-extrabold text-green-600 mt-1">{evaluation.analytics.cagr3Y ? `${evaluation.analytics.cagr3Y.toFixed(1)}%` : 'N/A'}</p>
            </div>
          )}
        </div>

        {evaluation?.analytics && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase">1Y Return</p>
              <p className="text-lg font-extrabold text-gray-800 mt-1">{evaluation.analytics.return1Y ? `${evaluation.analytics.return1Y.toFixed(1)}%` : 'N/A'}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Volatility (Ann.)</p>
              <p className="text-lg font-extrabold text-gray-800 mt-1">{evaluation.analytics.volatility ? `${evaluation.analytics.volatility.toFixed(1)}%` : 'N/A'}</p>
            </div>
          </div>
        )}

        <h3 className="font-bold text-[var(--dark)] mb-3 px-1">Historical NAV</h3>
        {navHistory.length < 5 ? (
          <div className="p-4 bg-white rounded-xl border border-gray-100 mb-6 text-center shadow-sm">
            <p className="text-sm text-gray-500 font-semibold">Insufficient historical data to render chart.</p>
          </div>
        ) : (
          <div className="h-48 bg-white shadow-sm rounded-xl border border-gray-100 flex items-center justify-center mb-6 relative overflow-hidden">
             <div className="absolute bottom-0 left-0 right-0 flex items-end h-32 px-4 gap-1 opacity-20">
                {navHistory.slice(0, 30).reverse().map((point: any, i: number) => (
                  <div key={i} className="flex-1 bg-[var(--primary)] rounded-t-sm" style={{ height: `${Math.min(100, Math.max(10, parseFloat(point.nav)))}%` }} />
                ))}
             </div>
             <p className="text-sm font-bold text-[var(--primary)] z-10">Chart uses actual {navHistory.length} data points</p>
          </div>
        )}
      </div>

      <div className="mt-auto p-5 bg-white border-t border-gray-100 flex flex-col gap-3">
        {evaluation?.dataQuality?.status !== 'VALID_FRESH' ? (
           <button disabled className="w-full py-4 bg-gray-200 text-gray-500 rounded-xl font-extrabold cursor-not-allowed">Cannot Add - Invalid Data</button>
        ) : (
           <button onClick={() => {
            let currentBucket = JSON.parse(localStorage.getItem('customBucketFunds') || '[]');
            if (!currentBucket.find((f: any) => f.id === params.id)) {
              currentBucket.push({ id: params.id, name: meta.scheme_name, category: meta.scheme_category || 'Mutual Fund', percentage: 0 });
              currentBucket = autoBalance(currentBucket);
              localStorage.setItem('customBucketFunds', JSON.stringify(currentBucket));
            }
            router.push('/buckets/custom');
          }} className={`w-full py-4 text-white rounded-xl font-extrabold transition-opacity shadow-sm ${evaluation?.riskAlert ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[var(--primary)] hover:opacity-90'}`}>
            {evaluation?.riskAlert ? 'Continue Anyway (Add to Bucket)' : 'Add to Custom Bucket'}
          </button>
        )}
      </div>
    </div>
  );
}
