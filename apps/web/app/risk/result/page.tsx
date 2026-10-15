'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const RISK_CATEGORIES = [
  { key: 'CONSERVATIVE', label: 'Conservative', color: '#10B981', shortLabel: 'Cons.' },
  { key: 'MODERATELY_LOW', label: 'Moderately Low', color: '#84CC16', shortLabel: 'Mod. Low' },
  { key: 'MODERATE', label: 'Moderate', color: '#EAB308', shortLabel: 'Moderate' },
  { key: 'MODERATELY_HIGH', label: 'Moderately High', color: '#EA580C', shortLabel: 'Mod. High' },
  { key: 'AGGRESSIVE', label: 'Aggressive', color: '#EF4444', shortLabel: 'Aggr.' },
];

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scoreParam = searchParams.get('score');

  const score = scoreParam ? Number(scoreParam) : 36;
  const rawCategory = (searchParams.get('category') || 'MODERATE').toUpperCase().replace(/\s+/g, '_');

  const activeCategory =
    RISK_CATEGORIES.find((c) => c.key === rawCategory) ||
    RISK_CATEGORIES.find((c) => c.key === 'MODERATE')!;

  const label = activeCategory.label;
  const color = activeCategory.color;

  let desc = 'You prefer a balanced approach, seeking growth while taking measured risks to protect your capital.';
  let recommendedSplit = '55% Equity / 45% Debt & Liquid';

  if (rawCategory === 'CONSERVATIVE') {
    desc = 'Low risk, capital preservation is your primary objective with focus on stable debt and money market instruments.';
    recommendedSplit = '20% Equity / 80% Debt & Liquid';
  } else if (rawCategory === 'MODERATELY_LOW') {
    desc = 'Low to moderate risk tolerance, seeking stability with modest capital growth while limiting short-term drawdowns.';
    recommendedSplit = '35% Equity / 65% Debt & Liquid';
  } else if (rawCategory === 'MODERATE') {
    desc = 'Balanced approach between risk and return, comfortable with regular market cycles over a 3–5 year horizon.';
    recommendedSplit = '55% Equity / 45% Debt & Liquid';
  } else if (rawCategory === 'MODERATELY_HIGH') {
    desc = 'Moderate to high risk tolerance, seeking strong long-term wealth appreciation through multi-asset and equity funds.';
    recommendedSplit = '70% Equity / 30% Debt & Liquid';
  } else if (rawCategory === 'AGGRESSIVE') {
    desc = 'High risk tolerance, seeking maximum long-term growth and accepting higher short-term market volatility.';
    recommendedSplit = '85% Equity / 15% Debt & Liquid';
  }

  // Score normalization: 12 to 60 -> -90deg to +90deg
  const safeScore = Math.max(12, Math.min(60, score));
  const progressPercent = (safeScore - 12) / (60 - 12);
  const rotation = -90 + progressPercent * 180;

  if (typeof window !== 'undefined') {
    localStorage.setItem('investorProfile', label);
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB]">
      <div className="bg-[var(--primary)] text-white px-6 pt-10 pb-20 shadow-sm">
        <div className="max-w-xl mx-auto text-center">
          <span className="inline-block px-3 py-1 bg-white/15 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            SEBI Suitability Assessment
          </span>
          <h1 className="text-2xl font-black">Your Risk Profile</h1>
          <p className="opacity-80 text-sm mt-1">Calculated Score: {score} / 60</p>
        </div>
      </div>

      <div className="flex-1 px-4 md:px-6 -mt-12 max-w-xl mx-auto w-full pb-12">
        <div className="card shadow-md flex flex-col items-center py-7 px-5 bg-white rounded-3xl border border-gray-100">
          
          <span className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-2">
            Assessed Investor Category
          </span>

          <div
            className="px-4 py-1.5 rounded-full font-black text-xl mb-4 border"
            style={{ color, backgroundColor: `${color}15`, borderColor: `${color}40` }}
          >
            {label}
          </div>

          {/* 5-tier Riskometer SVG Visualization */}
          <div className="w-full max-w-xs mb-3">
            <svg viewBox="0 0 200 115" className="w-full h-auto drop-shadow-sm">
              <defs>
                <linearGradient id="risk5GradWeb" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="25%" stopColor="#84CC16" />
                  <stop offset="50%" stopColor="#EAB308" />
                  <stop offset="75%" stopColor="#EA580C" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
              </defs>

              {/* Background Arch Track */}
              <path
                d="M 20 105 A 80 80 0 0 1 180 105"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="18"
                strokeLinecap="round"
              />

              {/* 5-tier Gradient Track */}
              <path
                d="M 20 105 A 80 80 0 0 1 180 105"
                fill="none"
                stroke="url(#risk5GradWeb)"
                strokeWidth="18"
                strokeLinecap="round"
              />

              {/* White divider lines between 5 sectors */}
              {[1, 2, 3, 4].map((i) => {
                const angleDeg = 180 - i * 36;
                const rad = (Math.PI / 180) * angleDeg;
                const rInner = 80 - 9;
                const rOuter = 80 + 9;
                const x1 = 100 - rInner * Math.cos(rad);
                const y1 = 105 - rInner * Math.sin(rad);
                const x2 = 100 - rOuter * Math.cos(rad);
                const y2 = 105 - rOuter * Math.sin(rad);
                return (
                  <line
                    key={`line-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                  />
                );
              })}

              {/* Dynamic Pivot and Needle */}
              <g
                transform={`translate(100, 105) rotate(${rotation})`}
                className="transition-transform duration-1000 ease-out"
              >
                <polygon points="-3.5,0 3.5,0 0,-72" fill="#102A54" />
                <circle cx="0" cy="-68" r="3" fill={color} />
                <circle cx="0" cy="0" r="10" fill="#102A54" />
                <circle cx="0" cy="0" r="4" fill="#FFFFFF" />
              </g>
            </svg>

            {/* 5 Category Labels */}
            <div className="flex justify-between items-start mt-2 px-1 gap-1 text-center">
              {RISK_CATEGORIES.map((c) => {
                const isSelected = c.key === rawCategory;
                return (
                  <div key={c.key} className="flex-1 flex flex-col items-center">
                    <span
                      className="w-2 h-2 rounded-full mb-1"
                      style={{ backgroundColor: c.color }}
                    />
                    <span
                      className={`text-[9.5px] leading-tight ${
                        isSelected ? 'font-black text-[#102A54]' : 'font-semibold text-gray-500'
                      }`}
                    >
                      {c.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-center text-sm text-gray-600 mb-6 px-3 leading-relaxed mt-2">
            {desc}
          </p>

          <div className="w-full grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
            <div className="bg-[#F8F9FB] p-3 rounded-xl text-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Your Score
              </span>
              <span className="text-base font-extrabold text-[#102A54]">{score} / 60</span>
            </div>
            <div className="bg-[#F8F9FB] p-3 rounded-xl text-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Recommended Allocation
              </span>
              <span className="text-xs font-extrabold text-[#102A54]">{recommendedSplit}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => router.push('/goals')}
            className="w-full bg-[var(--primary)] hover:bg-[#322f70] text-white py-3.5 px-6 rounded-xl font-extrabold flex justify-between items-center shadow-sm transition-all cursor-pointer"
          >
            <span>Continue to Goal Planner</span>
            <span>→</span>
          </button>

          <button
            onClick={() => router.push('/risk')}
            className="w-full bg-white hover:bg-gray-50 text-[var(--primary)] border border-gray-200 py-3 rounded-xl font-bold transition-all text-sm cursor-pointer"
          >
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
