'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Floating3DArthaVerseTabs from '../../components/Floating3DArthaVerseTabs';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type PortfolioRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface PortfolioTotals {
  invested: number;
  current: number;
  gain: number;
}

interface GoalItem {
  id: string;
  name: string;
  targetAmount: number;
  currentSavings?: number;
  timePeriod?: number;
  monthlySip?: number;
}

interface MarketIndex {
  symbol: string;
  name: string;
  currentValue: number;
  change: number;
  changePercent: number;
}

interface MarketOverview {
  nifty50: MarketIndex;
  sensex: MarketIndex;
}

function formatCompactINR(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}

function normalizeRisk(rawCategory?: string | null, rawScore?: number | null) {
  if (!rawCategory || !rawCategory.trim()) return null;
  const key = rawCategory.trim().toUpperCase().replace(/[\s-]+/g, '_');
  const map: Record<
    string,
    { label: string; angle: number; color: string; summary: string }
  > = {
    CONSERVATIVE: {
      label: 'Conservative',
      angle: -72,
      color: '#10B981',
      summary: 'Capital preservation priority with minimal short-term volatility.',
    },
    MODERATELY_LOW: {
      label: 'Moderately Low',
      angle: -36,
      color: '#65A30D',
      summary: 'Income-oriented balance with measured equity allocation.',
    },
    MODERATE: {
      label: 'Moderate',
      angle: 0,
      color: '#D97706',
      summary: 'Balanced long-term growth cushioned against sharper drawdowns.',
    },
    BALANCED: {
      label: 'Balanced',
      angle: 0,
      color: '#D97706',
      summary: 'Balanced long-term growth cushioned against sharper drawdowns.',
    },
    MODERATELY_HIGH: {
      label: 'Growth',
      angle: 36,
      color: '#EA580C',
      summary: 'Equity-focused compounding comfortable with market swings.',
    },
    GROWTH: {
      label: 'Growth',
      angle: 36,
      color: '#EA580C',
      summary: 'Equity-focused compounding comfortable with market swings.',
    },
    AGGRESSIVE: {
      label: 'Aggressive',
      angle: 72,
      color: '#EF4444',
      summary: 'Long-horizon wealth growth across full market cycles.',
    },
  };
  const found = map[key];
  if (!found) return null;
  return { ...found, score: rawScore ?? null };
}

function GoalRing({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = 21;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamped / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} stroke="#E8EAF6" strokeWidth="5" fill="none" />
        <circle
          cx="26"
          cy="26"
          r={r}
          stroke={clamped >= 100 ? '#10B981' : '#36358D'}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          transform="rotate(-90 26 26)"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 900,
          color: '#102A54',
        }}
      >
        {Math.round(clamped)}%
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState('Investor');
  const [riskRaw, setRiskRaw] = useState<{ category?: string | null; score?: number | null } | null>(null);
  const [portfolioTotals, setPortfolioTotals] = useState<PortfolioTotals | null>(null);
  const [portfolioAsOn, setPortfolioAsOn] = useState<string | null>(null);
  const [portfolioHistory, setPortfolioHistory] = useState<{ date: string; value: number }[]>([]);
  const [selectedRange, setSelectedRange] = useState<PortfolioRange>('ALL');
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [market, setMarket] = useState<MarketOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [riskExpanded, setRiskExpanded] = useState(false);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  useEffect(() => {
    const load = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        const [portRes, profileRes, goalsRes, invRes, mktRes] = await Promise.all([
          token ? fetch(`${API_URL}/portfolio`, { headers: authHeaders }).catch(() => null) : Promise.resolve(null),
          token ? fetch(`${API_URL}/auth/profile`, { headers: authHeaders }).catch(() => null) : Promise.resolve(null),
          token ? fetch(`${API_URL}/goals`, { headers: authHeaders }).catch(() => null) : Promise.resolve(null),
          token ? fetch(`${API_URL}/buckets/investments`, { headers: authHeaders }).catch(() => null) : Promise.resolve(null),
          fetch(`${API_URL}/market/overview`).catch(() => null),
        ]);

        if (portRes?.ok) {
          const p = await portRes.json();
          const totals = p?.totals
            ? {
                invested: Number(p.totals.invested ?? 0),
                current: Number(p.totals.current ?? 0),
                gain: Number(p.totals.gain ?? (p.totals.current ?? 0) - (p.totals.invested ?? 0)),
              }
            : p?.data
              ? {
                  invested: Number(p.data.totalInvested ?? 0),
                  current: Number(p.data.currentValue ?? 0),
                  gain: Number(p.data.currentValue ?? 0) - Number(p.data.totalInvested ?? 0),
                }
              : null;
          setPortfolioTotals(totals);
          setPortfolioAsOn(p?.asOn ?? null);
          if (Array.isArray(p?.history)) setPortfolioHistory(p.history);
        }

        if (profileRes?.ok) {
          const prof = await profileRes.json();
          const full = prof?.profile?.fullName || prof?.name;
          if (full) setDisplayName(String(full).trim().split(' ')[0]);
          if (prof?.riskProfile?.category) {
            setRiskRaw({ category: prof.riskProfile.category, score: prof.riskProfile.score });
          }
        }

        if (goalsRes?.ok) {
          const g = await goalsRes.json();
          setGoals(Array.isArray(g) ? g : Array.isArray(g?.data) ? g.data : []);
        }

        if (invRes?.ok) {
          const inv = await invRes.json();
          const combined = [
            ...(inv.orders ?? []).map((o: any) => ({ ...o, kind: 'order' })),
            ...(inv.plans ?? []).map((pl: any) => ({ ...pl, kind: 'plan' })),
          ];
          setOrders(combined);
        }

        if (mktRes?.ok) {
          setMarket(await mktRes.json());
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const riskInfo = useMemo(
    () => normalizeRisk(riskRaw?.category, riskRaw?.score),
    [riskRaw],
  );

  const hasInvestments = (portfolioTotals?.current ?? 0) > 0;
  const gainPct =
    portfolioTotals && portfolioTotals.invested > 0
      ? (portfolioTotals.gain / portfolioTotals.invested) * 100
      : null;

  const filteredHistory = useMemo(() => {
    if (portfolioHistory.length < 2) return [];
    if (selectedRange === 'ALL') return portfolioHistory;
    const countMap = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
    const slice = portfolioHistory.slice(-countMap[selectedRange]);
    return slice.length >= 2 ? slice : portfolioHistory;
  }, [portfolioHistory, selectedRange]);

  const svgCurve = useMemo(() => {
    if (filteredHistory.length < 2) return null;
    const W = 360;
    const H = 104;
    const vals = filteredHistory.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const pts = filteredHistory.map((p, idx) => ({
      x: 10 + (idx / (filteredHistory.length - 1)) * (W - 20),
      y: H - 14 - ((p.value - min) / span) * (H - 28),
    }));
    const d = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
    const area = `${d} L ${pts[pts.length - 1].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`;
    return { d, area, last: pts[pts.length - 1] };
  }, [filteredHistory]);

  return (
    <div className="ta-dashboard-page">
      {/* 1. Compact Personalized Greeting */}
      <div className="ta-greeting-bar">
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.09em',
              color: '#F7941D',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            {greeting}
          </p>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: '#102A54',
              margin: '2px 0 0 0',
              letterSpacing: '-0.02em',
            }}
          >
            {displayName}
          </h1>
        </div>

        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: '#475569',
            background: '#FFFFFF',
            border: '1px solid #E4E6F6',
            borderRadius: 999,
            padding: '6px 12px',
          }}
        >
          {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* 2. Portfolio Hero Card + Quick Actions */}
      <div className="ta-hero-grid">
        <div className="ta-hero-card" data-testid="web-portfolio-hero">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 12,
              position: 'relative',
              zIndex: 2,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  color: '#C7D2FE',
                  margin: 0,
                }}
              >
                PORTFOLIO OVERVIEW
              </p>
              <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.72)', margin: '2px 0 0 0' }}>
                {portfolioAsOn
                  ? `As on ${new Date(portfolioAsOn).toLocaleDateString('en-IN')}`
                  : 'AMFI Registered Folio'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/portfolio')}
              style={{
                background: 'rgba(255,255,255,0.16)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 12,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Details →
            </button>
          </div>

          {loading ? (
            <p style={{ fontSize: 28, fontWeight: 900, margin: '18px 0' }}>Loading portfolio…</p>
          ) : !hasInvestments ? (
            <div style={{ position: 'relative', zIndex: 2 }}>
              <p style={{ fontSize: 38, fontWeight: 900, margin: '4px 0 6px 0' }}>₹0</p>
              <p style={{ fontSize: 13, color: '#E2E4FA', margin: '0 0 16px 0' }}>
                Start systematic direct mutual fund investing aligned with your milestones.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => router.push('/funds')}
                  style={{
                    background: '#FFFFFF',
                    color: '#36358D',
                    fontWeight: 800,
                    fontSize: 13,
                    padding: '10px 18px',
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  Explore Funds →
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/goals')}
                  style={{
                    background: 'rgba(255,255,255,0.16)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255,255,255,0.34)',
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '10px 18px',
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  Plan Goal
                </button>
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.02em' }}>
                  ₹{Math.round(portfolioTotals!.current).toLocaleString('en-IN')}
                </span>
                <span
                  style={{
                    background:
                      portfolioTotals!.gain >= 0
                        ? 'rgba(16, 185, 129, 0.24)'
                        : 'rgba(239, 68, 68, 0.26)',
                    color: portfolioTotals!.gain >= 0 ? '#6EE7B7' : '#FCA5A5',
                    fontWeight: 800,
                    fontSize: 12.5,
                    padding: '6px 11px',
                    borderRadius: 10,
                  }}
                >
                  {portfolioTotals!.gain >= 0 ? '↗ +' : '↘ -'}₹
                  {Math.abs(Math.round(portfolioTotals!.gain)).toLocaleString('en-IN')}
                  {gainPct != null ? ` (${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(2)}%)` : ''}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 8,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  padding: '10px 12px',
                  marginBottom: 14,
                }}
              >
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>
                    Invested
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800 }}>
                    ₹{Math.round(portfolioTotals!.invested).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>
                    Abs. Returns
                  </div>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 800,
                      color: portfolioTotals!.gain >= 0 ? '#6EE7B7' : '#FCA5A5',
                    }}
                  >
                    {portfolioTotals!.gain >= 0 ? '+' : '-'}₹
                    {Math.abs(Math.round(portfolioTotals!.gain)).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>
                    Return %
                  </div>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 800,
                      color: (gainPct ?? 0) >= 0 ? '#6EE7B7' : '#FCA5A5',
                    }}
                  >
                    {gainPct != null ? `${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(2)}%` : '—'}
                  </div>
                </div>
              </div>

              {svgCurve ? (
                <div>
                  <svg width="100%" height="104" viewBox="0 0 360 104">
                    <defs>
                      <linearGradient id="webPortArea" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#F7941D" stopOpacity="0.34" />
                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={svgCurve.area} fill="url(#webPortArea)" />
                    <path
                      d={svgCurve.d}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                    <circle cx={svgCurve.last.x} cy={svgCurve.last.y} r="4.5" fill="#F7941D" />
                  </svg>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    {(['1M', '3M', '6M', '1Y', 'ALL'] as PortfolioRange[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelectedRange(r)}
                        style={{
                          flex: 1,
                          padding: '5px 0',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: 'pointer',
                          background: selectedRange === r ? '#FFFFFF' : 'rgba(255,255,255,0.12)',
                          color: selectedRange === r ? '#36358D' : '#E2E4FA',
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    padding: 12,
                    border: '1px solid rgba(255,255,255,0.16)',
                  }}
                >
                  {[
                    {
                      label: 'Invested',
                      val: portfolioTotals!.invested,
                      color: '#A5B4FC',
                    },
                    {
                      label: 'Current',
                      val: portfolioTotals!.current,
                      color: portfolioTotals!.gain >= 0 ? '#34D399' : '#F87171',
                    },
                  ].map((bar) => {
                    const max = Math.max(portfolioTotals!.invested, portfolioTotals!.current, 1);
                    const pct = Math.max(12, Math.min(100, (bar.val / max) * 100));
                    return (
                      <div
                        key={bar.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ width: 58, fontSize: 11, fontWeight: 700, color: '#CBD5E1' }}>
                          {bar.label}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 8,
                            borderRadius: 6,
                            background: 'rgba(255,255,255,0.16)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              borderRadius: 6,
                              background: bar.color,
                            }}
                          />
                        </div>
                        <span style={{ width: 84, textAlign: 'right', fontSize: 11.5, fontWeight: 800 }}>
                          ₹{Math.round(bar.val).toLocaleString('en-IN')}
                        </span>
                      </div>
                    );
                  })}
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.68)', margin: 0 }}>
                    Daily growth curve populates automatically as folio NAV snapshots accumulate.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Quick Actions (4 Visual Action Tiles) */}
        <div className="ta-quick-actions-grid" data-testid="web-quick-actions">
          {[
            { label: 'Invest', icon: '＋', bg: '#EEEDFA', color: '#36358D', href: '/funds' },
            { label: 'Start SIP', icon: '↻', bg: '#FFF4E8', color: '#DD6B20', href: '/buckets' },
            { label: 'Withdraw', icon: '↓', bg: '#ECFDF5', color: '#059669', href: '/dashboard/portfolio' },
            { label: 'Transactions', icon: '≡', bg: '#F0F9FF', color: '#0284C7', href: '/dashboard/portfolio' },
          ].map((act) => (
            <button
              key={act.label}
              type="button"
              onClick={() => router.push(act.href)}
              className="ta-quick-tile"
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  background: act.bg,
                  color: act.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 900,
                }}
              >
                {act.icon}
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#102A54' }}>{act.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. MANDATORY 5 FLOATING 3D ARTHAVERSE TABS (VISIBLE WITHOUT EXCESSIVE SCROLLING) */}
      <Floating3DArthaVerseTabs />

      {/* 5. Responsive Bento: Financial Goals + Risk Profile Riskometer + Market Snapshot */}
      <div className="ta-bento-grid">
        {/* Financial Goals */}
        <div className="ta-surface-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: '#102A54', margin: 0 }}>Financial Goals</h3>
            <button
              type="button"
              onClick={() => router.push('/goals')}
              style={{ fontSize: 12, fontWeight: 800, color: '#36358D', background: 'none', cursor: 'pointer' }}
            >
              View All →
            </button>
          </div>

          {goals.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <GoalRing pct={0} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13.5, fontWeight: 800, color: '#102A54', margin: 0 }}>Set your first goal</p>
                <p style={{ fontSize: 11.5, color: '#64748B', margin: '2px 0 0 0' }}>Track SIP milestones visually.</p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/goals')}
                style={{
                  background: '#36358D',
                  color: '#FFFFFF',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                + Plan
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {goals.slice(0, 3).map((g) => {
                const target = Number(g.targetAmount) || 0;
                const saved = Number(g.currentSavings ?? 0);
                const pct = target > 0 ? (saved / target) * 100 : 0;
                return (
                  <div
                    key={g.id}
                    onClick={() => router.push('/goals')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 10,
                      borderRadius: 14,
                      background: '#F8F9FD',
                      cursor: 'pointer',
                    }}
                  >
                    <GoalRing pct={pct} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: '#102A54', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {g.name}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#36358D', whiteSpace: 'nowrap' }}>
                          {formatCompactINR(target)}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                        Saved {formatCompactINR(saved)} {g.timePeriod ? `• ${g.timePeriod}Y` : ''}
                      </div>
                      <div style={{ height: 5, background: '#E2E4F5', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, Math.max(3, pct))}%`, height: '100%', background: '#36358D', borderRadius: 4 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Compact Visual Riskometer */}
        <div className="ta-surface-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: '#102A54', margin: 0 }}>Risk Profile</h3>
            <button
              type="button"
              onClick={() => router.push('/risk')}
              style={{ fontSize: 12, fontWeight: 800, color: '#36358D', background: 'none', cursor: 'pointer' }}
            >
              {riskInfo ? 'Retake' : 'Assess Now'} →
            </button>
          </div>

          {riskInfo ? (
            <div style={{ textAlign: 'center' }}>
              <svg width="210" height="114" viewBox="0 0 210 114" style={{ margin: '0 auto' }}>
                <defs>
                  <linearGradient id="webRiskArc" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="30%" stopColor="#84CC16" />
                    <stop offset="50%" stopColor="#EAB308" />
                    <stop offset="75%" stopColor="#EA580C" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                </defs>
                <path
                  d="M 22 102 A 83 83 0 0 1 188 102"
                  fill="none"
                  stroke="url(#webRiskArc)"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <g transform={`rotate(${riskInfo.angle} 105 102)`}>
                  <polygon points="102,102 105,28 108,102" fill="#102A54" />
                  <circle cx="105" cy="30" r="3.5" fill={riskInfo.color} />
                </g>
                <circle cx="105" cy="102" r="9" fill="#36358D" />
                <circle cx="105" cy="102" r="3.5" fill="#FFFFFF" />
              </svg>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F4F4FD', padding: '4px 12px', borderRadius: 999, marginTop: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: riskInfo.color }} />
                <span style={{ fontSize: 12.5, fontWeight: 900, color: '#102A54' }}>{riskInfo.label}</span>
              </div>
              <p style={{ fontSize: 12, color: '#64748B', margin: '8px 0 8px 0' }}>{riskInfo.summary}</p>
              <button
                type="button"
                onClick={() => setRiskExpanded((v) => !v)}
                style={{ fontSize: 11.5, fontWeight: 800, color: '#36358D', background: 'none', cursor: 'pointer' }}
              >
                {riskExpanded ? 'Hide Details' : 'Read More'}
              </button>
              {riskExpanded && (
                <p style={{ fontSize: 11, color: '#475569', background: '#F8F9FD', padding: 10, borderRadius: 10, marginTop: 8, textAlign: 'left' }}>
                  Derived strictly from your risk assessment responses{riskInfo.score != null ? ` (Score: ${riskInfo.score})` : ''}. Not a guarantee of returns.
                </p>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '14px 6px' }}>
              <p style={{ fontSize: 13.5, fontWeight: 800, color: '#102A54', margin: '0 0 6px 0' }}>
                Risk profile not assessed yet
              </p>
              <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 14px 0' }}>
                Complete the 2-minute check to unlock your visual Riskometer.
              </p>
              <button
                type="button"
                onClick={() => router.push('/risk')}
                style={{
                  background: '#36358D',
                  color: '#FFFFFF',
                  borderRadius: 12,
                  padding: '9px 16px',
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Take Risk Assessment →
              </button>
            </div>
          )}
        </div>

        {/* Minimal Market Snapshot */}
        <div className="ta-surface-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: '#102A54', margin: 0 }}>Market Snapshot</h3>
            <button
              type="button"
              onClick={() => router.push('/dashboard/arthaverse?tab=markets')}
              style={{ fontSize: 12, fontWeight: 800, color: '#36358D', background: 'none', cursor: 'pointer' }}
            >
              View All →
            </button>
          </div>

          {market ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[market.nifty50, market.sensex].filter(Boolean).map((idx) => {
                const up = idx.change >= 0;
                return (
                  <div
                    key={idx.symbol}
                    onClick={() => router.push('/dashboard/arthaverse?tab=markets')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 13,
                      borderRadius: 14,
                      background: '#F8F9FD',
                      border: '1px solid #EAECF8',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B' }}>{idx.name}</div>
                      <div style={{ fontSize: 19, fontWeight: 900, color: '#102A54' }}>
                        {Math.round(idx.currentValue).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <span
                      style={{
                        background: up ? '#ECFDF5' : '#FEF2F2',
                        color: up ? '#059669' : '#DC2626',
                        padding: '5px 10px',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {up ? '↗ +' : '↘ '}
                      {idx.changePercent.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: '#64748B' }}>
              Connect to live market feed to view NIFTY 50 &amp; SENSEX movements.
            </p>
          )}
        </div>
      </div>

      {/* Preserved Recent Orders / SIPs Strip */}
      {orders.length > 0 && (
        <div className="ta-surface-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15.5, fontWeight: 900, color: '#102A54', margin: 0 }}>Recent Orders &amp; SIPs</h3>
            <button
              type="button"
              onClick={() => router.push('/dashboard/portfolio')}
              style={{ fontSize: 12, fontWeight: 800, color: '#36358D', background: 'none', cursor: 'pointer' }}
            >
              Manage →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orders.slice(0, 3).map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: '#F8F9FD',
                }}
              >
                <div style={{ minWidth: 0, paddingRight: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#102A54', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.fundName}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    ₹{Number(item.amount).toLocaleString('en-IN')} • {item.kind === 'plan' ? 'SIP Plan' : 'One-Time'}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#36358D', background: '#EEEDFA', padding: '4px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                  {item.statusLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regulatory Disclosure */}
      <footer style={{ textAlign: 'center', padding: '6px 12px 12px 12px' }}>
        <p style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.5, margin: 0 }}>
          Mutual fund investments are subject to market risks. Read all scheme related documents carefully before investing. Past performance is not indicative of future returns.
        </p>
        <p style={{ fontSize: 11, fontWeight: 800, color: '#64748B', marginTop: 4 }}>
          TechArtha • AMFI-Registered Mutual Fund Distributor
        </p>
      </footer>
    </div>
  );
}
