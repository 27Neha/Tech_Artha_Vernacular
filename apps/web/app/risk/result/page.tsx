'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scoreParam = searchParams.get('score');
  
  const score = scoreParam ? Number(scoreParam) : 26; // Default to moderate
  
  let label = '';
  let desc = '';
  let rotation = 0;
  
  if (score <= 18) {
    label = 'Conservative';
    desc = 'Low risk, capital preservation is your priority.';
    rotation = -72; // Left side
  } else if (score <= 25) {
    label = 'Moderately Conservative';
    desc = 'Slightly higher risk tolerance but mostly focused on safety.';
    rotation = -36;
  } else if (score <= 31) {
    label = 'Moderate';
    desc = 'Balanced approach between risk and return.';
    rotation = 0; // Center
  } else if (score <= 40) {
    label = 'Moderately Aggressive';
    desc = 'Seeking higher growth with some tolerance for volatility.';
    rotation = 36;
  } else {
    label = 'Aggressive';
    desc = 'High risk tolerance, seeking maximum long-term growth.';
    rotation = 72; // Right side
  }

  // Save the profile to localStorage so the dashboard can access it
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_risk_profile', label);
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="bg-[var(--primary)] text-white px-6 pt-12 pb-24">
        <h1 className="text-2xl font-extrabold text-center mb-2">Your Risk Profile</h1>
        <p className="text-center opacity-80 text-sm">Score: {score}</p>
      </div>

      <div className="flex-1 px-6 -mt-16">
        <div className="card shadow-lg flex flex-col items-center py-8 px-4 bg-white rounded-2xl relative">
          
          <div className="w-64 mb-6">
            <svg viewBox="0 0 200 110" className="w-full h-auto drop-shadow-md">
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#102A54" />
                  <stop offset="25%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#3C3985" />
                  <stop offset="75%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#F7941E" />
                </linearGradient>
              </defs>
              <path 
                d="M 20 100 A 80 80 0 0 1 180 100" 
                fill="none" 
                stroke="url(#gaugeGrad)" 
                strokeWidth="20" 
                strokeLinecap="round" 
              />
              <g transform={`translate(100, 100) rotate(${rotation})`} className="transition-transform duration-1000 ease-out">
                <polygon points="-4,0 4,0 0,-75" fill="#333" />
                <circle cx="0" cy="0" r="8" fill="#333" />
                <circle cx="0" cy="0" r="3" fill="white" />
              </g>
            </svg>
          </div>

          <h2 className="text-2xl font-extrabold text-[var(--dark)] mb-2 text-center">{label}</h2>
          <p className="text-center text-sm text-gray-500 mb-2 px-2 leading-relaxed">
            {desc}
          </p>
        </div>

        <div className="mt-8">
          <button onClick={() => router.push('/goals')} className="btn-primary mb-4 w-full">
            <span>Continue</span><span>→</span>
          </button>

          <button onClick={() => router.push('/risk')} className="btn-outline w-full mb-8">
            Retake Assessment
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RiskResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white"></div>}>
      <ResultContent />
    </Suspense>
  );
}
