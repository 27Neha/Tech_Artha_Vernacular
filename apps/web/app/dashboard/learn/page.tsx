'use client';

const ARTICLES = [
  { icon: '📈', title: 'What is a Mutual Fund?', desc: 'Learn how pooled investments work.', time: '5 min', tag: 'Beginner' },
  { icon: '💡', title: 'SIP vs Lump Sum', desc: 'Which approach suits you better?', time: '4 min', tag: 'Beginner' },
  { icon: '🛡️', title: 'Understanding Risk', desc: 'Assess and manage investment risk.', time: '6 min', tag: 'Intermediate' },
  { icon: '📊', title: 'Reading Fund Performance', desc: 'Understand NAV, returns and more.', time: '7 min', tag: 'Intermediate' },
  { icon: '🏦', title: 'ELSS Tax Saving Funds', desc: 'Save tax while growing wealth with 80C.', time: '5 min', tag: 'Tax' },
  { icon: '🌐', title: 'International Funds', desc: 'Invest in global markets from India.', time: '6 min', tag: 'Advanced' },
];

const TAG_COLORS: Record<string, string> = {
  Beginner: 'bg-green-100 text-green-700',
  Intermediate: 'bg-blue-100 text-blue-700',
  Tax: 'bg-orange-100 text-orange-700',
  Advanced: 'bg-purple-100 text-purple-700',
};

export default function LearnPage() {
  return (
    <div className="p-5">
      <h1 className="text-2xl font-extrabold text-[var(--dark)] mt-2">Learn</h1>
      <p className="text-gray-500 text-sm mt-1">Master personal finance at your own pace.</p>

      <div className="bg-gradient-to-r from-[#3C3985] to-[#5B58A8] rounded-2xl p-5 mt-5 text-white">
        <p className="text-xs opacity-80 font-bold uppercase tracking-wider">Today's Tip</p>
        <p className="font-extrabold text-lg mt-1">Start a SIP as low as ₹500/month</p>
        <p className="text-sm opacity-80 mt-1">Small consistent investments beat large irregular ones every time.</p>
      </div>

      <h2 className="text-lg font-extrabold text-[var(--dark)] mt-6 mb-4">All Articles</h2>
      <div className="flex flex-col gap-3">
        {ARTICLES.map((a) => (
          <div key={a.title} className="card flex items-center gap-4 cursor-pointer hover:border-[var(--primary)] transition-all">
            <span className="text-3xl">{a.icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TAG_COLORS[a.tag]}`}>{a.tag}</span>
              </div>
              <p className="font-bold text-[var(--dark)] text-sm">{a.title}</p>
              <p className="text-gray-400 text-xs mt-0.5">{a.desc}</p>
              <p className="text-[var(--orange)] text-xs font-bold mt-1">{a.time} read</p>
            </div>
            <span className="text-[var(--orange)] text-2xl">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
