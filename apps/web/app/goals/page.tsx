'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

const GOALS = [
  { id: 'education', icon: '🎓', name: 'Child Education' },
  { id: 'marriage', icon: '💍', name: 'Marriage' },
  { id: 'home', icon: '🏠', name: 'Home' },
  { id: 'retirement', icon: '🏖️', name: 'Retirement' },
  { id: 'vehicle', icon: '🚗', name: 'Vehicle' },
  { id: 'emergency', icon: '🚑', name: 'Emergency Fund' },
  { id: 'travel', icon: '✈️', name: 'Vacation/Travel' },
  { id: 'wealth', icon: '📈', name: 'Wealth Creation' },
  { id: 'business', icon: '💼', name: 'Business/Other' },
  { id: 'custom', icon: '🎯', name: 'Custom Goal' },
];

export default function GoalsPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<string | null>(null);
  
  // Goal Details State
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [timePeriod, setTimePeriod] = useState<string>('5');

  const selectedGoal = GOALS.find(g => g.id === selected);

  const handleNextStep = () => {
    if (step === 1 && selected) {
      setStep(2);
    } else if (step === 2) {
      router.push(`/buckets?goal=${selected}&amount=${targetAmount}&period=${timePeriod}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[var(--primary)] text-white px-6 pt-12 pb-10 rounded-b-3xl shadow-md z-10 relative">
        <button 
          onClick={() => step === 2 ? setStep(1) : router.back()} 
          className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full mb-4 transition-colors"
        >
          <span className="text-xl">←</span>
        </button>
        <h1 className="text-2xl font-extrabold">{step === 1 ? "What's your financial goal?" : `${selectedGoal?.icon} ${selectedGoal?.name}`}</h1>
        <p className="text-white/80 text-sm mt-2">{step === 1 ? "We'll recommend the best funds tailored to your goal." : "Tell us a bit more about what you want to achieve."}</p>
      </div>

      <div className="flex-1 p-5 -mt-6 z-20 relative">
        {step === 1 ? (
          <div className="grid grid-cols-2 gap-4">
            {GOALS.map((goal) => (
              <button
                key={goal.id}
                onClick={() => setSelected(goal.id)}
                className={`relative p-5 rounded-3xl border-2 transition-all text-center ${
                  selected === goal.id
                    ? 'border-[var(--primary)] bg-[var(--primary-light)] shadow-md translate-y-[-2px]'
                    : 'border-gray-200 bg-white hover:border-[var(--primary)]/40 hover:shadow-sm'
                }`}
              >
                {selected === goal.id && (
                  <div className="absolute top-3 left-3 w-6 h-6 bg-[var(--primary)] rounded-full flex items-center justify-center shadow-sm animate-in zoom-in">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                )}
                <span className="text-4xl block mb-3 mt-2">{goal.icon}</span>
                <span className={`text-sm font-bold ${selected === goal.id ? 'text-[var(--primary)]' : 'text-[var(--dark)]'}`}>
                  {goal.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-gray-100 animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-[var(--dark)] mb-2">{t('goals.target')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input 
                    type="text" 
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-lg font-extrabold text-[var(--dark)] focus:border-[var(--primary)] focus:bg-white focus:ring-4 focus:ring-[var(--primary-light)] outline-none transition-all"
                    placeholder="e.g. 500000"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-[var(--dark)]">{t('goals.time')}</label>
                  <span className="text-[var(--primary)] font-bold bg-[var(--primary-light)] px-3 py-1 rounded-full text-xs">
                    {timePeriod} Years
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="30" 
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                />
                <div className="flex justify-between text-xs text-gray-400 font-bold mt-2 px-1">
                  <span>{t('goals.1yr')}</span>
                  <span>{t('goals.15yrs')}</span>
                  <span>{t('goals.30yrs')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-gray-100 z-20">
        <button
          onClick={handleNextStep}
          disabled={step === 1 ? !selected : !targetAmount}
          className="w-full bg-[var(--primary)] text-white font-extrabold py-4 rounded-2xl disabled:opacity-50 disabled:bg-gray-300 transition-all shadow-lg shadow-[var(--primary-light)] flex items-center justify-center gap-2"
        >
          {step === 1 ? (
            <span>{t('goals.continue')}</span>
          ) : (
            <>
              <span>{t('goals.startInvesting')}</span>
              <span className="text-xl">🚀</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
