'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../TranslationProvider';

export default function ProfileSetupPage() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [name, setName] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<string>('');

  // Auto-calculate age when DOB changes
  useEffect(() => {
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge >= 0) {
        setAge(calculatedAge);
      }
    }
  }, [dob]);

  const handleContinue = () => {
    if (name && dob && gender && age !== '') {
      localStorage.setItem('user_name', name);
      localStorage.setItem('user_dob', dob);
      localStorage.setItem('user_gender', gender);
      localStorage.setItem('user_age', age.toString());
      
      if (Number(age) < 18) {
        router.push('/parental-approval');
      } else {
        router.push('/risk');
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-6 bg-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between py-5 mb-4">
        
      </div>

      <h1 className="text-3xl font-extrabold text-[var(--dark)] mb-2">Personal Information</h1>
      <p className="text-gray-500 mb-8">{t('profile.desc')}</p>

      {/* Name Input */}
      <h3 className="font-bold text-[var(--dark)] mb-2">Full Name</h3>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-[var(--primary)] outline-none text-[var(--dark)] font-bold text-lg"
        />
      </div>

      {/* Gender Selection */}
      <h3 className="font-bold text-[var(--dark)] mb-2">{t('profile.gender')}</h3>
      <div className="flex gap-4 mb-6">
        {['Female', 'Male', 'Other'].map((g) => (
          <button
            key={g}
            onClick={() => setGender(g)}
            className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${
              gender === g 
                ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]' 
                : 'border-gray-100 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* DOB and Age Input (Side by side) */}
      <div className="flex gap-4 mb-8">
        <div className="flex-1">
          <h3 className="font-bold text-[var(--dark)] mb-2">Date of Birth</h3>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-[var(--primary)] outline-none text-[var(--dark)] font-bold text-base"
          />
        </div>
        <div className="w-24">
          <h3 className="font-bold text-[var(--dark)] mb-2">Age</h3>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
            className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-[var(--primary)] outline-none text-[var(--dark)] font-bold text-base text-center"
            min="1"
            max="120"
          />
        </div>
      </div>

      <div className="flex-1" />

      <button
        onClick={handleContinue}
        disabled={!name || !dob || !gender || age === ''}
        className="btn-primary mt-8"
      >
        <span>{t('profile.continue')}</span>
        <span>→</span>
      </button>
    </div>
  );
}
