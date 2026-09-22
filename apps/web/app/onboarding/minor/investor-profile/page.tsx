'use client';
import { useState, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const QUESTIONS = [
  {
    q: "What is the biggest reason you want to start investing?",
    desc: "Your goal gives your journey a direction.",
    opts: [{ t: "Education" }, { t: "Laptop / Technology" }, { t: "Travel & Experiences" }, { t: "Future Business / Career" }, { t: "Build Long-Term Wealth" }, { t: "Something Else" }],
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--primary)] opacity-40"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
    )
  },
  {
    q: "When do you think you'll actually need this money?",
    desc: "Nice. Your journey has a destination.",
    opts: [{ t: "Within 1 year" }, { t: "1–3 years" }, { t: "3–5 years" }, { t: "5–10 years" }, { t: "10+ years" }],
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#E87731] opacity-40"><path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
    )
  },
  {
    q: "You invested ₹10,000. A few months later it's worth ₹8,000. What would you most likely do?",
    desc: "Understanding how you react to temporary drops.",
    opts: [{ t: "I'd want to withdraw" }, { t: "I'd wait and see" }, { t: "I'd stay invested" }, { t: "I'd consider investing more" }],
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--primary)] opacity-40"><path fill="currentColor" d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
    )
  },
  {
    q: "Which sounds more comfortable to you?",
    desc: "You're shaping your path.",
    opts: [{ t: "More stability, even if growth may be slower" }, { t: "A balance between stability and growth" }, { t: "More growth potential, even with bigger ups and downs" }],
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--primary)] opacity-40"><path fill="currentColor" d="M12 2L2 22h20L12 2zm0 3.8l7.2 14.2H4.8L12 5.8z"/></svg>
    )
  },
  {
    q: "How familiar are you with investing?",
    desc: "We'll tailor things to your experience.",
    opts: [{ t: "I'm completely new" }, { t: "I've heard about SIPs and mutual funds" }, { t: "I understand the basics" }, { t: "I've already explored investing quite a bit" }],
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#E87731] opacity-40"><path fill="currentColor" d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>
    )
  },
  {
    q: "When you receive money, what do you usually do?",
    desc: "Building habits for the future.",
    opts: [{ t: "Spend most of it" }, { t: "Spend some and save some" }, { t: "Mostly save it" }, { t: "Save first and decide where to put the rest" }],
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--primary)] opacity-40"><path fill="currentColor" d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V6h16v12zm-8-2.5c1.93 0 3.5-1.57 3.5-3.5S13.93 8.5 12 8.5 8.5 10.07 8.5 12 10.07 15.5 12 15.5zm0-5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/></svg>
    )
  },
  {
    q: "Imagine you don't need your investment right now, but it takes years to grow. What sounds most like you?",
    desc: "Patience pays off.",
    opts: [{ t: "I prefer seeing results sooner" }, { t: "I'm okay waiting a few years" }, { t: "I'm comfortable waiting 5+ years" }, { t: "I'm thinking about my future self" }],
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#E87731] opacity-40"><path fill="currentColor" d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm1-11v5h-2v-5H8l4-4 4 4h-3z"/></svg>
    )
  },
  {
    q: "Investments can move up and down. Which statement sounds most like you?",
    desc: "Comfort with movement.",
    opts: [{ t: "I prefer avoiding big ups and downs" }, { t: "Some movement is okay" }, { t: "I'm comfortable with bigger fluctuations for a long-term goal" }],
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--primary)] opacity-40"><path fill="currentColor" d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>
    )
  },
  {
    q: "If you had to choose, which matters more?",
    desc: "Protecting vs growing.",
    opts: [{ t: "Protecting my money" }, { t: "Balancing safety and growth" }, { t: "Growing my money over the long term" }],
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#E87731] opacity-40"><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
    )
  },
  {
    q: "You have a long-term goal 8 years away. Your investment temporarily falls by 15%. What feels right?",
    desc: "Your final scenario.",
    opts: [{ t: "I'd rather move to something safer" }, { t: "I'd wait and understand what's happening" }, { t: "I'd stay invested because my goal is still years away" }, { t: "I'd be comfortable continuing my plan" }],
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--primary)] opacity-40"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14L7 12h3V8h4v4h3l-5 5z"/></svg>
    )
  }
];

function AssessmentForm() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQIndex = parseInt(searchParams.get('step') || '0');
  
  const [answers, setAnswers] = useState<any[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMilestone, setIsMilestone] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // When step changes (e.g. user hits back button), reset transition states
  useEffect(() => {
    setIsTransitioning(false);
    setSelectedIdx(answers[currentQIndex]?.pts ?? null);
  }, [currentQIndex, answers]);

  const handleSelect = (opt: any, idx: number) => {
    if (isTransitioning) return;
    
    setSelectedIdx(idx);
    
    const newAnswers = [...answers];
    newAnswers[currentQIndex] = { t: opt.t, pts: idx };
    setAnswers(newAnswers);

    // 1. Brief pause to show the beautiful selected state
    setTimeout(() => {
      // If we just finished Q5, show the milestone
      if (currentQIndex === 4) {
        setIsMilestone(true);
        setTimeout(() => {
          setIsMilestone(false);
          setIsTransitioning(true);
          setTimeout(() => advance(newAnswers), 350);
        }, 1200);
      } else {
        setIsTransitioning(true);
        setTimeout(() => advance(newAnswers), 350); // slide out duration
      }
    }, 450); // read duration
  };

  const advance = async (currentAnswers: any[]) => {
    if (currentQIndex < QUESTIONS.length - 1) {
      router.push(`/onboarding/minor/investor-profile?step=${currentQIndex + 1}`, { scroll: false });
    } else {
      try {
        const token = localStorage.getItem('access_token');
        await fetch(`${API_URL}/api/v1/minor/risk-assessment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ answers: currentAnswers })
        });
        router.push('/onboarding/minor/investor-profile/result');
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Milestone Screen Overlay
  if (isMilestone) {
    return (
      <div className="flex flex-col items-center justify-center h-full animate-[fadeIn_0.3s_ease-out]">
        <h2 className="text-4xl font-extrabold text-[var(--primary)] mb-2">5 / 10</h2>
        <p className="text-lg text-gray-500 font-semibold">{t('minor.halfway')}</p>
        <div className="w-16 h-1 mt-6 bg-gray-200 rounded-full overflow-hidden">
          <div className="w-1/2 h-full bg-[var(--primary)] animate-[slideRight_0.6s_ease-out_forwards]" />
        </div>
      </div>
    );
  }

  const q = QUESTIONS[currentQIndex];
  if (!q) return null;

  const displayNum = (currentQIndex + 1).toString().padStart(2, '0');

  return (
    <div className={`flex flex-col h-full w-full max-w-xl mx-auto transition-all duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${isTransitioning ? 'opacity-0 -translate-x-4' : 'opacity-100 translate-x-0'}`}>
      
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="text-gray-400 font-bold text-sm tracking-[0.2em] mb-4">
            {displayNum} / {QUESTIONS.length}
          </div>
          <h2 className="text-[28px] md:text-[32px] font-extrabold text-[var(--dark)] leading-[1.3] tracking-tight pr-4">
            {q.q}
          </h2>
          {q.desc && (
            <p className="text-gray-500 font-medium mt-4 text-[15px] animate-fade-in">
              {q.desc}
            </p>
          )}
        </div>
        <div className="shrink-0 mt-2">
          {q.icon}
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full mt-auto">
        {q.opts.map((opt, i) => {
          const isSelected = selectedIdx === i;
          const isOtherSelected = selectedIdx !== null && selectedIdx !== i;
          
          return (
            <button 
              key={i}
              onClick={() => handleSelect(opt, i)}
              className={`relative text-left w-full px-5 py-4 rounded-xl transition-all duration-300 ease-out overflow-hidden
                ${selectedIdx === null ? 'hover:-translate-y-[2px] active:translate-y-0 active:scale-[0.99] border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]' : ''}
                ${isSelected 
                  ? 'border-transparent bg-white shadow-[0_8px_20px_rgba(22,83,176,0.1)] scale-[1.01] ring-2 ring-[var(--primary)]' 
                  : 'border-transparent bg-white shadow-sm border border-gray-100 text-[var(--dark)]'}
                ${isOtherSelected ? 'opacity-50 grayscale-[20%]' : 'opacity-100'}
              `}
            >
              {/* Subtle background gradient on selected */}
              {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent" />}
              
              <div className="flex items-center justify-between relative z-10">
                <span className={`font-semibold text-[15px] ${isSelected ? 'text-[var(--primary)]' : 'text-gray-700'}`}>
                  {opt.t}
                </span>
                
                {/* Tiny refined accent instead of a checkmark or radio dot */}
                {isSelected && (
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100/50">
                    <div className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_rgba(22,83,176,0.5)] animate-[popIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)]" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.4); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideRight {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}} />
    </div>
  );
}

export default function InvestorProfile() {
  const { t } = useTranslation('common');
  return (
    <div className="flex flex-col h-full bg-[#fafafa] relative overflow-hidden px-4 pt-8 pb-8">
      <Suspense fallback={<div className="animate-pulse flex-1 bg-gray-100 rounded-2xl m-4" />}>
        <AssessmentForm />
      </Suspense>
    </div>
  );
}
