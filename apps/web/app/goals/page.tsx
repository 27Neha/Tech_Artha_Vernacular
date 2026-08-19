'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const GOALS = [
  { id: 'education', icon: '🎓', name: 'Child Education' },
  { id: 'marriage', icon: '💒', name: 'Marriage' },
  { id: 'home', icon: '🏠', name: 'Home' },
  { id: 'retirement', icon: '🌴', name: 'Retirement' },
  { id: 'vehicle', icon: '🚗', name: 'Vehicle' },
  { id: 'emergency', icon: '🛡️', name: 'Emergency Fund' },
  { id: 'wealth', icon: '📈', name: 'Wealth Creation' },
  { id: 'custom', icon: '🎯', name: 'Custom Goal' },
];

export default function GoalsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-[var(--primary)] text-white px-6 pt-12 pb-10">
        <button onClick={() => router.back()} className="text-3xl mb-4 opacity-80">‹</button>
        <h1 className="text-2xl font-extrabold">What's your financial goal?</h1>
        <p className="text-white/80 text-sm mt-2">We'll recommend the best funds tailored to your goal.</p>
      </div>

      <div className="flex-1 p-5 -mt-4">
        <div className="grid grid-cols-2 gap-3">
          {GOALS.map((goal) => (
            <button
              key={goal.id}
              onClick={() => setSelected(goal.id)}
              className={`relative p-5 rounded-2xl border-2 transition-all text-center ${
                selected === goal.id
                  ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                  : 'border-gray-200 bg-white hover:border-[var(--primary)]/40'
              }`}
            >
              {selected === goal.id && (
                <div className="absolute top-2 left-2 w-5 h-5 bg-[var(--primary)] rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
              <span className="text-4xl block mb-2">{goal.icon}</span>
              <span className={`text-sm font-bold ${selected === goal.id ? 'text-[var(--primary)]' : 'text-[var(--dark)]'}`}>
                {goal.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 bg-white border-t border-gray-100">
        <button
          onClick={() => selected && router.push(`/buckets?goal=${selected}`)}
          disabled={!selected}
          className="btn-primary"
        >
          <span>Choose Investment Plan</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
