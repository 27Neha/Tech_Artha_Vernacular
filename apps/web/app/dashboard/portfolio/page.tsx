'use client';

const HOLDINGS = [
  { name: 'Axis Bluechip Fund', type: 'Large Cap Equity', value: '₹3,420', returns: '+14.2%', positive: true },
  { name: 'HDFC Short Term Debt', type: 'Debt Fund', value: '₹2,100', returns: '+7.1%', positive: true },
  { name: 'Parag Parikh Flexi Cap', type: 'Flexi Cap Equity', value: '₹1,966', returns: '+18.3%', positive: true },
  { name: 'SBI Liquid Fund', type: 'Liquid Fund', value: '₹1,800', returns: '+6.8%', positive: true },
];

export default function PortfolioPage() {
  return (
    <div className="p-5">
      <h1 className="text-2xl font-extrabold text-[var(--dark)] mt-2">My Portfolio</h1>
      <p className="text-gray-500 text-sm mt-1">All your mutual fund holdings in one place.</p>

      {/* Total Value */}
      <div className="bg-[var(--primary)] rounded-3xl p-6 mt-5 text-white">
        <p className="text-[#EBEAF8] text-xs font-bold tracking-widest uppercase">CURRENT VALUE</p>
        <p className="text-4xl font-extrabold mt-2">₹9,286</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="bg-green-400/20 text-green-300 text-xs font-bold px-2 py-1 rounded-lg">↑ +₹1,236 (15.3%)</span>
          <span className="text-[#EBEAF8] text-xs">All time</span>
        </div>
      </div>

      {/* Holdings */}
      <h2 className="text-lg font-extrabold text-[var(--dark)] mt-6 mb-4">Holdings</h2>
      <div className="flex flex-col gap-3">
        {HOLDINGS.map((h) => (
          <div key={h.name} className="card flex items-center justify-between">
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">{h.name}</p>
              <p className="text-gray-400 text-xs mt-0.5">{h.type}</p>
            </div>
            <div className="text-right">
              <p className="font-extrabold text-[var(--dark)]">{h.value}</p>
              <p className={`text-xs font-bold ${h.positive ? 'text-green-600' : 'text-red-500'}`}>{h.returns}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">
        Mutual Fund investments are subject to market risks; read all scheme-related documents carefully before investing.
      </p>
    </div>
  );
}
