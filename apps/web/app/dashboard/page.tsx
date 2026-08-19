'use client';
import { useRouter } from 'next/navigation';

const LEARN_CARDS = [
  { icon: '📈', title: 'What is a Mutual Fund?', desc: 'Learn how pooled investments work and why they are great for beginners.', time: '5 min read' },
  { icon: '💡', title: 'SIP vs Lump Sum', desc: 'Which investment approach suits your financial situation better?', time: '4 min read' },
  { icon: '🛡️', title: 'Understanding Risk', desc: 'Learn how to assess and manage investment risk for your goals.', time: '6 min read' },
  { icon: '📊', title: 'Reading Fund Performance', desc: 'Understand NAV, returns, and how to compare mutual funds.', time: '7 min read' },
];

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="p-5">
      {/* Greeting */}
      <p className="text-[var(--orange)] text-xs font-extrabold tracking-widest uppercase mt-2">GOOD MORNING ☀️</p>
      <h1 className="text-3xl font-extrabold text-[var(--dark)] mt-1">Your Portfolio</h1>
      <p className="text-gray-500 text-sm mt-1">Stay on track with your financial goals.</p>

      {/* Balance Card */}
      <div className="bg-[var(--primary)] rounded-3xl p-6 mt-5 text-white">
        <p className="text-[#EBEAF8] text-xs font-bold tracking-widest uppercase">TOTAL INVESTED</p>
        <p className="text-5xl font-extrabold mt-2">₹9,286</p>
        <p className="text-[#EBEAF8] text-sm mt-1">This month's SIP · Next: 10th Sep</p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => router.push('/funds')}
            className="bg-white text-[var(--primary)] font-bold text-sm px-5 py-2.5 rounded-xl"
          >
            Browse Funds
          </button>
          <button className="bg-white/20 text-white font-bold text-sm px-5 py-2.5 rounded-xl">
            View Details
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="card text-center">
          <p className="text-2xl font-extrabold text-[var(--primary)]">12.4%</p>
          <p className="text-xs text-gray-400 mt-1 font-semibold">Annualised Returns</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-extrabold text-[var(--orange)]">8 yrs</p>
          <p className="text-xs text-gray-400 mt-1 font-semibold">Goal Horizon</p>
        </div>
      </div>

      {/* Safety Banner */}
      <div className="bg-[var(--primary-light)] rounded-2xl p-4 mt-5">
        <p className="text-[var(--primary)] font-bold text-sm">🔒 Your investments are safe</p>
        <p className="text-gray-500 text-xs mt-1 leading-relaxed">
          All funds are held in your name with CAMS/Karvy as registrar. TechArtha never holds your money.
        </p>
      </div>

      {/* Learn Section */}
      <h2 className="text-xl font-extrabold text-[var(--dark)] mt-7 mb-4">Learn & Grow</h2>
      <div className="flex flex-col gap-3">
        {LEARN_CARDS.map((c) => (
          <div key={c.title} className="card flex items-center gap-4 cursor-pointer hover:border-[var(--primary)] hover:border transition-all">
            <span className="text-3xl">{c.icon}</span>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">{c.title}</p>
              <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{c.desc}</p>
              <p className="text-[var(--orange)] text-xs font-bold mt-1">{c.time}</p>
            </div>
            <span className="text-[var(--orange)] text-2xl">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
