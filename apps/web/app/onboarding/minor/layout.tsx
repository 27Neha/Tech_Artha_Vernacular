
'use client';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function MinorLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const pathname = usePathname();
  
  const steps = [
    { name: 'You', path: '/onboarding/minor/welcome' },
    { name: 'Profile', path: '/onboarding/minor/investor-profile' },
    { name: 'Guardian', path: '/onboarding/minor/guardian' },
    { name: 'Consent', path: '/onboarding/minor/consent' },
    { name: 'Setup', path: '/onboarding/minor/review' }
  ];

  const currentIndex = steps.findIndex(s => pathname?.includes(s.path));

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-6 px-6 pb-2">
        <div className="flex justify-between items-center mb-6">
          <div></div>
          <p className="text-sm font-semibold text-[var(--dark)]">TechArtha</p>
          <div className="w-8"></div>
        </div>

        {/* Stepper */}
        {currentIndex >= 0 && (
          <div className="flex items-center justify-between gap-1 w-full mt-4">
            {steps.map((step, idx) => (
              <div key={step.name} className="flex-1 flex flex-col gap-2">
                <div className={`h-1.5 w-full rounded-full transition-all ${idx <= currentIndex ? 'bg-[var(--primary)]' : 'bg-gray-100'}`} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 px-6 pb-8 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
