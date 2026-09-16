'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function EditProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState("Pending");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.push('/welcome');
          return;
        }

        const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          // Use DB values, fallback to empty string if not found, instead of dummy data
          setName(data.profile?.fullName || data.fpInvestorProfile?.name || '');
          setMobile(data.mobile || '');
          setEmail(data.profile?.email || '');
          setAddress(data.profile?.investorType || '');
          try {
            const kycRes = await fetch(`${API_URL}/kyc/status`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (kycRes.ok) {
              const kycData = await kycRes.json();
              setKycStatus(kycData.status || 'Pending');
            }
          } catch(e) {}
        }
      } catch (e) {
        console.error('Failed to fetch profile', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
      const res = await fetch(`${API_URL}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fullName: name, email, address })
      });

      if (res.ok) {
        // Also update local storage just in case other parts of the app rely on it temporarily
        localStorage.setItem('userName', name);
        localStorage.setItem('mobile', mobile);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userAddress', address);
        
        alert("Profile saved successfully!");
        router.push('/dashboard/profile');
      } else {
        alert("Failed to save profile");
      }
    } catch (e) {
      alert("Error saving profile");
    }
  };

  if (loading) return <div className="p-6 text-center mt-20">Loading profile...</div>;

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

        {kycStatus === 'VERIFIED' ? (
          <div className="bg-green-50 p-4 rounded-xl border border-green-200 mt-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-green-800">KYC Status</p>
              <p className="text-xs text-green-700">Verified</p>
            </div>
            <span className="text-green-600 font-bold bg-green-100 rounded-full w-6 h-6 flex items-center justify-center">✓</span>
          </div>
        ) : (
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mt-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-amber-800">KYC Status</p>
              <p className="text-xs text-amber-700">{kycStatus}</p>
            </div>
            <span className="text-amber-600 font-bold bg-amber-100 rounded-full w-6 h-6 flex items-center justify-center">!</span>
          </div>
        )}
      </div>

      <button className="btn-primary mt-8 mb-6" onClick={handleSave}>
        <span>Save Changes</span>
      </button>
    </div>
  );
}
