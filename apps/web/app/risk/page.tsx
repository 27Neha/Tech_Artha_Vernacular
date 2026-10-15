'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface QuestionOption {
  label: string;
  score: number;
}

interface Question {
  id: string | number;
  question: string;
  options: QuestionOption[];
}

const FALLBACK_QUESTIONS: Question[] = [
  {
    id: 1,
    question: "Current market value of net worth (Assets - Liabilities)",
    options: [
      { label: "Negative/0", score: 1 },
      { label: "< 10L", score: 2 },
      { label: "10L-50L", score: 3 },
      { label: "> 50L", score: 4 },
      { label: "> 1Cr", score: 5 },
    ],
  },
  {
    id: 2,
    question: "How familiar are you with financial markets?",
    options: [
      { label: "Not at all", score: 1 },
      { label: "Somewhat", score: 2 },
      { label: "Good", score: 3 },
      { label: "Very familiar", score: 4 },
      { label: "Expert", score: 5 },
    ],
  },
  {
    id: 3,
    question: "Describe your risk range (losses vs profits)",
    options: [
      { label: "Hate losses", score: 1 },
      { label: "Accept small losses for small gains", score: 2 },
      { label: "Accept moderate", score: 3 },
      { label: "Accept high for high gains", score: 4 },
      { label: "Maximum risk", score: 5 },
    ],
  },
  {
    id: 4,
    question: "Reaction if portfolio drops 20%",
    options: [
      { label: "Sell all", score: 1 },
      { label: "Sell some", score: 2 },
      { label: "Do nothing", score: 3 },
      { label: "Buy more", score: 4 },
      { label: "Buy aggressively", score: 5 },
    ],
  },
  {
    id: 5,
    question: "Desired balance (Volatility vs Returns)",
    options: [
      { label: "100% stable", score: 1 },
      { label: "Mostly stable", score: 2 },
      { label: "Balanced", score: 3 },
      { label: "Mostly volatile", score: 4 },
      { label: "100% volatile", score: 5 },
    ],
  },
  {
    id: 6,
    question: "Current and future income stability",
    options: [
      { label: "Very unstable", score: 1 },
      { label: "Unstable", score: 2 },
      { label: "Stable", score: 3 },
      { label: "Very stable", score: 4 },
      { label: "Guaranteed", score: 5 },
    ],
  },
  {
    id: 7,
    question: "Preferred investment objective",
    options: [
      { label: "Preserve capital", score: 1 },
      { label: "Regular income", score: 2 },
      { label: "Balanced growth", score: 3 },
      { label: "High growth", score: 4 },
      { label: "Maximum speculation", score: 5 },
    ],
  },
  {
    id: 8,
    question: "Years away is your nearest goal?",
    options: [
      { label: "< 1 yr", score: 1 },
      { label: "1-3 yrs", score: 2 },
      { label: "3-5 yrs", score: 3 },
      { label: "5-10 yrs", score: 4 },
      { label: "> 10 yrs", score: 5 },
    ],
  },
  {
    id: 9,
    question: "How long will you hold a poorly performing portfolio?",
    options: [
      { label: "< 3 months", score: 1 },
      { label: "3-6 months", score: 2 },
      { label: "6-12 months", score: 3 },
      { label: "1-3 years", score: 4 },
      { label: "> 3 years", score: 5 },
    ],
  },
  {
    id: 10,
    question: "Percentage of net worth you plan to invest",
    options: [
      { label: "< 10%", score: 1 },
      { label: "10-25%", score: 2 },
      { label: "25-50%", score: 3 },
      { label: "50-75%", score: 4 },
      { label: "> 75%", score: 5 },
    ],
  },
  {
    id: 11,
    question: "Ability to save money consistently",
    options: [
      { label: "Very poor", score: 1 },
      { label: "Poor", score: 2 },
      { label: "Average", score: 3 },
      { label: "Good", score: 4 },
      { label: "Excellent", score: 5 },
    ],
  },
  {
    id: 12,
    question: "What is your overall attitude towards the stock market?",
    options: [
      { label: "It is a casino, highly dangerous", score: 1 },
      { label: "A place for experts only", score: 2 },
      { label: "A good place to invest, with some caution", score: 3 },
      { label: "An excellent wealth-building opportunity", score: 4 },
      { label: "The only place to beat inflation and maximize returns", score: 5 },
    ],
  }
];

export default function RiskPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(FALLBACK_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<{ questionIndex: number; selectedScore: number; selectedLabel: string }[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/risk/questionnaire`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.questions?.length) return;
        setQuestions(
          data.questions.map((q: any) => ({
            id: q.id,
            question: q.prompt,
            options: q.options,
          }))
        );
      })
      .catch(() => {
        // Fallback to FALLBACK_QUESTIONS
      });
    return () => {
      active = false;
    };
  }, [API_URL]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, currentIndex, isBotTyping]);

  const handleSelectOption = async (score: number, label: string) => {
    if (isBotTyping || loading) return;

    const answeredItem = {
      questionIndex: currentIndex,
      selectedScore: score,
      selectedLabel: label,
    };

    const newHistory = [...history, answeredItem];
    setHistory(newHistory);

    if (currentIndex < questions.length - 1) {
      setIsBotTyping(true);
      setTimeout(() => {
        setIsBotTyping(false);
        setCurrentIndex((prev) => prev + 1);
      }, 500);
    } else {
      setLoading(true);
      try {
        const token = localStorage.getItem('access_token');
        const answersPayload = Object.fromEntries(
          newHistory.map((item) => [questions[item.questionIndex]?.id ?? item.questionIndex, item.selectedScore])
        );

        const res = await fetch(`${API_URL}/risk/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ answers: answersPayload, consent: true }),
        });

        if (!res.ok) {
          throw new Error('Failed to calculate risk profile');
        }

        const data = await res.json();
        const cat = data?.data?.category || 'MODERATE';
        const finalScore = data?.data?.score || newHistory.reduce((acc, h) => acc + h.selectedScore, 0);

        const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
        localStorage.setItem('investorProfile', formattedCat);

        router.push(`/risk/result?category=${cat}&score=${finalScore}`);
      } catch (err) {
        console.error('Failed to save risk profile to backend', err);
        alert('Failed to calculate risk profile. Please try again.');
        setLoading(false);
      }
    }
  };

  const handleGoBackToQuestion = (targetIndex: number) => {
    if (isBotTyping || loading) return;
    const updatedHistory = history.slice(0, targetIndex);
    setHistory(updatedHistory);
    setCurrentIndex(targetIndex);
  };

  const currentQ = questions[currentIndex];
  const progressPercent = questions.length
    ? Math.min(100, Math.round((history.length / questions.length) * 100))
    : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-white">
        <div className="w-16 h-16 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
        <p className="text-[var(--primary)] font-bold text-lg">TechArtha Bot is analyzing your risk profile...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="bg-[var(--primary)] text-white px-6 py-4 shadow-sm shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white text-[var(--primary)] flex items-center justify-center font-bold shadow-sm">
                🤖
              </div>
              <div>
                <h1 className="text-base font-extrabold flex items-center gap-2">
                  TechArtha Risk Profiler
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                </h1>
                <p className="text-xs text-white/70">SEBI-Compliant Conversational Profiling</p>
              </div>
            </div>
            <div className="bg-white/20 text-xs font-bold px-3 py-1.5 rounded-full">
              Question {Math.min(questions.length, history.length + 1)} of {questions.length}
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[var(--orange)] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {/* Welcome greeting */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-sm font-bold shrink-0 mt-1">
              🤖
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-sm shadow-sm max-w-lg">
              <p className="text-sm font-semibold text-[#102A54] leading-relaxed">
                👋 Welcome! I will guide you through 12 quick questions to understand your investment goals, horizon, and risk tolerance so we can tailor the ideal portfolio.
              </p>
            </div>
          </div>

          {/* Historical answered turns */}
          {history.map((item, idx) => {
            const qItem = questions[item.questionIndex];
            return (
              <div key={`turn-${idx}`} className="flex flex-col gap-3">
                {/* Bot question */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-sm font-bold shrink-0 mt-1">
                    🤖
                  </div>
                  <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-sm shadow-sm max-w-lg">
                    <span className="text-[11px] font-extrabold text-[var(--orange)] uppercase tracking-wide block mb-1">
                      Question {item.questionIndex + 1} of {questions.length}
                    </span>
                    <p className="text-base font-bold text-[#102A54] leading-snug">{qItem?.question}</p>
                  </div>
                </div>

                {/* User answer bubble with user emoji and Edit Answer button */}
                <div className="flex items-start justify-end gap-3">
                  <div className="flex flex-col items-end">
                    <div className="bg-white border border-gray-300 px-5 pt-3 pb-3 pr-9 rounded-2xl rounded-tr-sm shadow-sm max-w-md relative group min-w-[140px]">
                      <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wide block text-right mb-0.5">
                        You
                      </span>
                      <p className="text-sm font-bold text-[#0F172A] leading-snug">{item.selectedLabel}</p>

                      {/* Professional Edit Icon button positioned at bottom-right of answer box */}
                      <button
                        type="button"
                        onClick={() => handleGoBackToQuestion(item.questionIndex)}
                        title="Edit answer"
                        aria-label="Edit answer"
                        className="absolute right-1.5 bottom-1.5 w-5 h-5 rounded-full bg-[#F0EFFB] hover:bg-[#E0DEFA] border border-[#D4D2F5] text-[#3C3985] flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                      >
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 text-gray-700 flex items-center justify-center text-sm font-bold shrink-0 mt-1 shadow-sm">
                    👤
                  </div>
                </div>
              </div>
            );
          })}

          {/* Current active question */}
          {currentQ && history.length < questions.length && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-sm font-bold shrink-0 mt-1">
                  🤖
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-sm shadow-sm max-w-lg">
                  <span className="text-[11px] font-extrabold text-[var(--orange)] uppercase tracking-wide block mb-1">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <p className="text-base font-bold text-[#102A54] leading-snug">{currentQ.question}</p>
                </div>
              </div>

              {/* Tappable Choice Cards */}
              {!isBotTyping && (
                <div className="ml-11 flex flex-col gap-2.5 max-w-md">
                  <div className="mb-1">
                    <span className="text-xs text-gray-500 font-bold">Choose an answer below:</span>
                  </div>
                  {currentQ.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectOption(opt.score, opt.label)}
                      disabled={isBotTyping || loading}
                      className="flex items-center gap-3.5 bg-white border border-gray-200 hover:border-[var(--primary)] hover:bg-[#F0EFFF] text-left p-3.5 rounded-xl transition-all shadow-sm group cursor-pointer"
                    >
                      <span className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-[var(--primary)] group-hover:text-white text-[var(--primary)] flex items-center justify-center text-xs font-extrabold shrink-0 transition-all">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-sm font-semibold text-[#102A54] group-hover:text-[var(--primary)] transition-all">
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bot Typing Indicator */}
          {isBotTyping && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-sm font-bold shrink-0 mt-1">
                🤖
              </div>
              <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-xs text-gray-500 font-medium ml-2">TechArtha Bot is preparing the next question...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>
      </div>
    </div>
  );
}