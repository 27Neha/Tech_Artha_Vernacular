
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function Guardian() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [relationship, setRel] = useState('FATHER');
  const [mobile, setMobile] = useState('');
  const [pan, setPan] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/api/v1/minor/guardian`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fullName, relationship, mobile: '+91' + mobile, pan })
      });
      await fetch(`${API_URL}/api/v1/minor/guardian/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ mobile: '+91' + mobile })
      });
      localStorage.setItem('guardian_mobile', '+91' + mobile);
      router.push('/onboarding/minor/guardian-verification');
    } catch (e) {
      alert("Error saving guardian details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full mt-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-[var(--dark)] mb-6">Who's joining you on your investment journey?</h2>
      
      <div className="flex flex-col gap-4 flex-1">
        <div>
          <label className="label">Relationship</label>
          <select value={relationship} onChange={e => setRel(e.target.value)} className="input-field bg-white">
            <option value="FATHER">Father</option>
            <option value="MOTHER">Mother</option>
            <option value="LEGAL_GUARDIAN">Court-Appointed Legal Guardian</option>
          </select>
        </div>
        
        <div>
          <label className="label">Guardian's Full Name</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="input-field" placeholder="As per PAN" />
        </div>

        <div>
          <label className="label">Guardian's PAN</label>
          <input type="text" value={pan} onChange={e => setPan(e.target.value.toUpperCase())} className="input-field uppercase" maxLength={10} placeholder="ABCDE1234F" />
        </div>

        <div>
          <label className="label">Guardian's Mobile Number</label>
          <div className="flex bg-white rounded-xl overflow-hidden border border-gray-200 focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <div className="px-4 py-3.5 bg-gray-50 border-r border-gray-200 text-gray-600 font-medium">+91</div>
            <input type="tel" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-3.5 text-[var(--dark)] font-semibold outline-none" placeholder="Enter mobile number" />
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={loading || !fullName || mobile.length !== 10 || pan.length !== 10} className="btn-primary mt-8">
        {loading ? 'Sending OTP...' : 'Continue'}
      </button>
    </div>
  );
}
