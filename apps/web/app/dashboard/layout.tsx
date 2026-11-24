'use client';
import { useRouter, usePathname } from 'next/navigation';

const TABS = [
  { id: 'home', label: 'Home', href: '/dashboard' },
  { id: 'arthaverse', label: 'ArthaVerse', href: '/dashboard/arthaverse' },
  { id: 'portfolio', label: 'Portfolio', href: '/dashboard/portfolio' },
  { id: 'goals', label: 'Goals', href: '/goals' },
  { id: 'profile', label: 'Profile', href: '/dashboard/profile' },
];

function TabIcon({ id, active }: { id: string; active: boolean }) {
  const stroke = active ? '#36358D' : '#64748B';
  const common = {
    width: 19,
    height: 19,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (id === 'home') {
    return (
      <svg {...common}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
      </svg>
    );
  }
  if (id === 'arthaverse') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    );
  }
  if (id === 'portfolio') {
    return (
      <svg {...common}>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M17 7h4v4" />
      </svg>
    );
  }
  if (id === 'goals') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill={stroke} />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const activeTab =
    TABS.find(
      (t) =>
        pathname === t.href ||
        (t.href !== '/dashboard' && pathname.startsWith(t.href)),
    )?.id ?? 'home';

  return (
    <div className="flex flex-col flex-1 w-full">
      <div className="flex-1 w-full">{children}</div>

      <nav className="ta-bottom-dock" aria-label="Primary navigation">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => router.push(tab.href)}
              className={`ta-dock-btn ${isActive ? 'ta-dock-btn-active' : ''}`}
            >
              <TabIcon id={tab.id} active={isActive} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
