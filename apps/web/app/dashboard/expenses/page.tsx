'use client';
import { useRouter } from 'next/navigation';
import { isExpenseManagementEnabled, isBankLinkingEnabled } from '../../../lib/feature-flags';

export default function ExpensesPage() {
  const router = useRouter();
  const expenseEnabled = isExpenseManagementEnabled();
  const bankEnabled = isBankLinkingEnabled();

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mt-2 mb-1">
        <h1 className="text-2xl font-black text-[var(--dark)]">Expense Management</h1>
        <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          In Preparation
        </span>
      </div>
      <p className="text-gray-500 text-xs mb-6">
        Automated bank statement tracking & smart spending insights.
      </p>

      {/* Honest In-Preparation Banner */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center justify-center text-3xl mb-5 text-[#3C3985]">
          🏛️
        </div>

        <h3 className="text-lg font-black text-[var(--dark)] mb-2">
          RBI Account Aggregator Integration
        </h3>

        <p className="text-gray-500 text-xs leading-relaxed max-w-[280px] mb-6">
          To ensure complete bank-grade security and prevent manual record-keeping, TechArtha is integrating with RBI-licensed Account Aggregators (AA).
        </p>

        <div className="w-full bg-gray-50 rounded-2xl p-4 text-left border border-gray-100 mb-6 flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5">
            <span className="text-green-600 font-bold text-xs">✓</span>
            <p className="text-[11px] text-gray-700">
              <strong>100% Consent-Driven:</strong> Read-only access authorized strictly via OTP.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-green-600 font-bold text-xs">✓</span>
            <p className="text-[11px] text-gray-700">
              <strong>Zero Fake Data:</strong> We will never show simulated transactions or mock balances.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-amber-600 font-bold text-xs">⏳</span>
            <p className="text-[11px] text-gray-700">
              <strong>Launch Schedule:</strong> Feature activates immediately following production gateway approvals.
            </p>
          </div>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/portfolio')}
            className="w-full py-3.5 bg-[#3C3985] text-white rounded-xl text-xs font-bold hover:bg-[#322f73] transition-colors"
          >
            Explore Goals & Portfolio →
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
