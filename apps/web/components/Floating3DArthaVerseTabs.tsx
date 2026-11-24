'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export type ArthaVerseTabId = 'markets' | 'studio' | 'intelligence' | 'play' | 'academy';

interface Floating3DArthaVerseTabsProps {
  activeTab?: string;
  onSelectSection?: (tab: ArthaVerseTabId) => void;
  showHeading?: boolean;
}

interface CardSpec {
  id: ArthaVerseTabId;
  title: string;
  subtitle: string;
  badge: string;
  accent: string;
  href: string;
  delaySec: number;
}

const ARTHAVERSE_CARDS: CardSpec[] = [
  {
    id: 'markets',
    title: 'Market Pulse',
    subtitle: 'NIFTY 50, SENSEX & sector movers',
    badge: 'LIVE',
    accent: '#F7941D',
    href: '/dashboard/arthaverse?tab=markets',
    delaySec: 0,
  },
  {
    id: 'studio',
    title: 'Fund Studio',
    subtitle: '8 neutral SEBI fund collections',
    badge: '8 CORE',
    accent: '#A78BFA',
    href: '/dashboard/arthaverse?tab=studio',
    delaySec: 0.35,
  },
  {
    id: 'intelligence',
    title: 'Fund Intelligence',
    subtitle: 'Interactive NAV charts & metrics',
    badge: 'ANALYTICS',
    accent: '#34D399',
    href: '/funds',
    delaySec: 0.7,
  },
  {
    id: 'play',
    title: 'ArthaPlay',
    subtitle: 'SIP studio & daily checkpoints',
    badge: 'STUDIO',
    accent: '#FBBF24',
    href: '/dashboard/arthaverse?tab=play',
    delaySec: 1.05,
  },
  {
    id: 'academy',
    title: 'Artha Academy',
    subtitle: 'Visual lessons & SEBI portals',
    badge: 'LEARN',
    accent: '#60A5FA',
    href: '/dashboard/arthaverse?tab=academy',
    delaySec: 1.4,
  },
];

function CardIcon({ id }: { id: ArthaVerseTabId }) {
  const props = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: '#FFFFFF',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (id === 'markets') {
    return (
      <svg {...props}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    );
  }
  if (id === 'studio') {
    return (
      <svg {...props}>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    );
  }
  if (id === 'intelligence') {
    return (
      <svg {...props}>
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    );
  }
  if (id === 'play') {
    return (
      <svg {...props}>
        <rect x="2" y="6" width="20" height="12" rx="4" />
        <path d="M6 12h4" />
        <path d="M8 10v4" />
        <circle cx="15" cy="11" r="1" fill="#FFFFFF" />
        <circle cx="17.5" cy="13" r="1" fill="#FFFFFF" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function Interactive3DCard({
  card,
  isActive,
  onSelectInPage,
}: {
  card: CardSpec;
  isActive: boolean;
  onSelectInPage?: () => void;
}) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 80, my: 18, hovered: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - y) * 14,
      ry: (x - 0.5) * 16,
      mx: Math.round(x * 100),
      my: Math.round(y * 100),
      hovered: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, mx: 80, my: 18, hovered: false });
  };

  const cardStyle = {
    transform: tilt.hovered
      ? `perspective(950px) rotateX(${tilt.rx.toFixed(1)}deg) rotateY(${tilt.ry.toFixed(1)}deg) translateY(-5px) scale(1.02)`
      : 'perspective(950px) rotateX(0deg) rotateY(0deg)',
    '--mx': `${tilt.mx}%`,
    '--my': `${tilt.my}%`,
    textDecoration: 'none',
  } as React.CSSProperties;

  const content = (
    <>
      <div className="ta-3d-card-sheen" />
      <div className="ta-3d-card-glow" style={{ background: card.accent }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div className="ta-3d-icon-orb">
          <CardIcon id={card.id} />
        </div>
        <span
          style={{
            fontSize: '9.5px',
            fontWeight: 800,
            letterSpacing: '0.06em',
            padding: '3px 8px',
            borderRadius: '999px',
            background: 'rgba(247, 148, 29, 0.22)',
            color: '#FFD49E',
            border: '1px solid rgba(247, 148, 29, 0.35)',
          }}
        >
          {card.badge}
        </span>
      </div>

      <div style={{ position: 'relative', zIndex: 2, marginTop: '14px' }}>
        <div
          style={{
            fontSize: '15px',
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '-0.01em',
            marginBottom: '4px',
          }}
        >
          {card.title}
        </div>
        <div
          style={{
            fontSize: '11.5px',
            lineHeight: 1.4,
            color: '#DCDFF8',
          }}
        >
          {card.subtitle}
        </div>
      </div>
    </>
  );

  return (
    <div
      className="ta-3d-float-wrapper"
      style={{ animationDelay: `${card.delaySec}s` }}
    >
      {onSelectInPage ? (
        <button
          type="button"
          data-testid={`web-3d-tab-${card.id}`}
          onClick={onSelectInPage}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`ta-3d-card ${isActive ? 'ta-3d-card-active' : ''}`}
          style={cardStyle}
        >
          {content}
        </button>
      ) : (
        <Link
          href={card.href}
          data-testid={`web-3d-tab-${card.id}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`ta-3d-card ${isActive ? 'ta-3d-card-active' : ''}`}
          style={cardStyle}
        >
          {content}
        </Link>
      )}
    </div>
  );
}

export default function Floating3DArthaVerseTabs({
  activeTab,
  onSelectSection,
  showHeading = true,
}: Floating3DArthaVerseTabsProps) {
  const router = useRouter();

  return (
    <section className="ta-3d-section" data-testid="web-arthaverse-3d-section">
      {showHeading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: '#F7941D',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  color: '#F7941D',
                  textTransform: 'uppercase',
                }}
              >
                ArthaVerse Discovery Hub
              </span>
            </div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 900,
                color: '#102A54',
                margin: '2px 0 0 0',
              }}
            >
              Explore Markets, Funds &amp; Insights
            </h2>
          </div>

          <Link
            href="/dashboard/arthaverse"
            onClick={() => router.prefetch('/dashboard/arthaverse')}
            style={{
              background: '#EEEDFA',
              color: '#36358D',
              border: '1px solid #D8DAF6',
              borderRadius: '12px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 800,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Explore ArthaVerse →
          </Link>
        </div>
      )}

      <div className="ta-3d-grid">
        {ARTHAVERSE_CARDS.map((card) => (
          <Interactive3DCard
            key={card.id}
            card={card}
            isActive={activeTab === card.id}
            onSelectInPage={
              onSelectSection && card.id !== 'intelligence'
                ? () => onSelectSection(card.id)
                : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
