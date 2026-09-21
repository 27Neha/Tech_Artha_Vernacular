
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function Consent() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConsent = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/api/v1/minor/guardian/consent`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      router.push('/onboarding/minor/review');
    } catch (e) {
      alert("Error saving consent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full mt-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-[var(--dark)] mb-6">Parent / Guardian Consent</h2>
      
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 text-sm text-gray-700 leading-relaxed max-h-[40vh] overflow-y-auto shadow-inner">
        <p className="mb-4">I confirm that I am the parent or legal guardian of the minor named in this application.</p>
        <p className="mb-4">I authorize the processing of the minor's investment application and related information for the purpose of opening and operating the applicable investment account, subject to the terms and requirements of the relevant investment provider.</p>
        <p className="mb-4">I understand that the investment is made in the minor's name and that I am acting as the authorized parent/legal guardian in accordance with applicable requirements.</p>
        <p>I confirm that the information and documents submitted are accurate.</p>
      </div>

      <label className="flex items-start gap-3 p-4 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
        <div className="pt-0.5">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
        </div>
        <span className="text-sm font-medium text-[var(--dark)]">I have read and agree to the declaration on behalf of the minor.</span>
      </label>

      <button onClick={handleConsent} disabled={loading || !agreed} className="btn-primary mt-auto">
        {loading ? 'Saving...' : 'Accept & Continue'}
      </button>
    </div>
  );
}
