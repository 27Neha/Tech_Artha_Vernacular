'use client';
import { useState } from 'react';

export default function CybrillaSandboxPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

  // Investor Profile State
  const [profileData, setProfileData] = useState({
    type: "individual",
    tax_status: "resident_individual",
    name: "TechArtha Sandbox Test",
    date_of_birth: "1990-01-01",
    gender: "male",
    occupation: "business",
    pan: "ABCPX3751X"
  });
  const [profileResult, setProfileResult] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Bank Account State
  const [bankData, setBankData] = useState({
    profile: "",
    account_number: "98123459204",
    type: "savings",
    ifsc_code: "HDFC0001330",
    primary_account_holder_name: "TechArtha Sandbox Test"
  });
  const [bankResult, setBankResult] = useState<any>(null);
  const [bankLoading, setBankLoading] = useState(false);

  const handleCreateProfile = async () => {
    setProfileLoading(true);
    setProfileResult(null);
    try {
      const res = await fetch(`${API_URL}/cybrilla/sandbox/investor-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      setProfileResult({ status: res.status, data });
      if (res.ok && data?.data?.id) {
        setBankData(prev => ({ ...prev, profile: data.data.id }));
      }
    } catch (e: any) {
      setProfileResult({ error: e.message });
    }
    setProfileLoading(false);
  };

  const handleCreateBank = async () => {
    setBankLoading(true);
    setBankResult(null);
    try {
      const res = await fetch(`${API_URL}/cybrilla/sandbox/bank-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankData)
      });
      const data = await res.json();
      setBankResult({ status: res.status, data });
    } catch (e: any) {
      setBankResult({ error: e.message });
    }
    setBankLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cybrilla Sandbox Testing</h1>
          <p className="mt-2 text-sm text-gray-600">
            Development-only interface for testing Cybrilla API integration manually.
            These requests bypass the local database and do NOT consume production credentials.
          </p>
        </div>

        {/* Investor Profile Section */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">1. Create Investor Profile</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">PAN</label>
              <input type="text" className="w-full border rounded p-2" value={profileData.pan} onChange={e => setProfileData({...profileData, pan: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input type="text" className="w-full border rounded p-2" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <input type="text" className="w-full border rounded p-2" value={profileData.type} onChange={e => setProfileData({...profileData, type: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tax Status</label>
              <input type="text" className="w-full border rounded p-2" value={profileData.tax_status} onChange={e => setProfileData({...profileData, tax_status: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth</label>
              <input type="text" className="w-full border rounded p-2" value={profileData.date_of_birth} onChange={e => setProfileData({...profileData, date_of_birth: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gender</label>
              <input type="text" className="w-full border rounded p-2" value={profileData.gender} onChange={e => setProfileData({...profileData, gender: e.target.value})} />
            </div>
          </div>

          <button onClick={handleCreateProfile} disabled={profileLoading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {profileLoading ? 'Sending...' : 'Create Investor Profile'}
          </button>

          {profileResult && (
            <div className="mt-4 p-4 bg-gray-100 rounded overflow-auto text-sm font-mono">
              <strong>Status: {profileResult.status}</strong>
              <pre className="mt-2">{JSON.stringify(profileResult.data, null, 2)}</pre>
            </div>
          )}
        </section>

        {/* Bank Account Section */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">2. Create Bank Account</h2>
          <p className="text-sm text-gray-500 mb-4">You need an Investor Profile ID to link this bank account.</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Investor Profile ID (invp_...)</label>
              <input type="text" className="w-full border rounded p-2 bg-yellow-50" placeholder="invp_xxxxxxxxxxxx" value={bankData.profile} onChange={e => setBankData({...bankData, profile: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account Number</label>
              <input type="text" className="w-full border rounded p-2" value={bankData.account_number} onChange={e => setBankData({...bankData, account_number: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">IFSC Code</label>
              <input type="text" className="w-full border rounded p-2" value={bankData.ifsc_code} onChange={e => setBankData({...bankData, ifsc_code: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account Type</label>
              <input type="text" className="w-full border rounded p-2" value={bankData.type} onChange={e => setBankData({...bankData, type: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Primary Account Holder Name</label>
              <input type="text" className="w-full border rounded p-2" value={bankData.primary_account_holder_name} onChange={e => setBankData({...bankData, primary_account_holder_name: e.target.value})} />
            </div>
          </div>

          <button onClick={handleCreateBank} disabled={bankLoading || !bankData.profile} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
            {bankLoading ? 'Sending...' : 'Create Bank Account'}
          </button>

          {bankResult && (
            <div className="mt-4 p-4 bg-gray-100 rounded overflow-auto text-sm font-mono">
              <strong>Status: {bankResult.status}</strong>
              <pre className="mt-2">{JSON.stringify(bankResult.data, null, 2)}</pre>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
