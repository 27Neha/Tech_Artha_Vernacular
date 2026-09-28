'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const GOALS = [
  { id: 'education', icon: '🎓', name: 'Child Education' },
  { id: 'home', icon: '🏠', name: 'Home' },
  { id: 'marriage', icon: '💍', name: 'Marriage' },
  { id: 'vehicle', icon: '🚗', name: 'Vehicle' },
  { id: 'travel', icon: '🌴', name: 'Travel' },
  { id: 'retirement', icon: '👴', name: 'Retirement' },
  { id: 'wealth', icon: '💰', name: 'Wealth Creation' },
  { id: 'custom', icon: '✨', name: 'Something Else' },
];

export default function ProgressiveContextFlow() {
  const router = useRouter();
  
  // State
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  
  const [goal, setGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [horizonYears, setHorizonYears] = useState(5); // fallback if no target date
  
  const [amountType, setAmountType] = useState('SIP'); // 'SIP' or 'ONE_TIME'
  const [amount, setAmount] = useState<string>('');
  
  // Specific fields
  const [targetAmount, setTargetAmount] = useState<string>('');
  
  const [loading, setLoading] = useState(false);

  // Progressive Disclosure:
  // Step 1: Goal Selection
  // Step 2: Horizon / Target Date
  // Step 3: Amount
  // Step 4: Illustrative Summary & Submit

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const submitContext = async () => {
     setLoading(true);
     try {
       const token = localStorage.getItem('access_token');
       
       let finalHorizon = horizonYears;
       if (targetDate) {
          const target = new Date(targetDate);
          const diffMs = target.getTime() - Date.now();
          finalHorizon = Math.max(0.5, diffMs / (1000 * 60 * 60 * 24 * 365.25));
       }

       await fetch(`${API_URL}/goals/context`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
         body: JSON.stringify({
            goalName: goal,
            targetDate: targetDate || null,
            horizonYears: finalHorizon,
            frequency: amountType === 'SIP' ? 'Monthly' : 'One-time',
            amount: parseFloat(amount) || 0,
            targetAmount: parseFloat(targetAmount) || 0
         })
       });
       
       router.push(`/buckets?goal=${encodeURIComponent(goal)}&horizon=${Math.round(finalHorizon)}`);
     } catch (e) {
       console.error(e);
       router.push(`/buckets?goal=${encodeURIComponent(goal)}&horizon=${Math.round(horizonYears)}`);
     }
  };

  const calculateIllustrative = () => {
      const p = parseFloat(amount) || 0;
      if (p === 0) return 0;
      const rate = 0.10; // 10% illustrative assumption
      let y = horizonYears;
      if (targetDate) {
         const diff = new Date(targetDate).getTime() - Date.now();
         y = Math.max(0.5, diff / (1000 * 60 * 60 * 24 * 365.25));
      }
      
      if (amountType === 'SIP') {
          // SIP FV
          const months = y * 12;
          const monthlyRate = rate / 12;
          return p * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
      } else {
          // One-time FV
          return p * Math.pow(1 + rate, y);
      }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
       {/* HEADER & PROGRESS */}
       <div className="bg-white px-5 pt-10 pb-4 shadow-sm z-10 sticky top-0">
          <div className="flex justify-between items-center mb-4">
             {step > 1 ? (
                <button onClick={prevStep} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full font-black text-gray-500 hover:bg-gray-200">&larr;</button>
             ) : <div className="w-8" />}
             <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Step {step} of {totalSteps}</span>
             <div className="w-8" />
          </div>
          
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
             <div className="bg-[var(--primary)] h-full transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }} />
          </div>
       </div>

       {/* CONTENT */}
       <div className="flex-1 px-5 py-8 overflow-y-auto pb-32">
          
          {/* STEP 1: GOAL */}
          {step === 1 && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h1 className="text-2xl font-black text-[var(--dark)] uppercase tracking-tight mb-2">What are you investing for?</h1>
                <p className="text-sm font-medium text-gray-500 mb-8">Select a goal to help us structure your investment context.</p>

                <div className="grid grid-cols-2 gap-3">
                  {GOALS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => { setGoal(g.name); nextStep(); }}
                      className={`relative p-5 rounded-2xl border-2 transition-all text-center flex flex-col items-center justify-center ${
                        goal === g.name
                          ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                          : 'border-gray-100 bg-white hover:border-[var(--primary)]/40'
                      }`}
                    >
                      <span className="text-4xl block mb-2">{g.icon}</span>
                      <span className={`text-[11px] font-black uppercase tracking-wide ${goal === g.name ? 'text-[var(--primary)]' : 'text-gray-600'}`}>
                        {g.name}
                      </span>
                    </button>
                  ))}
                </div>
             </div>
          )}

          {/* STEP 2: HORIZON */}
          {step === 2 && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h1 className="text-2xl font-black text-[var(--dark)] uppercase tracking-tight mb-2">Investment Horizon</h1>
                <p className="text-sm font-medium text-gray-500 mb-8">How long do you plan to stay invested for {goal}?</p>

                {goal !== 'Wealth Creation' ? (
                   <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6">
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">What is your target date?</label>
                      <input 
                         type="month" 
                         value={targetDate} 
                         onChange={e => setTargetDate(e.target.value)} 
                         className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold outline-none focus:border-[var(--primary)]" 
                      />
                   </div>
                ) : null}

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                   <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Or select years</label>
                   <div className="grid grid-cols-2 gap-3">
                      {[1, 3, 5, 7, 10, 15].map(y => (
                         <button 
                            key={y}
                            onClick={() => { setHorizonYears(y); setTargetDate(''); nextStep(); }}
                            className={`py-3 rounded-xl border-2 font-bold text-sm ${horizonYears === y && !targetDate ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]' : 'border-gray-100 bg-white text-gray-600 hover:border-gray-300'}`}
                         >
                            {y} Years
                         </button>
                      ))}
                   </div>
                </div>

                {targetDate && (
                    <button onClick={nextStep} className="mt-8 w-full py-4 bg-[var(--primary)] text-white font-black uppercase tracking-widest text-sm rounded-xl shadow-lg">Continue</button>
                )}
             </div>
          )}

          {/* STEP 3: AMOUNT */}
          {step === 3 && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h1 className="text-2xl font-black text-[var(--dark)] uppercase tracking-tight mb-2">Investment Amount</h1>
                <p className="text-sm font-medium text-gray-500 mb-8">How much are you planning to invest?</p>

                <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                   <button onClick={() => setAmountType('SIP')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-lg ${amountType === 'SIP' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-gray-500'}`}>Monthly SIP</button>
                   <button onClick={() => setAmountType('ONE_TIME')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-lg ${amountType === 'ONE_TIME' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-gray-500'}`}>One-Time</button>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6">
                   <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">{amountType === 'SIP' ? 'Monthly Amount (₹)' : 'Investment Amount (₹)'}</label>
                   <input 
                      type="number" 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                      placeholder="e.g. 5000"
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-black outline-none focus:border-[var(--primary)]" 
                   />
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                   <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Amount (Optional)</label>
                   <input 
                      type="number" 
                      value={targetAmount} 
                      onChange={e => setTargetAmount(e.target.value)} 
                      placeholder="e.g. 1000000"
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold outline-none focus:border-[var(--primary)]" 
                   />
                </div>

                <button onClick={nextStep} disabled={!amount} className="mt-8 w-full py-4 bg-[var(--primary)] text-white font-black uppercase tracking-widest text-sm rounded-xl shadow-lg disabled:opacity-50 disabled:shadow-none">Continue</button>
             </div>
          )}

          {/* STEP 4: SUMMARY & PROJECTION */}
          {step === 4 && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h1 className="text-2xl font-black text-[var(--dark)] uppercase tracking-tight mb-2">Review & Explore</h1>
                <p className="text-sm font-medium text-gray-500 mb-8">Ready to explore mutual funds that fit your context.</p>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6 divide-y divide-gray-100">
                   <div className="py-3 flex justify-between items-center">
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Goal</span>
                      <span className="text-sm font-black text-[var(--dark)] uppercase">{goal}</span>
                   </div>
                   <div className="py-3 flex justify-between items-center">
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Horizon</span>
                      <span className="text-sm font-black text-[var(--dark)] uppercase">{targetDate ? targetDate : `${horizonYears} Years`}</span>
                   </div>
                   <div className="py-3 flex justify-between items-center">
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Investment</span>
                      <span className="text-sm font-black text-[var(--dark)] uppercase">₹{amount} {amountType === 'SIP' ? '/mo' : 'One-time'}</span>
                   </div>
                </div>

                {parseFloat(amount) > 0 && (
                   <div className="bg-[var(--primary-light)] p-5 rounded-2xl border border-[var(--primary)]/20 shadow-sm mb-6 text-center">
                      <h4 className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest mb-1">Illustrative Calculation</h4>
                      <p className="text-3xl font-black text-[var(--dark)] mb-2">₹{calculateIllustrative().toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      <p className="text-[10px] text-gray-600 font-medium leading-relaxed max-w-[250px] mx-auto">
                         Illustration based on an assumed annual return of 10%. Actual returns may be higher or lower. This is not guaranteed.
                      </p>
                   </div>
                )}

                <button onClick={submitContext} disabled={loading} className="mt-4 w-full py-4 bg-[var(--primary)] text-white font-black uppercase tracking-widest text-sm rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                   {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                   Explore Mutual Funds &rarr;
                </button>
             </div>
          )}

       </div>
    </div>
  );
}
