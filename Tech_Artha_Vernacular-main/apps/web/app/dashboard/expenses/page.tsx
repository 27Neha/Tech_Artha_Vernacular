'use client';

const CATEGORIES = [
  { icon: '🍔', name: 'Food & Dining', amount: '₹4,200', pct: 35 },
  { icon: '🚗', name: 'Transport', amount: '₹1,800', pct: 15 },
  { icon: '🛒', name: 'Groceries', amount: '₹3,100', pct: 26 },
  { icon: '💡', name: 'Utilities', amount: '₹1,200', pct: 10 },
  { icon: '🎬', name: 'Entertainment', amount: '₹900', pct: 7.5 },
  { icon: '📦', name: 'Others', amount: '₹800', pct: 6.5 },
];

export default function ExpensesPage() {
  return (
    <div className="p-5">
      <h1 className="text-2xl font-extrabold text-[var(--dark)] mt-2">Expenses</h1>
      <p className="text-gray-500 text-sm mt-1">Track your monthly spending.</p>

      <div className="bg-white rounded-2xl p-5 mt-5 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-400 uppercase font-bold">August 2026</p>
        <p className="text-4xl font-extrabold text-[var(--dark)] mt-1">₹12,000</p>
        <div className="flex gap-2 mt-2">
          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-lg">↓ 8% vs last month</span>
        </div>
      </div>

      <h2 className="text-lg font-extrabold text-[var(--dark)] mt-6 mb-4">By Category</h2>
      <div className="flex flex-col gap-3">
        {CATEGORIES.map((c) => (
          <div key={c.name} className="card">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{c.icon}</span>
                <span className="font-semibold text-[var(--dark)]">{c.name}</span>
              </div>
              <span className="font-extrabold text-[var(--dark)]">{c.amount}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-[var(--primary)] h-1.5 rounded-full" style={{ width: `${c.pct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">{c.pct}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
