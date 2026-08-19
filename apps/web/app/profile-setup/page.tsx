'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../TranslationProvider';

export default function ProfileSetupPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [gender, setGender] = useState<string>('');
  const [category, setCategory] = useState<string>('');

  const handleContinue = () => {
    if (gender && category) {
      localStorage.setItem('user_gender', gender);
      localStorage.setItem('user_category', category);
      
      if (category === 'child') {
        router.push('/parental-approval');
      } else {
        router.push('/risk');
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between py-5 mb-4">
        <button onClick={() => router.back()} className="text-4xl text-[var(--dark)] leading-none">‹</button>
      </div>

      <h1 className="text-3xl font-extrabold text-[var(--dark)] mb-2">{t('profile.title')}</h1>
      <p className="text-gray-500 mb-10">{t('profile.desc')}</p>

      {/* Gender Selection */}
      <h3 className="font-bold text-[var(--dark)] mb-4">{t('profile.gender')}</h3>
      <div className="flex gap-4 mb-8">
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

      {/* Category Selection */}
      <h3 className="font-bold text-[var(--dark)] mb-4">{t('profile.category')}</h3>
      <div className="flex flex-col gap-4 mb-10">
        {[
          { id: 'general', label: t('profile.category.general'), icon: '💼' },
          { id: 'woman', label: t('profile.category.woman'), icon: '👩‍💼' },
          { id: 'child', label: t('profile.category.child'), icon: '🧒' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              category === cat.id 
                ? 'border-[var(--primary)] bg-[var(--primary-light)]' 
                : 'border-gray-100 bg-white hover:border-gray-300'
            }`}
          >
            <span className="text-2xl">{cat.icon}</span>
            <span className={`font-bold ${category === cat.id ? 'text-[var(--primary)]' : 'text-[var(--dark)]'}`}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <button
        onClick={handleContinue}
        disabled={!gender || !category}
        className="btn-primary mt-8"
      >
        <span>{t('profile.continue')}</span>
        <span>→</span>
      </button>
    </div>
  );
}
