'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WelcomeMinor() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = () => {
    if (isStarting) return;
    setIsStarting(true);
    setTimeout(() => {
      // Use query param for step to fix the navigation history issue
      router.push('/onboarding/minor/investor-profile?step=0');
    }, 800);
  };

  return (
    <div className={`flex flex-col h-full bg-[#fafafa] relative overflow-hidden transition-opacity duration-300 ${isStarting ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex flex-col h-full justify-between relative z-10 px-6 pt-12 pb-8 max-w-xl mx-auto w-full">
        <div>
          <p className="text-[#1653B0] font-bold text-xs tracking-wider uppercase mb-3">Your Investor Profile ✦</p>
          <h1 className="text-4xl font-extrabold text-[var(--dark)] tracking-tight leading-[1.2] mb-4">
            Your financial<br/>journey starts here.
          </h1>
          <p className="text-gray-500 font-medium text-sm leading-relaxed max-w-[280px]">
            10 quick questions to understand your goals, experience and how comfortable you are with investment ups and downs.
          </p>
        </div>

        {/* The Premium 2.5D Visual Metaphor */}
        <div className="flex-1 flex items-center justify-center my-6 relative">
          <svg 
            viewBox="0 0 400 300" 
            className={`w-full max-w-sm mx-auto transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] 
              ${isStarting ? 'scale-[1.3] translate-y-12 opacity-0' : 'scale-100 translate-y-0 opacity-100'}`}
          >
            {/* Distant Future Goals (Abstract Geometry) */}
            <g transform="translate(280, 80)" opacity="0.6">
               <rect x="0" y="0" width="24" height="32" rx="4" fill="rgba(22, 83, 176, 0.05)" />
               <rect x="-10" y="10" width="20" height="22" rx="4" fill="rgba(232, 119, 49, 0.08)" />
               <circle cx="30" cy="-10" r="12" fill="rgba(22, 83, 176, 0.08)" />
            </g>

            {/* The Path to the Future */}
            <path 
              d="M 100 220 C 180 220, 220 160, 280 100" 
              fill="none" 
              stroke="url(#pathGrad)" 
              strokeWidth="8" 
              strokeLinecap="round" 
              className="transition-all duration-1000"
            />
            
            {/* Start Node */}
            <ellipse cx="100" cy="220" rx="30" ry="12" fill="rgba(22, 83, 176, 0.08)" />
            <ellipse cx="100" cy="220" rx="15" ry="6" fill="rgba(22, 83, 176, 0.15)" />

            {/* The Young Character / Journey Marker */}
            <g className={`transition-transform duration-[800ms] ease-in-out ${isStarting ? 'translate-x-[60px] -translate-y-[45px]' : 'translate-x-0 translate-y-0'}`}>
              {/* Shadow */}
              <ellipse cx="100" cy="220" rx="10" ry="4" fill="rgba(0,0,0,0.1)" />
              {/* Abstract Body */}
              <path d="M 92 216 L 95 190 Q 100 185 105 190 L 108 216 Z" fill="url(#charGrad)" />
              {/* Head / Glowing Orb */}
              <circle cx="100" cy="182" r="7" fill="#E87731" />
              {/* Subtle ambient pulse */}
              <circle cx="100" cy="182" r="7" fill="none" stroke="#E87731" strokeWidth="2" className="animate-[ping_3s_ease-in-out_infinite] opacity-30" />
            </g>

            {/* Starting animation particles */}
            {isStarting && (
              <g>
                <circle cx="100" cy="200" r="2" fill="#1653B0" className="animate-[flyOut_0.6s_ease-out_forwards] delay-100" />
                <circle cx="110" cy="190" r="3" fill="#E87731" className="animate-[flyOut_0.7s_ease-out_forwards]" />
              </g>
            )}

            <defs>
              <linearGradient id="pathGrad" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(22, 83, 176, 0.2)" />
                <stop offset="100%" stopColor="rgba(22, 83, 176, 0.05)" />
              </linearGradient>
              <linearGradient id="charGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1653B0" />
                <stop offset="100%" stopColor="#2a75e6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="flex flex-col mt-auto pt-4">
          {/* Subtle Info Chips */}
          <div className="flex justify-center gap-2 mb-6">
            <span className="bg-white/80 border border-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm">10 questions</span>
            <span className="bg-white/80 border border-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm">~2 min</span>
            <span className="bg-white/80 border border-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm">Your Profile</span>
          </div>

          <button 
            onClick={handleStart}
            disabled={isStarting}
            className="w-full bg-[var(--primary)] text-white py-4 rounded-2xl font-bold text-lg shadow-[0_8px_20px_rgba(22,83,176,0.15)] hover:-translate-y-0.5 hover:shadow-[0_12px_25px_rgba(22,83,176,0.2)] active:translate-y-0 active:scale-[0.99] transition-all duration-300 relative overflow-hidden group">
            <span className="relative z-10">Start My Journey →</span>
          </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes flyOut {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(30px, -20px) scale(0); opacity: 0; }
        }
      `}} />
    </div>
  );
}
