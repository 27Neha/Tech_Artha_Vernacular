'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const QUESTIONS = [
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
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const q = QUESTIONS[current];
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

  // When returning to a previous question, pre-select the answer
  useEffect(() => {
    if (answers[current] !== undefined) {
      setSelectedScore(answers[current]);
    } else {
      setSelectedScore(null);
    }
  }, [current, answers]);

  const handleNext = async () => {
    if (selectedScore === null) return;
    
    const newAnswers = [...answers.slice(0, current), selectedScore];
    setAnswers(newAnswers);

    if (current < QUESTIONS.length - 1) {
      setCurrent(current + 1);
    } else {
      setLoading(true);
      
      const totalScore = newAnswers.reduce((a, b) => a + b, 0);

      try {
        const token = localStorage.getItem('access_token');
        await fetch(`${API_URL}/risk/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ answers: newAnswers, consent: true })
        });
      } catch (err) {
        console.error('Failed to save risk profile to backend', err);
      }
      
      router.push(`/risk/result?score=${totalScore}`);
    }
  };

  const handlePrevious = () => {
    if (current > 0) {
      setCurrent(current - 1);
    }
  };

  const handleSaveAndExit = () => {
    // Just exit to dashboard for now
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-white">
        <div className="w-16 h-16 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
        <p className="text-[var(--primary)] font-bold text-lg">Calculating your risk profile...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header - Removed custom back button to fix double arrow issue */}
      <div className="bg-[var(--primary)] text-white px-6 pt-12 pb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 flex justify-between items-center">
            <h1 className="text-lg font-bold">Risk Assessment</h1>
            <span className="text-sm opacity-80">Q{current + 1} of {QUESTIONS.length}</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className="bg-[var(--orange)] h-2 rounded-full transition-all duration-500"
            style={{ width: `${((current + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="inline-block bg-[var(--primary-light)] text-[var(--primary)] text-sm font-bold px-4 py-2 rounded-full mb-4">
          Question {current + 1}
        </div>
        <h2 className="text-2xl font-extrabold text-[var(--dark)] leading-tight mb-8">
          {q.question}
        </h2>

        <div className="flex flex-col gap-4">
          {q.options.map((opt, i) => {
            const isSelected = selectedScore === opt.score;
            return (
              <button
                key={i}
                onClick={() => setSelectedScore(opt.score)}
                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                  isSelected 
                    ? 'border-[var(--primary)] bg-[var(--primary-light)]' 
                    : 'border-gray-200 bg-white hover:border-[var(--primary)]'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold transition-all flex-shrink-0 ${
                  isSelected 
                    ? 'bg-[var(--primary)] text-white' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {String.fromCharCode(65 + i)}
                </div>
                <span className={`font-medium ${isSelected ? 'text-[var(--primary)] font-bold' : 'text-[var(--dark)]'}`}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Actions - Normal Flow */}
      <div className="p-6 pt-2 flex flex-col gap-3 mt-auto">
        <div className="flex gap-3">
          {current > 0 && (
            <button 
              onClick={handlePrevious}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl"
            >
              Back
            </button>
          )}
          <button 
            onClick={handleNext}
            disabled={selectedScore === null}
            className={`flex-1 py-3 font-bold rounded-xl transition-all ${
              selectedScore !== null 
                ? 'bg-[var(--primary)] text-white hover:opacity-90' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {current === QUESTIONS.length - 1 ? 'Finish & Save' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}