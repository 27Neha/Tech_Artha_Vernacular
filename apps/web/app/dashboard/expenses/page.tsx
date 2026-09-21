'use client';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function ExpensesPage() {
  const { t } = useTranslation('common');
  const router = useRouter();

  return (
    <div className="p-5">
      <h1 className="text-2xl font-extrabold text-[var(--dark)] mt-2">{t('exp.title')}</h1>
      <p className="text-gray-500 text-sm mt-1">{t('exp.desc')}</p>

      <div className="bg-white rounded-2xl p-8 mt-5 shadow-sm border border-gray-100 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-2xl mb-4">🏦</div>
        <h3 className="font-extrabold text-[var(--dark)] mb-2">{t('exp.noBank')}</h3>
        <p className="text-gray-400 text-xs max-w-[250px] mb-6"> {t('exp.noBankDesc')} </p>
        <button 
          onClick={() => router.push('/dashboard/profile?expand=Bank Accounts')} 
          className="text-xs font-bold text-[var(--primary)] border border-dashed border-[var(--primary)] bg-[var(--primary-light)] px-4 py-2 rounded-lg"
        >
          + Link Bank Account
        </button>
      </div>
    </div>
  );
}
