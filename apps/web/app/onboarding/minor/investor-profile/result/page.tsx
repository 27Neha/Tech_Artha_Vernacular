'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function AnimatedCounter({ value, duration = 1000 }: { value: number, duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;

    let totalMilSecDur = duration;
    let incrementTime = (totalMilSecDur / end) * 1.5;

    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
}

function Shape3D({ risk, time }: { risk: number, time: number }) {
  const rotateX = 20 + (risk / 100) * 40;
  const rotateY = -30 + (time / 100) * 60;
  
  return (
    <div className="w-40 h-40 mx-auto relative perspective-1000 mb-8 mt-4 group">
      <div 
        className="w-full h-full absolute transition-all duration-[2000ms] ease-out transform-style-3d group-hover:rotate-y-180"
        style={{ transform: 'rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)' }}
      >
        <div className="absolute inset-0 border-[4px] border-[var(--primary)] rounded-3xl opacity-20 translate-z-[-20px]" />
        <div className="absolute inset-4 border-[3px] border-[#E87731] rounded-2xl opacity-40 translate-z-[0px]" />
        <div className="absolute inset-8 bg-gradient-to-tr from-[var(--primary)] to-blue-400 rounded-xl opacity-80 translate-z-[20px] shadow-[0_0_30px_rgba(22,83,176,0.5)]" />
        <div className="absolute inset-10 bg-white/20 backdrop-blur-md rounded-lg translate-z-[40px]" />
      </div>
    </div>
  );
}

export default function ProfileResult() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [animateIn, setAnimateIn] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const token = localStorage.getItem('access_token');
      const res = await fetch(API_URL + '/api/v1/minor/onboarding/status', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const json = await res.json();
      setData(json.profileResult);
      setTimeout(() => setAnimateIn(true), 150);
    };
    fetchStatus();
  }, []);

  if (!data) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#fafafa]">
         <div className="w-8 h-8 border-4 border-gray-200 border-t-[var(--primary)] rounded-full animate-spin" />
      </div>
    );
  }

  const insights = data.strengths ? JSON.parse(data.strengths) : [];

  return (
    <div className={'flex flex-col min-h-full bg-[#fafafa] transition-opacity duration-[1000ms] ' + (animateIn ? 'opacity-100' : 'opacity-0')}>
      
      <div className="px-6 pt-10 pb-4 text-center">
        <p className="text-[#1653B0] font-bold text-xs tracking-wider uppercase mb-8">Your Investor Profile ✦</p>
        
        <Shape3D risk={data.riskToleranceScore} time={data.timeHorizonScore} />

        <h1 className="text-4xl font-extrabold text-[var(--dark)] mb-3 tracking-tight">
          {data.profileTitle}
        </h1>
        <p className="text-[var(--primary)] font-semibold text-lg mb-4">
          {data.profileTagline}
        </p>
        <p className="text-gray-500 font-medium max-w-[280px] mx-auto text-sm italic">
          "Your answers tell an interesting story about how you view your future."
        </p>
      </div>

      <div className="px-6 py-8">
        <h3 className="text-xs font-bold text-gray-400 tracking-[0.2em] mb-6 uppercase">Your Profile DNA</h3>
        <div className="space-y-5">
          <DnaRow label="Risk Comfort" value={data.riskToleranceScore} color="bg-blue-500" />
          <DnaRow label="Time Horizon" value={data.timeHorizonScore} color="bg-indigo-500" />
          <DnaRow label="Knowledge" value={data.knowledgeScore} color="bg-orange-400" />
          <DnaRow label="Financial Habits" value={data.financialHabitScore} color="bg-emerald-500" />
        </div>
      </div>

      <div className="px-6 py-8 bg-white my-4 border-y border-gray-100">
        <h3 className="text-xs font-bold text-gray-400 tracking-[0.2em] mb-6 uppercase">Comfort with Ups &amp; Downs</h3>
        
        <div className="relative h-1 bg-gray-100 rounded-full my-8">
          <div className="absolute top-[-4px] bottom-[-4px] w-[2px] bg-gray-300 left-1/2 -translate-x-1/2" />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[var(--primary)] rounded-full shadow-md transition-all duration-1000 ease-out"
            style={{ left: Math.max(5, Math.min(95, data.riskToleranceScore)) + '%' }}
          />
        </div>
        
        <div className="flex justify-between text-[10px] font-bold text-gray-400 tracking-wider">
          <span>CALMER</span>
          <span>MORE FLUCTUATION</span>
        </div>
        
        <div className="text-center mt-6">
          <span className="text-3xl font-extrabold text-[var(--dark)]"><AnimatedCounter value={data.riskToleranceScore} /></span>
          <span className="text-gray-400 font-bold ml-1">/ 100</span>
          <p className="text-xs font-medium text-gray-500 mt-2">
            Your answers suggest a {data.riskToleranceScore > 60 ? 'higher' : data.riskToleranceScore < 40 ? 'lower' : 'moderate'} comfort level with temporary changes in value.
          </p>
        </div>
      </div>

      <div className="px-6 py-8">
        <h3 className="text-xs font-bold text-gray-400 tracking-[0.2em] mb-6 uppercase">What Your Answers Tell Us</h3>
        <div className="grid gap-4">
          {insights.map((insight: any, i: number) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <h4 className="font-bold text-[var(--dark)] mb-1">{insight.title}</h4>
              <p className="text-sm font-medium text-gray-500 leading-relaxed">{insight.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-4">
        <button 
          onClick={() => setShowWhy(!showWhy)}
          className="w-full bg-blue-50/50 border border-blue-100 p-5 rounded-2xl flex justify-between items-center text-left"
        >
          <span className="font-bold text-[var(--primary)] text-sm">Why did I get this profile?</span>
          <span className="text-[var(--primary)] font-bold text-xl leading-none">{showWhy ? '−' : '+'}</span>
        </button>
        
        {showWhy && (
          <div className="mt-3 p-5 text-sm font-medium text-gray-600 bg-white rounded-2xl border border-gray-100 animate-[fadeIn_0.3s_ease-out]">
            Your profile is mathematically calculated based on four dimensions: your time horizon, reaction to temporary losses, growth preference, and financial habits. 
            <br/><br/>
            {data.profileConsistency === 'MIXED' && (
              <span className="text-[#E87731] font-bold block mb-2">ONE THING TO THINK ABOUT:</span>
            )}
            {data.profileConsistency === 'MIXED' ? 
              "Your answers show some differing directions between your risk comfort and your time horizon. Understanding how short-term goals differ from long-term investing can help." :
              "Your goal, time horizon, and comfort with fluctuations point in a relatively consistent direction, forming a solid foundation for learning."
            }
          </div>
        )}
      </div>

      <div className="px-6 py-10 bg-white mt-4 border-t border-gray-100">
        <h3 className="text-xs font-bold text-gray-400 tracking-[0.2em] mb-8 uppercase">What's Next? 🚀</h3>
        
        <div className="relative border-l-2 border-blue-50 ml-3 space-y-8 pb-8">
          
          <div className="relative pl-6">
            <div className="absolute left-[-9px] top-1 w-4 h-4 bg-white border-2 border-[var(--primary)] rounded-full" />
            <h4 className="font-bold text-[var(--dark)] text-sm mb-1">Define your goal</h4>
            <p className="text-xs font-medium text-gray-500">Turn your {data.goalType.toLowerCase()} goal into a clear target.</p>
          </div>
          
          <div className="relative pl-6">
            <div className="absolute left-[-9px] top-1 w-4 h-4 bg-white border-2 border-[var(--primary)] rounded-full" />
            <h4 className="font-bold text-[var(--dark)] text-sm mb-1">Learn the basics</h4>
            <p className="text-xs font-medium text-gray-500">Understand SIPs, risk, and time horizon before investing.</p>
          </div>

          <div className="relative pl-6">
            <div className="absolute left-[-9px] top-1 w-4 h-4 bg-white border-2 border-[var(--primary)] rounded-full" />
            <h4 className="font-bold text-[var(--dark)] text-sm mb-1">Bring your guardian</h4>
            <p className="text-xs font-medium text-gray-500">Because you're under 18, a parent/legal guardian needs to verify this account.</p>
          </div>

        </div>

        <button 
          onClick={() => router.push('/onboarding/minor/guardian')} 
          className="w-full bg-[var(--primary)] text-white py-4 rounded-2xl font-bold text-lg shadow-[0_8px_20px_rgba(22,83,176,0.15)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200"
        >
          Continue with Guardian
        </button>
        <p className="text-[10px] text-gray-400 text-center mt-4 px-4 font-medium leading-relaxed">
          This profile reflects your answers and preferences. It does not guarantee returns or determine the performance of any investment product.
        </p>
      </div>
    </div>
  );
}

function DnaRow({ label, value, color }: { label: string, value: number, color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs font-bold text-[var(--dark)]">{label}</span>
        <span className="text-xs font-extrabold text-gray-400"><AnimatedCounter value={value} duration={800} /></span>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={'h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] ' + color} 
          style={{ width: w + '%' }} 
        />
      </div>
    </div>
  );
}
