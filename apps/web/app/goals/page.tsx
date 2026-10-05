'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';

const GOALS = [
  { id: 'education', icon: '🎓', name: 'Child Education' },
  { id: 'marriage', icon: '💍', name: 'Marriage' },
  { id: 'home', icon: '🏠', name: 'Home' },
  { id: 'retirement', icon: '🌴', name: 'Retirement' },
  { id: 'vehicle', icon: '🚗', name: 'Vehicle' },
  { id: 'emergency', icon: '🏥', name: 'Emergency Fund' },
  { id: 'wealth', icon: '📈', name: 'Wealth Creation' },
  { id: 'custom', icon: '🎯', name: 'Custom Goal' },
];

export default function GoalsPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [targetAmount, setTargetAmount] = useState<number>(1000000);
  const [timePeriod, setTimePeriod] = useState<number>(5);
  const [inflationRate, setInflationRate] = useState<number>(6);

  const calculateFutureValue = () => {
    return targetAmount * Math.pow(1 + inflationRate / 100, timePeriod);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-[var(--primary)] text-white px-6 pt-12 pb-10">
        <h1 className="text-2xl font-extrabold">{t('goals.whatIsYourGoal', { defaultValue: 'What is your goal?' })}</h1>
        <p className="text-white/80 text-sm mt-2">{t('goals.suitedToYourGoal', { defaultValue: 'Select a financial goal to plan for your future.' })}</p>
      </div>

      <div className="flex-1 p-5 -mt-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 mb-8">
          {GOALS.map((goal) => (
            <button
              key={goal.id}
              onClick={() => setSelected(goal.id)}
              className={`relative p-5 rounded-2xl border-2 transition-all text-center ${
                selected === goal.id
                  ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                  : 'border-gray-200 bg-white hover:border-[var(--primary)]/40'
              }`}
            >
              {selected === goal.id && (
                <div className="absolute top-2 left-2 w-5 h-5 bg-[var(--primary)] rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
              <span className="text-4xl block mb-2">{goal.icon}</span>
              <span className={`text-sm font-bold ${selected === goal.id ? 'text-[var(--primary)]' : 'text-[var(--dark)]'}`}>
                {goal.name}
              </span>
            </button>
          ))}
        </div>

        {selected && (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-[var(--dark)] font-extrabold text-lg mb-4">Goal Details</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-1">Today's Target Amount (₹)</label>
              <input 
                type="number" 
                value={targetAmount} 
                onChange={(e) => setTargetAmount(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[var(--dark)] font-bold focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-1">Time Horizon (Years)</label>
              <input 
                type="number" 
                value={timePeriod} 
                onChange={(e) => setTimePeriod(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[var(--dark)] font-bold focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-1">Expected Inflation Rate (% p.a.)</label>
              <input 
                type="number" 
                value={inflationRate} 
                step="0.1"
                onChange={(e) => setInflationRate(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[var(--dark)] font-bold focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            
            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs text-blue-600 font-bold uppercase mb-1">Inflation Adjusted Target</p>
              <p className="text-xl text-[var(--dark)] font-extrabold">₹{calculateFutureValue().toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-gray-500 mt-1">This is what your goal will cost in {timePeriod} years assuming {inflationRate}% annual inflation.</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 bg-white border-t border-gray-100">
        <button
          onClick={() => selected && router.push(`/buckets?goal=${selected}&amount=${targetAmount}&period=${timePeriod}&inflation=${inflationRate}`)}
          disabled={!selected}
          className="btn-primary"
        >
          <span>{t('goals.chooseInvestmentPlan', { defaultValue: 'Choose Investment Plan' })}</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
