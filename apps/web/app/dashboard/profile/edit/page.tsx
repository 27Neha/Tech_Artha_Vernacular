'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function EditProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  
  useEffect(() => {
    setName(localStorage.getItem('userName') || 'Priya Sharma');
    setMobile(localStorage.getItem('mobile') || '+91 98765 43210');
    setEmail(localStorage.getItem('userEmail') || '');
    setAddress(localStorage.getItem('userAddress') || '');
  }, []);

  const handleSave = () => {
    localStorage.setItem('userName', name);
    localStorage.setItem('mobile', mobile);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userAddress', address);
    
    alert("Profile saved successfully!");
    router.push('/dashboard/profile');
  };

  return (
    <div className="flex flex-col min-h-screen p-6 bg-white pb-32">
      <h1 className="text-2xl font-extrabold text-[var(--dark)] mb-6">Edit Profile</h1>

      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] text-4xl font-bold mb-4">
          {name ? name.charAt(0).toUpperCase() : 'P'}
        </div>
        <button className="text-sm font-bold text-[var(--primary)] border border-[var(--primary)] px-4 py-1.5 rounded-full hover:bg-[var(--primary-light)] transition-all">
          Change Avatar
        </button>
      </div>

      <div className="flex-1">
        <label className="label mt-0">Full Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field mb-4" />

        <label className="label mt-0">Mobile Number</label>
        <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} className="input-field mb-4" />

        <label className="label mt-0">Email Address</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="input-field mb-4" />

        <label className="label mt-0">Communication Address</label>
        <textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter your full address" className="input-field mb-4" />

        <div className="bg-green-50 p-4 rounded-xl border border-green-200 mt-6 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-green-800">KYC Status</p>
            <p className="text-xs text-green-700">Verified via Hyperverge</p>
          </div>
          <span className="text-green-600 font-bold bg-green-100 rounded-full w-6 h-6 flex items-center justify-center">✓</span>
        </div>
      </div>

      <button className="btn-primary mt-8 mb-6" onClick={handleSave}>
        <span>Save Changes</span>
      </button>
    </div>
  );
}
