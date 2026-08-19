'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const CHILD_QUESTIONS = [
  {
    id: 1,
    question: "When you get pocket money or a gift, what do you usually do with it?",
    options: [
      { label: "Spend it all right away on things I want", score: 1 },
      { label: "Spend most of it, but save a little bit", score: 2 },
      { label: "Save half and spend half", score: 3 },
      { label: "Save most or all of it for something big later", score: 4 },
    ],
  },
  {
    id: 2,
    question: "Imagine you have a magic plant that gives you 1 fruit today, but if you wait a week, it might give you 5 fruits—or it might give you none. What would you do?",
    options: [
      { label: "Take the 1 fruit today, just to be safe", score: 1 },
      { label: "Wait a day or two and see what happens", score: 2 },
      { label: "Wait the whole week, I'm okay with the risk", score: 3 },
      { label: "Wait the whole week, I really want the 5 fruits!", score: 4 },
    ],
  }
];

const WOMAN_QUESTIONS = [
  {
    id: 1,
    question: 'What is your primary financial goal?',
    options: [
      { label: 'Building an emergency safety net', score: 1 },
      { label: 'Saving for family or children’s education', score: 2 },
      { label: 'Achieving independent financial security', score: 3 },
      { label: 'Maximising long-term wealth and investments', score: 4 },
    ],
  },
  {
    id: 2,
    question: 'If your investment value dropped by 20%, what would you do?',
    options: [
      { label: 'Sell immediately to prevent further loss', score: 1 },
      { label: 'Wait it out, but feel very anxious', score: 2 },
      { label: 'Hold steady, knowing markets recover', score: 3 },
      { label: 'Buy more while prices are low', score: 4 },
    ],
  },
];

const GENERAL_QUESTIONS = [
  {
    id: 1,
    question: 'What is your main goal for investing?',
    options: [
      { label: 'Protect my money from inflation', score: 1 },
      { label: 'Save for a specific goal (home, education)', score: 2 },
      { label: 'Grow wealth steadily over time', score: 3 },
      { label: 'Maximise long-term returns', score: 4 },
    ],
  },
  {
    id: 2,
    question: 'How would you react if your investment fell 20% in value?',
    options: [
      { label: 'I would sell everything immediately', score: 1 },
      { label: 'I would be worried but wait', score: 2 },
      { label: 'I would stay calm and hold', score: 3 },
      { label: 'I would invest more at lower prices', score: 4 },
    ],
  },
  {
    id: 3,
    question: 'How long can you stay invested without needing the money?',
    options: [
      { label: 'Less than 1 year', score: 1 },
      { label: '1–3 years', score: 2 },
      { label: '3–5 years', score: 3 },
      { label: 'More than 5 years', score: 4 },
    ],
  },
  {
    id: 4,
    question: 'What percentage of your income can you invest monthly?',
    options: [
      { label: 'Less than 5%', score: 1 },
      { label: '5–10%', score: 2 },
      { label: '10–20%', score: 3 },
      { label: 'More than 20%', score: 4 },
    ],
  },
  {
    id: 5,
    question: 'Which investment type are you most comfortable with?',
    options: [
      { label: 'Fixed Deposits only', score: 1 },
      { label: 'Mix of FD and Mutual Funds', score: 2 },
      { label: 'Mostly Mutual Funds', score: 3 },
      { label: 'Equity/Stocks and MF', score: 4 },
    ],
  },
];

export default function RiskPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      const cat = localStorage.getItem('user_category');
      if (cat === 'child') {
        setQuestions(CHILD_QUESTIONS);
        setLoading(false);
      } else {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/risk/questionnaire`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          // Transform backend questions to match UI schema
          const mapped = data.questions.map((q: any) => ({
            id: q.id,
            question: q.prompt,
            options: q.options
          }));
          setQuestions(mapped);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchQuestions();
  }, []);

  const q = questions[current];

  const handleSelect = async (score: number) => {
    const newAnswers = [...answers, score];
    setAnswers(newAnswers);

    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      // Submit
      setLoading(true);
      const cat = localStorage.getItem('user_category');
      try {
        const userId = localStorage.getItem('user_id');
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/risk/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ userId, answers: newAnswers, consent: true }),
        });
        const data = await res.json();
        const category = data?.data?.category ?? 'MODERATE';
        localStorage.setItem('risk_category', category);
        
        router.push('/risk/result');
      } catch (e) {
        console.error(e);
        router.push('/risk/result');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-16 h-16 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
        <p className="text-[var(--primary)] font-bold text-lg">Calculating your risk profile...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-[var(--primary)] text-white px-6 pt-12 pb-8">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => router.back()} className="text-3xl leading-none opacity-80">‹</button>
          <div className="flex-1 flex justify-between items-center">
            <h1 className="text-lg font-bold">Risk Assessment</h1>
            <span className="text-sm opacity-80">Q{current + 1} of {questions.length}</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className="bg-[var(--orange)] h-2 rounded-full transition-all duration-500"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
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
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleSelect(opt.score)}
              className="flex items-center gap-4 p-5 bg-white rounded-2xl border-2 border-gray-200 hover:border-[var(--primary)] hover:bg-[var(--primary-light)] transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-[var(--primary)] flex items-center justify-center font-bold text-gray-500 group-hover:text-white transition-all flex-shrink-0">
                {String.fromCharCode(65 + i)}
              </div>
              <span className="text-[var(--dark)] font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
