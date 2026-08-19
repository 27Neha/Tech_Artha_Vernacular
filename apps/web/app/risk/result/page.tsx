'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RiskResultPage() {
  const router = useRouter();
  const [category, setCategory] = useState('MODERATE');

  useEffect(() => {
    setCategory(localStorage.getItem('risk_category') || 'MODERATE');
  }, []);

  const getChartData = () => {
    if (category === 'AGGRESSIVE') return { a: 70, m: 20, c: 10, label: 'Aggressive', desc: 'High risk, high potential returns' };
    if (category === 'CONSERVATIVE') return { a: 10, m: 20, c: 70, label: 'Conservative', desc: 'Low risk, capital preservation' };
    return { a: 30, m: 40, c: 30, label: 'Moderate', desc: 'Balanced risk and return' };
  };

  const data = getChartData();

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="bg-[var(--primary)] text-white px-6 pt-12 pb-24">
        <h1 className="text-2xl font-extrabold text-center mb-2">Your Risk Profile</h1>
        <p className="text-center opacity-80 text-sm">Based on your 12-question assessment</p>
      </div>

      <div className="flex-1 px-6 -mt-16">
        <div className="card shadow-lg flex flex-col items-center py-8">
          
          {/* Simple CSS Conic Gradient Pie Chart */}
          <div 
            className="w-48 h-48 rounded-full mb-8 relative flex items-center justify-center shadow-inner"
            style={{ 
              background: `conic-gradient(
                #F7941E 0% ${data.a}%, 
                #3C3985 ${data.a}% ${data.a + data.m}%, 
                #102A54 ${data.a + data.m}% 100%
              )` 
            }}
          >
            <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-md">
              <span className="text-xl font-extrabold text-[var(--dark)]">{data.label}</span>
            </div>
          </div>

          <div className="w-full flex justify-between px-4">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-[#F7941E] rounded-full mb-1" />
              <span className="text-xs font-bold text-gray-500">Aggressive</span>
              <span className="text-sm font-bold text-[var(--dark)]">{data.a}%</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-[#3C3985] rounded-full mb-1" />
              <span className="text-xs font-bold text-gray-500">Moderate</span>
              <span className="text-sm font-bold text-[var(--dark)]">{data.m}%</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-[#102A54] rounded-full mb-1" />
              <span className="text-xs font-bold text-gray-500">Conservative</span>
              <span className="text-sm font-bold text-[var(--dark)]">{data.c}%</span>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-8 mb-8 px-4 leading-relaxed">
          {data.desc}. Your responses indicate that you are comfortable with this level of market fluctuation.
        </p>

        <button onClick={() => router.push('/goals')} className="btn-primary mb-4">
          <span>Continue to Financial Goals</span><span>→</span>
        </button>

        <button onClick={() => router.push('/risk')} className="btn-outline mb-8">
          Retake Assessment
        </button>
      </div>
    </div>
  );
}
