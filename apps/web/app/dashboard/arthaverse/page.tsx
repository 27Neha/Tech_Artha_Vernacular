'use client';
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Floating3DArthaVerseTabs, {
  ArthaVerseTabId,
} from '../../../components/Floating3DArthaVerseTabs';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type ChartRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';

const FUND_COLLECTIONS = [
  { id: 'large', name: 'Large Cap', desc: 'Top 100 established companies', query: 'Large Cap', color: '#36358D', bg: '#EEF2FF' },
  { id: 'mid', name: 'Mid Cap', desc: 'Expanding mid-sized businesses', query: 'Mid Cap', color: '#6D28D9', bg: '#F5F3FF' },
  { id: 'small', name: 'Small Cap', desc: 'Smaller firms with steeper swings', query: 'Small Cap', color: '#DD6B20', bg: '#FFF4E8' },
  { id: 'flexi', name: 'Flexi Cap', desc: 'Dynamic allocation across caps', query: 'Flexi Cap', color: '#059669', bg: '#ECFDF5' },
  { id: 'index', name: 'Index Funds', desc: 'Passive NIFTY & SENSEX tracking', query: 'Index', color: '#0284C7', bg: '#F0F9FF' },
  { id: 'debt', name: 'Debt Funds', desc: 'Fixed-income & bond stability', query: 'Debt', color: '#475569', bg: '#F8FAFC' },
  { id: 'hybrid', name: 'Hybrid Funds', desc: 'Blended equity & debt mix', query: 'Hybrid', color: '#7E22CE', bg: '#FAF5FF' },
  { id: 'elss', name: 'ELSS', desc: 'Equity funds with 3-yr 80C lock-in', query: 'ELSS', color: '#CA8A04', bg: '#FEFCE8' },
];

const LESSONS = [
  {
    id: 'sip',
    title: 'SIP vs Lump Sum',
    time: '2 min',
    summary: 'Automate rupee-cost averaging across cycles.',
    detail: 'Investing a fixed sum monthly buys more units during dips and fewer at highs, reducing timing anxiety over long horizons.',
  },
  {
    id: 'nav',
    title: 'Why Low NAV ≠ Cheap',
    time: '2 min',
    summary: 'Percentage growth drives wealth, not unit price.',
    detail: 'A ₹10 NAV fund and ₹500 NAV fund holding identical securities deliver identical percentage returns.',
  },
  {
    id: 'alloc',
    title: 'Asset Allocation Basics',
    time: '3 min',
    summary: 'Match equity & debt split to goal horizon.',
    detail: 'Near-term goals (<3 yrs) suit lower-volatility debt; long-term goals (5+ yrs) can ride out equity cycles.',
  },
  {
    id: 'ter',
    title: 'Expense Ratio & Direct Plans',
    time: '2 min',
    summary: 'Lower ongoing fees compound meaningfully.',
    detail: 'Check official Total Expense Ratio (TER) on AMC scheme factsheets before investing.',
  },
];

const PORTALS = [
  { name: 'SEBI Investor Portal', role: 'Regulator', url: 'https://investor.sebi.gov.in' },
  { name: 'AMFI Knowledge Center', role: 'Industry Body', url: 'https://www.amfiindia.com' },
  { name: 'NSE India Indices', role: 'Exchange', url: 'https://www.nseindia.com' },
  { name: 'RBI Monetary Policy', role: 'Central Bank', url: 'https://www.rbi.org.in' },
];

function computeSip(monthly: number, years: number, rate: number) {
  const r = rate / 100 / 12;
  const pts: { year: number; invested: number; value: number }[] = [];
  for (let y = 0; y <= years; y++) {
    const m = y * 12;
    const invested = monthly * m;
    const value = m > 0 ? monthly * ((Math.pow(1 + r, m) - 1) / r) * (1 + r) : 0;
    pts.push({ year: y, invested: Math.round(invested), value: Math.round(value) });
  }
  return pts;
}

function ArthaVerseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialParam = searchParams.get('tab') as ArthaVerseTabId | null;

  const [activeTab, setActiveTab] = useState<'all' | ArthaVerseTabId>(initialParam || 'all');
  const [range, setRange] = useState<ChartRange>('1D');
  const [overview, setOverview] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [quiz, setQuiz] = useState<any>(null);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  // SIP Studio state
  const [sipMonthly, setSipMonthly] = useState(5000);
  const [sipYears, setSipYears] = useState(10);
  const [sipRate, setSipRate] = useState(12);

  useEffect(() => {
    if (initialParam && ['markets', 'studio', 'play', 'academy'].includes(initialParam)) {
      setActiveTab(initialParam);
    }
  }, [initialParam]);

  useEffect(() => {
    const fetchAll = async () => {
      const [ov, nw, dy] = await Promise.all([
        fetch(`${API_URL}/market/overview`).catch(() => null),
        fetch(`${API_URL}/market/news`).catch(() => null),
        fetch(`${API_URL}/market/daily`).catch(() => null),
      ]);
      if (ov?.ok) setOverview(await ov.json());
      if (nw?.ok) setNews(await nw.json());
      if (dy?.ok) {
        const d = await dy.json();
        setQuiz(d.quiz ?? null);
      }
    };
    void fetchAll();
  }, []);

  const sipPts = useMemo(() => computeSip(sipMonthly, sipYears, sipRate), [sipMonthly, sipYears, sipRate]);
  const sipFinal = sipPts[sipPts.length - 1];

  const marketChart = useMemo(() => {
    const pts = overview?.charts?.[range] ?? [];
    if (pts.length < 2) return null;
    const W = 420;
    const H = 130;
    const vals = pts.map((p: any) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const coords = pts.map((p: any, i: number) => ({
      x: 10 + (i / (pts.length - 1)) * (W - 20),
      y: H - 14 - ((p.value - min) / span) * (H - 28),
    }));
    const d = coords.map((c: any, i: number) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const area = `${d} L ${coords[coords.length - 1].x.toFixed(1)} ${H} L ${coords[0].x.toFixed(1)} ${H} Z`;
    return { d, area, last: coords[coords.length - 1] };
  }, [overview, range]);

  const sipChart = useMemo(() => {
    const W = 380;
    const H = 115;
    const maxV = Math.max(1, sipFinal.value);
    const toPath = (key: 'value' | 'invested') =>
      sipPts
        .map((p, idx) => {
          const x = 10 + (idx / Math.max(1, sipPts.length - 1)) * (W - 20);
          const y = H - 12 - (p[key] / maxV) * (H - 24);
          return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(' ');
    const vPath = toPath('value');
    const iPath = toPath('invested');
    const area = `${vPath} L ${W - 10} ${H} L 10 ${H} Z`;
    return { vPath, iPath, area };
  }, [sipPts, sipFinal]);

  return (
    <div className="ta-dashboard-page">
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#F7941D', letterSpacing: '0.1em' }}>
          ARTHAVERSE
        </span>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#102A54', margin: '2px 0 0 0' }}>
          Visual Discovery Destination
        </h1>
      </div>

      {/* All 5 Floating 3D Navigation Cards */}
      <Floating3DArthaVerseTabs
        showHeading={false}
        activeTab={activeTab === 'all' ? undefined : activeTab}
        onSelectSection={(tab) => setActiveTab(activeTab === tab ? 'all' : tab)}
      />

      {/* A. MARKET PULSE */}
      {(activeTab === 'all' || activeTab === 'markets') && (
        <section style={{ marginBottom: 26 }} data-testid="web-section-markets">
          <h2 style={{ fontSize: 19, fontWeight: 900, color: '#102A54', marginBottom: 12 }}>
            Market Pulse
          </h2>
          <div className="ta-two-col">
            <div className="ta-surface-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B' }}>NIFTY 50</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#102A54' }}>
                    {overview?.nifty50 ? Math.round(overview.nifty50.currentValue).toLocaleString('en-IN') : '—'}
                  </div>
                </div>
                {overview?.nifty50 && (
                  <span style={{ background: '#ECFDF5', color: '#059669', padding: '5px 10px', borderRadius: 10, fontSize: 12, fontWeight: 800 }}>
                    {overview.nifty50.change >= 0 ? '+' : ''}
                    {overview.nifty50.changePercent.toFixed(2)}%
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {(['1D', '1W', '1M', '3M', '6M', '1Y'] as ChartRange[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: range === r ? '#36358D' : '#F1F5F9',
                      color: range === r ? '#FFFFFF' : '#475569',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {marketChart && (
                <svg width="100%" height="130" viewBox="0 0 420 130">
                  <defs>
                    <linearGradient id="mktArea" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={marketChart.area} fill="url(#mktArea)" />
                  <path d={marketChart.d} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx={marketChart.last.x} cy={marketChart.last.y} r="4.5" fill="#36358D" />
                </svg>
              )}

              {overview?.sectors && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {overview.sectors.map((sec: any) => (
                    <span
                      key={sec.sector}
                      style={{
                        background: '#F8F9FD',
                        border: '1px solid #E4E6F6',
                        padding: '5px 10px',
                        borderRadius: 10,
                        fontSize: 11.5,
                        fontWeight: 800,
                        color: '#102A54',
                      }}
                    >
                      {sec.sector}{' '}
                      <span style={{ color: sec.changePercent >= 0 ? '#059669' : '#DC2626' }}>
                        {sec.changePercent >= 0 ? '+' : ''}
                        {sec.changePercent.toFixed(2)}%
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="ta-surface-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 900, color: '#102A54', margin: 0 }}>Top Market Headlines</h3>
                {overview?.sensex && (
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: '#36358D' }}>
                    SENSEX {Math.round(overview.sensex.currentValue).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {news.slice(0, 4).map((item: any) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'block',
                      padding: 12,
                      borderRadius: 14,
                      background: '#F8F9FD',
                      border: '1px solid #EAECF8',
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 800, color: '#64748B', marginBottom: 4 }}>
                      <span style={{ color: '#36358D' }}>{item.category}</span>
                      <span>{item.publishedAt}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#102A54', lineHeight: 1.35 }}>
                      {item.headline}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* B. FUND DISCOVERY STUDIO */}
      {(activeTab === 'all' || activeTab === 'studio') && (
        <section style={{ marginBottom: 26 }} data-testid="web-section-studio">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 19, fontWeight: 900, color: '#102A54', margin: 0 }}>Fund Discovery Studio</h2>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0 0' }}>
                Neutral SEBI fund collections — explore by category
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/funds')}
              style={{ background: '#EEEDFA', color: '#36358D', fontSize: 12, fontWeight: 800, padding: '7px 12px', borderRadius: 10, cursor: 'pointer' }}
            >
              All Funds →
            </button>
          </div>

          <div className="ta-collection-grid">
            {FUND_COLLECTIONS.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => router.push(`/funds?q=${encodeURIComponent(col.query)}`)}
                className="ta-surface-card"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    background: col.bg,
                    color: col.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 14,
                  }}
                >
                  ◆
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 900, color: '#102A54' }}>{col.name}</div>
                  <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 3 }}>{col.desc}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#36358D' }}>View Funds →</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* C. ARTHAPLAY */}
      {(activeTab === 'all' || activeTab === 'play') && (
        <section style={{ marginBottom: 26 }} data-testid="web-section-play">
          <h2 style={{ fontSize: 19, fontWeight: 900, color: '#102A54', marginBottom: 12 }}>ArthaPlay</h2>
          <div className="ta-two-col">
            <div className="ta-surface-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 15.5, fontWeight: 900, color: '#102A54', margin: 0 }}>SIP Compounding Studio</h3>
                  <p style={{ fontSize: 11.5, color: '#64748B', margin: '2px 0 0 0' }}>Illustrative scenario explorer</p>
                </div>
                <span style={{ background: '#FFF4E8', color: '#DD6B20', padding: '4px 10px', borderRadius: 10, fontSize: 12, fontWeight: 800 }}>
                  {sipRate}% p.a.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, background: '#F6F7FD', padding: 10, borderRadius: 14, marginBottom: 10, textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#64748B' }}>INVESTED</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#102A54' }}>₹{(sipFinal.invested / 1e5).toFixed(2)} L</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#64748B' }}>ILLUSTRATIVE</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#36358D' }}>₹{(sipFinal.value / 1e5).toFixed(2)} L</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#64748B' }}>EST. GAIN</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#059669' }}>+₹{((sipFinal.value - sipFinal.invested) / 1e5).toFixed(2)} L</div>
                </div>
              </div>

              <svg width="100%" height="115" viewBox="0 0 380 115">
                <defs>
                  <linearGradient id="webSipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#36358D" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#36358D" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={sipChart.area} fill="url(#webSipGrad)" />
                <path d={sipChart.iPath} fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeDasharray="4 4" />
                <path d={sipChart.vPath} fill="none" stroke="#36358D" strokeWidth="2.8" strokeLinecap="round" />
              </svg>

              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                {[2000, 5000, 10000, 25000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSipMonthly(amt)}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: sipMonthly === amt ? '#36358D' : '#F1F5F9',
                      color: sipMonthly === amt ? '#FFFFFF' : '#475569',
                    }}
                  >
                    ₹{amt / 1000}k/mo
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {[5, 10, 15, 20].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSipYears(yr)}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: 9,
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: sipYears === yr ? '#36358D' : '#F1F5F9',
                      color: sipYears === yr ? '#FFFFFF' : '#475569',
                    }}
                  >
                    {yr}Y
                  </button>
                ))}
                {[8, 12, 14].map((rt) => (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => setSipRate(rt)}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: 9,
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: sipRate === rt ? '#F7941D' : '#FFF4E8',
                      color: sipRate === rt ? '#FFFFFF' : '#DD6B20',
                    }}
                  >
                    {rt}%
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 10 }}>
                Illustrative mathematical calculation only; returns are market-linked and not guaranteed.
              </p>
            </div>

            {quiz && (
              <div className="ta-surface-card">
                <div style={{ fontSize: 10.5, fontWeight: 800, color: '#36358D', letterSpacing: '0.08em', marginBottom: 6 }}>
                  DAILY FINANCE CHECKPOINT
                </div>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#102A54', marginBottom: 14 }}>
                  {quiz.question}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {quiz.options.map((opt: any) => {
                    const answered = selectedOpt !== null;
                    const chosen = selectedOpt === opt.id;
                    const bg = answered
                      ? opt.isCorrect
                        ? '#ECFDF5'
                        : chosen
                          ? '#FEF2F2'
                          : '#FFFFFF'
                      : '#FFFFFF';
                    const border = answered
                      ? opt.isCorrect
                        ? '#10B981'
                        : chosen
                          ? '#EF4444'
                          : '#E2E8F0'
                      : '#E2E4F5';
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={answered}
                        onClick={() => setSelectedOpt(opt.id)}
                        style={{
                          textAlign: 'left',
                          padding: 12,
                          borderRadius: 12,
                          border: `1.5px solid ${border}`,
                          background: bg,
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#102A54',
                          cursor: answered ? 'default' : 'pointer',
                        }}
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
                {selectedOpt && (
                  <p style={{ fontSize: 12, color: '#334155', background: '#F4F4FD', padding: 12, borderRadius: 12, marginTop: 12 }}>
                    {quiz.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* D. ARTHA ACADEMY & OFFICIAL RESEARCH PORTALS */}
      {(activeTab === 'all' || activeTab === 'academy') && (
        <section style={{ marginBottom: 24 }} data-testid="web-section-academy">
          <h2 style={{ fontSize: 19, fontWeight: 900, color: '#102A54', marginBottom: 12 }}>
            Artha Academy &amp; Official Portals
          </h2>
          <div className="ta-collection-grid" style={{ marginBottom: 16 }}>
            {LESSONS.map((l) => {
              const open = expandedLesson === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setExpandedLesson(open ? null : l.id)}
                  className="ta-surface-card"
                  style={{ textAlign: 'left', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: '#F7941D', marginBottom: 4 }}>
                    {l.time} read
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#102A54', marginBottom: 4 }}>
                    {l.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{l.summary}</div>
                  {open && (
                    <p style={{ fontSize: 12, color: '#334155', marginTop: 10, paddingTop: 8, borderTop: '1px solid #EEF0F8' }}>
                      {l.detail}
                    </p>
                  )}
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: '#36358D', marginTop: 8 }}>
                    {open ? 'Show Less' : 'Read More →'}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="ta-collection-grid">
            {PORTALS.map((p) => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="ta-surface-card"
                style={{ textDecoration: 'none', padding: 14 }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, color: '#64748B' }}>{p.role}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#102A54', marginTop: 2 }}>{p.name} ↗</div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function ArthaVerseWebPage() {
  return (
    <Suspense fallback={<div className="ta-dashboard-page">Loading ArthaVerse…</div>}>
      <ArthaVerseContent />
    </Suspense>
  );
}
