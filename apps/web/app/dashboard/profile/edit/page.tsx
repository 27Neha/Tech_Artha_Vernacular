'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function EditProfilePage() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  
  useEffect(() => {
    setMobile(localStorage.getItem('mobile') || '');
  }, []);

  return (
    <div className="flex flex-col min-h-screen p-6 bg-white">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-3xl leading-none opacity-80">‹</button>
        <h1 className="text-2xl font-extrabold text-[var(--dark)]">Edit Profile</h1>
      </div>

      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] text-4xl font-bold mb-4">
          P
        </div>
        <button className="text-sm font-bold text-[var(--primary)] border border-[var(--primary)] px-4 py-1.5 rounded-full">
          Change Avatar
        </button>
      </div>

      <div className="flex-1">
        <label className="label mt-0">Full Name (as per PAN)</label>
        <input type="text" defaultValue="Neha A" className="input-field mb-4" disabled />
        <p className="text-xs text-gray-400 mt-[-10px] mb-4">Name is locked after KYC verification.</p>

        <label className="label mt-0">Mobile Number</label>
        <input type="tel" value={mobile} className="input-field mb-4" disabled />

        <label className="label mt-0">Email Address</label>
        <input type="email" placeholder="Enter your email" className="input-field mb-4" />

        <label className="label mt-0">Communication Address</label>
        <textarea rows={3} placeholder="Enter your full address" className="input-field mb-4" />

        <div className="bg-green-50 p-4 rounded-xl border border-green-200 mt-6 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-green-800">KYC Status</p>
            <p className="text-xs text-green-700">Verified via Hyperverge</p>
          </div>
          <span className="text-green-600 font-bold">✓</span>
        </div>
      </div>

      <button className="btn-primary mt-8 mb-6" onClick={() => router.back()}>
        <span>Save Changes</span><span>→</span>
      </button>
    </div>
  );
}
