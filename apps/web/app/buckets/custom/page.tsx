'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomBucketPage() {
  const router = useRouter();
  
    const [funds, setFunds] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('customBucketFunds');
    if (saved) {
      try {
        setFunds(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const sum = funds.reduce((acc, fund) => acc + (Number(fund.percentage) || 0), 0);
    setTotal(sum);
    // save back to localStorage
    if (funds.length > 0) {
      localStorage.setItem('customBucketFunds', JSON.stringify(funds));
    } else {
      localStorage.removeItem('customBucketFunds');
    }
  }, [funds]);

  const handlePercentageChange = (id: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setFunds(funds.map(f => f.id === id ? { ...f, percentage: numValue } : f));
  };

  const removeFund = (id: string) => {
    setFunds(funds.filter(f => f.id !== id));
  };

  const isTotalValid = total === 100;

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB]">
      <div className="p-4 bg-[var(--primary)] shadow-md z-10 relative flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <h2 className="text-white font-extrabold text-lg">Custom Bucket Builder</h2>
      </div>

      <div className="flex-1 p-5">
        <p className="text-sm text-gray-500 mb-4 font-semibold">Adjust your allocations. The total must equal 100%.</p>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
            <span className="font-bold text-[var(--dark)]">Total Allocation</span>
            <span className={`text-lg font-extrabold ${isTotalValid ? 'text-green-500' : 'text-red-500'}`}>
              {total}%
            </span>
          </div>
          
          {!isTotalValid && (
            <p className="text-red-500 text-xs font-bold mb-4 bg-red-50 p-2 rounded-md">
              ⚠ Total allocation must be exactly 100%
            </p>
          )}

          <div className="flex flex-col gap-4">
            {funds.map((fund) => (
              <div key={fund.id} className="flex items-center justify-between gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[var(--dark)] text-sm truncate">{fund.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fund.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={fund.percentage}
                    onChange={(e) => handlePercentageChange(fund.id, e.target.value)}
                    className="w-16 p-2 rounded border border-gray-200 text-center font-bold focus:outline-none focus:border-[var(--primary)]"
                  />
                  <span className="text-gray-500 font-bold">%</span>
                  <button onClick={() => removeFund(fund.id)} className="text-red-400 ml-2 text-lg hover:text-red-600">×</button>
                </div>
              </div>
            ))}
          </div>

          {funds.length === 0 && (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm font-bold">No funds added yet</p>
            </div>
          )}
          
          <button 
            onClick={() => router.push('/funds')} 
            className="w-full mt-4 py-3 bg-white border border-dashed border-[var(--primary)] text-[var(--primary)] rounded-lg font-bold text-sm"
          >
            + Add More Funds
          </button>
        </div>
      </div>

      <div className="mt-auto p-5 bg-white border-t border-gray-100">
        <button 
          disabled={!isTotalValid || funds.length === 0}
          className={`w-full py-3.5 rounded-xl font-extrabold text-white transition-opacity ${isTotalValid && funds.length > 0 ? 'bg-[var(--primary)]' : 'bg-gray-300 cursor-not-allowed'}`}
          onClick={() => {
            alert('Bucket Saved successfully!');
            router.push('/dashboard/portfolio');
          }}
        >
          Save Custom Bucket
        </button>
      </div>
    </div>
  );
}
