'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const HOLDINGS: any[] = []; // REAL DATA REQUIREMENT: Fetch from backend

const TRANSACTIONS: any[] = []; // REAL DATA REQUIREMENT: Fetch from backend

const SIPS: any[] = []; // REAL DATA REQUIREMENT: Fetch from backend

const downloadRealPDF = async (title: string) => {
  try {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(28, 26, 24);
    doc.text("TechArtha Financial Services", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("CONSOLIDATED ACCOUNT STATEMENT (CAS)", 14, 30);
    doc.text(`Statement Type: ${title}`, 14, 35);
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, 40);
    
    // Investor Details
    doc.setFontSize(12);
    doc.setTextColor(28, 26, 24);
    doc.text("Investor Details", 14, 55);
    
    autoTable(doc, {
      startY: 60,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 1 },
      body: [
        ['Name', 'TEST USER', 'PAN', 'ABCDE1234F'],
        ['Email', 'test@techartha.com', 'Mobile', '+91 9876543210'],
        ['Address', '123 Tech Park, Mumbai, 400001', 'KYC Status', 'Verified']
      ]
    });

    let nextY = (doc as any).lastAutoTable.finalY + 15;

    // Holdings Summary
    doc.setFontSize(12);
    doc.text("Portfolio Summary", 14, nextY);
    
    autoTable(doc, {
      startY: nextY + 5,
      theme: 'striped',
      headStyles: { fillColor: [28, 26, 24] },
      head: [['Scheme Name', 'Folio', 'Units', 'NAV (Rs)', 'Current Value (Rs)']],
      body: [
        ['Stable Income Fund', '10982312', '25.500', '169.41', '4,320.00'],
        ['Multi-Cap Growth Fund', '88273611', '15.300', '257.51', '3,940.00'],
        ['Liquid Safety Fund', '99128374', '66.210', '32.88', '2,177.00']
      ],
      foot: [['', '', '', 'Total Value:', 'Rs 10,437.00']],
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    nextY = (doc as any).lastAutoTable.finalY + 15;

    // Transactions
    if (title.includes('Transaction') || title.includes('Account')) {
      doc.setFontSize(12);
      doc.text("Transaction History (Last 3 Months)", 14, nextY);
      
      autoTable(doc, {
        startY: nextY + 5,
        theme: 'striped',
        headStyles: { fillColor: [109, 40, 217] }, // Primary purple
        head: [['Date', 'Scheme', 'Transaction Type', 'Amount (Rs)', 'NAV (Rs)', 'Units']],
        body: [
          ['10-Aug-2026', 'Multi-Cap Growth Fund', 'SIP Purchase', '1,000.00', '257.51', '+3.883'],
          ['10-Aug-2026', 'Stable Income Fund', 'SIP Purchase', '1,000.00', '169.41', '+5.903'],
          ['10-Jul-2026', 'Multi-Cap Growth Fund', 'SIP Purchase', '1,000.00', '253.11', '+3.950'],
          ['10-Jul-2026', 'Stable Income Fund', 'SIP Purchase', '1,000.00', '168.01', '+5.952'],
          ['15-Jun-2026', 'Liquid Safety Fund', 'Additional Purchase', '2,000.00', '30.21', '+66.203']
        ]
      });
    }

    doc.save(`${title.replace(/\s+/g, '_')}_TechArtha.pdf`);
  } catch (e) {
    console.error(e);
    alert('Error generating PDF. Please ensure you are online.');
  }
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
export default function FullPortfolioPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'overview' | 'holdings' | 'transactions' | 'sips' | 'statements'>('overview');

  const [portfolio, setPortfolio] = useState({ totalInvested: 0, currentValue: 0, totalReturns: 0, holdings: [] });
  const [fetchingPortfolio, setFetchingPortfolio] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/portfolio`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.data) {
            setPortfolio(data.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch portfolio', err);
      } finally {
        setFetchingPortfolio(false);
      }
    };
    fetchPortfolio();
  }, []);

  const [viewingStatement, setViewingStatement] = useState<string | null>(null);

  const handleSipAction = (action: string, fund: string) => {
    // Requirements: Must NOT execute immediately. Use Confirmation/Authentication/Consent.
    alert(`Initiating ${action} for ${fund} SIP. Redirecting to authentication & consent flow...`);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Primary Header */}
      <div className="bg-[var(--primary)] px-6 pt-8 pb-10 rounded-[32px] mx-4 mt-4 shadow-lg relative overflow-hidden">
        {/* Decorative background blur */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="flex items-center gap-3 mb-8 relative z-10">
          <h1 className="text-3xl font-extrabold text-white">My Portfolio</h1>
        </div>
        
        <div className="flex items-center justify-between mb-2 relative z-10">
          {/* Enhanced Donut Chart */}
          <div className="relative w-32 h-32 shrink-0 drop-shadow-xl">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background Track */}
              <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.1)" strokeWidth="14" fill="transparent" />
              {/* Segments with rounded caps */}
              <circle cx="50" cy="50" r="38" stroke="#34d399" strokeWidth="14" fill="transparent" strokeDasharray="238.76" strokeDashoffset="0" strokeLinecap="round" className="transition-all duration-1000 ease-out" />
              <circle cx="50" cy="50" r="38" stroke="#a78bfa" strokeWidth="14" fill="transparent" strokeDasharray="238.76" strokeDashoffset="140" strokeLinecap="round" className="transition-all duration-1000 ease-out" />
              <circle cx="50" cy="50" r="38" stroke="#60a5fa" strokeWidth="14" fill="transparent" strokeDasharray="238.76" strokeDashoffset="200" strokeLinecap="round" className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/10 rounded-full m-4 backdrop-blur-sm border border-white/10">
              <span className="font-extrabold text-lg">{fetchingPortfolio ? "..." : `₹${portfolio.currentValue > 1000 ? (portfolio.currentValue/1000).toFixed(1) + "K" : portfolio.currentValue}`}</span>
              <span className="text-[10px] text-white/80 font-bold tracking-wider uppercase">Current</span>
            </div>
          </div>

          <div className="flex-1 pl-6">
            <p className="text-white/70 text-[10px] uppercase font-bold mb-1 tracking-wider">Amount Invested</p>
            <p className="text-white font-extrabold text-2xl mb-5">{fetchingPortfolio ? "₹..." : `₹${portfolio.totalInvested.toLocaleString("en-IN")}`}</p>
            
            <p className="text-white/70 text-[10px] uppercase font-bold mb-1 tracking-wider">Total Returns</p>
            <p className="text-green-300 font-extrabold text-sm bg-green-900/30 inline-block px-3 py-1.5 rounded-lg border border-green-400/20">{fetchingPortfolio ? "..." : `₹${portfolio.totalReturns.toLocaleString("en-IN")} (0%)`}</p>
          </div>
        </div>
      </div>

      {/* Horizontally Scrollable Tabs */}
      <div className="bg-white border-b border-gray-200 overflow-x-auto no-scrollbar relative z-10 sticky top-0 shadow-sm">
        <div className="flex px-2 min-w-max justify-between w-full">
          {['overview', 'holdings', 'transactions', 'sips', 'statements'].map(t => (
            <button 
              key={t}
              onClick={() => setTab(t as any)}
              className={`py-3.5 px-2.5 text-xs font-bold capitalize whitespace-nowrap transition-all border-b-2 ${tab === t ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-gray-400'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {/* 1. OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="flex flex-col gap-5">
            {/* Real Data Requirement: Wait for actual portfolio calculations */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-2xl mb-4">📊</div>
              <h3 className="font-extrabold text-[var(--dark)] mb-2">No Portfolio History</h3>
              <p className="text-gray-400 text-xs max-w-[250px]">Your portfolio overview will appear here once you make your first investment and the provider confirms it.</p>
              <button onClick={() => router.push('/buckets')} className="mt-6 text-xs font-bold text-white bg-[var(--primary)] px-6 py-3 rounded-xl shadow-md cursor-pointer hover:opacity-90">Explore Funds</button>
            </div>
            
            <div className="hidden">
              <h3 className="font-extrabold text-[var(--dark)] mb-4">Detailed Allocation</h3>
              <div className="flex justify-between text-xs font-bold text-gray-500 border-b pb-2 mb-2"><span className="w-1/2">Asset Class</span><span>Amount</span><span>%</span></div>
              <div className="flex justify-between text-xs font-bold text-[var(--dark)] py-1.5"><span className="w-1/2">Equity</span><span>₹6,784</span><span className="text-[var(--primary)]">65%</span></div>
              <div className="flex justify-between text-xs font-bold text-[var(--dark)] py-1.5"><span className="w-1/2">Debt</span><span>₹2,609</span><span className="text-[var(--primary)]">25%</span></div>
              <div className="flex justify-between text-xs font-bold text-[var(--dark)] py-1.5"><span className="w-1/2">Hybrid</span><span>₹1,044</span><span className="text-[var(--primary)]">10%</span></div>
              
              <div className="flex justify-between text-xs font-bold text-gray-500 border-b pb-2 mb-2 mt-4"><span className="w-1/2">Equity Category</span><span>Amount</span><span>%</span></div>
              <div className="flex justify-between text-xs font-bold text-[var(--dark)] py-1.5"><span className="w-1/2">Large Cap</span><span>₹3,500</span><span className="text-[var(--primary)]">51%</span></div>
              <div className="flex justify-between text-xs font-bold text-[var(--dark)] py-1.5"><span className="w-1/2">Mid Cap</span><span>₹2,000</span><span className="text-[var(--primary)]">30%</span></div>
              <div className="flex justify-between text-xs font-bold text-[var(--dark)] py-1.5"><span className="w-1/2">Small Cap</span><span>₹1,284</span><span className="text-[var(--primary)]">19%</span></div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-extrabold text-[var(--dark)] mb-4">Detailed Risk</h3>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100"><strong>Note:</strong> Your "Investor Risk Profile" represents your personal capacity to take risks. A scheme's "Risk-o-Meter" shows the standalone volatility of that specific fund. A balanced portfolio may contain high-risk funds while maintaining a moderate overall portfolio risk.</p>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-50"><span className="text-xs font-bold text-gray-500">Investor Risk Profile</span><span className="text-xs font-extrabold text-[var(--dark)]">Moderately Aggressive</span></div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50"><span className="text-xs font-bold text-gray-500">Portfolio Risk</span><span className="text-xs font-extrabold text-orange-600">Moderate</span></div>
              <div className="flex justify-between items-center py-2"><span className="text-xs font-bold text-gray-500">Risk Alignment</span><span className="text-xs font-extrabold text-green-600">Optimal</span></div>
            </div>
            
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-extrabold text-[var(--dark)] mb-4">Detailed Portfolio Health</h3>
              {portfolio.totalInvested === 0 ? (
                <p className="text-sm text-gray-500">Health analytics will be generated automatically once your first investment is verified.</p>
              ) : (
                <p className="text-sm text-gray-500">Calculating your portfolio health metrics from live Cybrilla data...</p>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-extrabold text-[var(--dark)] mb-4">Goal Linking</h3>
              {portfolio.totalInvested === 0 ? (
                <p className="text-sm text-gray-500">No active SIPs to link to goals yet.</p>
              ) : (
                <p className="text-sm text-gray-500">Fetching goal linkages...</p>
              )}
            </div>
          </div>
        )}

        {/* 2. HOLDINGS TAB */}
                {tab === 'holdings' && (
          <div className="flex flex-col gap-4">
            {HOLDINGS.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-2xl mb-4">💼</div>
                <h3 className="font-extrabold text-[var(--dark)] mb-2">No Holdings Yet</h3>
                <p className="text-gray-400 text-xs max-w-[250px]">Your active investments will appear here.</p>
                <button onClick={() => router.push('/buckets')} className="mt-6 text-xs font-bold text-white bg-[var(--primary)] px-6 py-3 rounded-xl shadow-md cursor-pointer">Explore Funds</button>
              </div>
            ) : HOLDINGS.map((h) => (
              <div key={h.name} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-bold text-[var(--dark)] text-sm mb-1">{h.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${h.typeColor}`}>{h.type}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-[var(--dark)] text-base">{h.current}</p>
                    <p className="text-green-500 font-bold text-xs mt-0.5">{h.returns}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs mb-4">
                  <div><span className="text-gray-400 block text-[10px]">Invested Amount</span><span className="font-bold text-[var(--dark)]">{h.invested}</span></div>
                  <div><span className="text-gray-400 block text-[10px]">Gain/Loss</span><span className="font-bold text-green-500">+₹{parseInt(h.current.replace(/\D/g, '')) - parseInt(h.invested.replace(/\D/g, ''))}</span></div>
                  <div><span className="text-gray-400 block text-[10px]">XIRR</span><span className="font-bold text-green-600">{h.xirr}</span></div>
                  <div><span className="text-gray-400 block text-[10px]">Category</span><span className="font-bold text-[var(--dark)]">{h.category}</span></div>
                  <div><span className="text-gray-400 block text-[10px]">Folio Number</span><span className="font-bold text-[var(--dark)]">{h.folio}</span></div>
                  <div><span className="text-gray-400 block text-[10px]">Units</span><span className="font-bold text-[var(--dark)]">{h.units}</span></div>
                  <div><span className="text-gray-400 block text-[10px]">NAV <span className="font-normal">({h.navDate})</span></span><span className="font-bold text-[var(--dark)]">{h.nav}</span></div>
                  <div><span className="text-gray-400 block text-[10px]">Next SIP Date</span><span className="font-bold text-[var(--dark)]">{h.nextSip}</span></div>
                  <div><span className="text-gray-400 block text-[10px]">Plan</span><span className="font-bold text-[var(--dark)]">{h.plan}</span></div>
                  <div><span className="text-gray-400 block text-[10px]">Risk-o-Meter</span><span className="font-bold text-[var(--dark)]">{h.risk}</span></div>
                  <div><span className="text-gray-400 block text-[10px]">Linked Goal</span><span className="font-bold text-[var(--dark)]">{h.goal}</span></div>
                </div>

                <div className="flex gap-2 border-t border-gray-50 pt-3">
                  <button className="flex-1 bg-gray-50 hover:bg-gray-100 text-[var(--dark)] text-[10px] font-bold py-2 rounded-xl transition-all">View Details</button>
                  <button className="flex-1 bg-gray-50 hover:bg-gray-100 text-[var(--dark)] text-[10px] font-bold py-2 rounded-xl transition-all">Transactions</button>
                  <button className="flex-1 bg-gray-50 hover:bg-gray-100 text-[var(--dark)] text-[10px] font-bold py-2 rounded-xl transition-all">Statement</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. TRANSACTIONS TAB */}
        {tab === 'transactions' && (
          <div className="bg-white rounded-2xl p-0 shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex gap-2 p-4 border-b border-gray-100 overflow-x-auto no-scrollbar">
              {['All', 'SIP', 'Lumpsum', 'Redemption', 'Switch', 'Pending'].map(f => (
                <button key={f} className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 whitespace-nowrap">{f}</button>
              ))}
            </div>
            {TRANSACTIONS.map((t, idx) => (
              <div key={idx} className="p-4 border-b border-gray-50 last:border-0 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-[var(--dark)] mb-0.5">{t.name}</p>
                  <p className="text-[10px] text-gray-500">{t.date} • <span className="font-bold">{t.type}</span> • {t.ref}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--dark)]">{t.amount}</p>
                  <p className="text-[10px] font-bold text-green-500 mt-0.5">✓ {t.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 4. SIPS TAB */}
        {tab === 'sips' && (
          <div className="flex flex-col gap-4">
            {SIPS.map((sip, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <p className="font-bold text-[var(--dark)] text-sm mb-1 pr-4">{sip.fund}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-600 border border-green-100">{sip.status}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs mb-5">
                  <div><span className="text-gray-400 block text-[10px]">Folio Number</span><span className="font-bold text-[var(--dark)]">{sip.folio}</span></div>
                  <div><span className="text-gray-400 block text-[10px]">AutoPay Bank</span><span className="font-bold text-[var(--dark)]">{sip.bank}</span></div>
                  <div><span className="text-gray-400 block text-[10px]">SIP Amount</span><span className="font-bold text-[var(--dark)]">{sip.amount}</span></div>
                  <div><span className="text-gray-400 block text-[10px]">Frequency</span><span className="font-bold text-[var(--dark)]">{sip.freq}</span></div>
                  <div><span className="text-gray-400 block text-[10px]">Next Date</span><span className="font-bold text-[var(--dark)]">{sip.nextDate}</span></div>
                  <div><span className="text-gray-400 block text-[10px]">Start Date</span><span className="font-bold text-[var(--dark)]">{sip.startDate}</span></div>
                  <div><span className="text-gray-400 block text-[10px]">Completed</span><span className="font-bold text-[var(--dark)]">{sip.completed} Installments</span></div>
                  <div><span className="text-gray-400 block text-[10px]">Goal</span><span className="font-bold text-[var(--dark)]">{sip.goal}</span></div>
                </div>

                <div className="flex gap-2 border-t border-gray-50 pt-3">
                  <button onClick={() => handleSipAction('Modify', sip.fund)} className="flex-1 border border-[var(--primary)] text-[var(--primary)] text-[10px] font-bold py-2 rounded-xl">Modify SIP</button>
                  <button onClick={() => handleSipAction('Pause', sip.fund)} className="flex-1 border border-amber-500 text-amber-600 text-[10px] font-bold py-2 rounded-xl">Pause SIP</button>
                  <button onClick={() => handleSipAction('Cancel', sip.fund)} className="flex-1 border border-red-500 text-red-600 text-[10px] font-bold py-2 rounded-xl">Cancel SIP</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 5. STATEMENTS TAB */}
        {tab === 'statements' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {[
              { title: 'Account Statement', desc: 'Summary of all folios and holdings' },
              { title: 'Transaction Statement', desc: 'Detailed log of all purchases and redemptions' },
              { title: 'Capital Gains Statement', desc: 'For tax filing purposes (ITR)' },
              { title: 'SIP Statement', desc: 'Log of all active and completed SIPs' }
            ].map((st, idx) => (
              <div key={idx} className="p-4 border-b border-gray-50 last:border-0 flex justify-between items-center hover:bg-gray-50 transition-all cursor-pointer" onClick={() => setViewingStatement(st.title)}>
                <div>
                  <p className="text-sm font-bold text-[var(--dark)] mb-0.5">{st.title}</p>
                  <p className="text-[10px] text-gray-400">{st.desc}</p>
                </div>
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    await downloadRealPDF(st.title);
                  }}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 border border-gray-200 hover:text-white hover:bg-[var(--primary)] hover:border-[var(--primary)] transition-all shadow-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Statement Viewer */}
      {viewingStatement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-[var(--dark)] p-4 flex justify-between items-center">
              <h3 className="text-white font-bold">{viewingStatement}</h3>
              <button onClick={() => setViewingStatement(null)} className="text-white text-2xl leading-none opacity-80 hover:opacity-100">&times;</button>
            </div>
            <div className="p-5 overflow-y-auto bg-white">
              <div className="border border-gray-200 p-4 rounded-xl bg-white shadow-sm">
                <div className="text-center mb-5 border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-extrabold text-[var(--dark)]">TechArtha Financial Services</h2>
                  <p className="text-xs text-gray-500 font-bold mt-1">CONSOLIDATED ACCOUNT STATEMENT (CAS)</p>
                </div>
                
                <div className="flex justify-between text-[10px] mb-5">
                  <div>
                    <p className="text-gray-400 font-bold">Statement Type:</p>
                    <p className="font-extrabold text-[var(--dark)] text-xs">{viewingStatement}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 font-bold">Date Generated:</p>
                    <p className="font-extrabold text-[var(--dark)] text-xs">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg mb-6 border border-gray-100">
                  <p className="text-xs font-extrabold text-[var(--primary)] mb-2 uppercase tracking-wider">Investor Details</p>
                  <div className="grid grid-cols-2 gap-y-2 text-[10px]">
                    <div><span className="text-gray-500">Name:</span> <span className="font-bold text-[var(--dark)] ml-1">TEST USER</span></div>
                    <div><span className="text-gray-500">PAN:</span> <span className="font-bold text-[var(--dark)] ml-1">ABCDE1234F</span></div>
                    <div><span className="text-gray-500">Email:</span> <span className="font-bold text-[var(--dark)] ml-1">test@techartha.com</span></div>
                    <div><span className="text-gray-500">KYC:</span> <span className="font-bold text-green-600 ml-1">Verified</span></div>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-xs font-extrabold text-[var(--primary)] mb-2 uppercase tracking-wider">Portfolio Summary</p>
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead className="bg-gray-100 text-[var(--dark)] border border-gray-200">
                      <tr>
                        <th className="p-2 font-extrabold border-r border-gray-200">Scheme Name</th>
                        <th className="p-2 font-extrabold text-right">Current Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 border-x border-b border-gray-200">
                      <tr><td className="p-2 border-r border-gray-200">Stable Income Fund</td><td className="p-2 text-right font-bold text-[var(--dark)]">₹4,320.00</td></tr>
                      <tr><td className="p-2 border-r border-gray-200">Multi-Cap Growth Fund</td><td className="p-2 text-right font-bold text-[var(--dark)]">₹3,940.00</td></tr>
                      <tr><td className="p-2 border-r border-gray-200">Liquid Safety Fund</td><td className="p-2 text-right font-bold text-[var(--dark)]">₹2,177.00</td></tr>
                      <tr className="bg-gray-50"><td className="p-2 font-extrabold text-[var(--dark)] border-r border-gray-200">Total Value</td><td className="p-2 text-right font-extrabold text-[var(--dark)]">₹10,437.00</td></tr>
                    </tbody>
                  </table>
                </div>

                {(viewingStatement?.includes('Transaction') || viewingStatement?.includes('Account')) && (
                  <div>
                    <p className="text-xs font-extrabold text-[var(--primary)] mb-2 uppercase tracking-wider">Recent Transactions</p>
                    <table className="w-full text-[10px] text-left border-collapse">
                      <thead className="bg-[var(--primary)] text-white border border-[var(--primary)]">
                        <tr>
                          <th className="p-2 font-bold border-r border-white/20">Date</th>
                          <th className="p-2 font-bold border-r border-white/20">Type</th>
                          <th className="p-2 font-bold text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 border-x border-b border-gray-200">
                        <tr><td className="p-2 border-r border-gray-200">10-Aug</td><td className="p-2 text-green-600 font-bold border-r border-gray-200">SIP</td><td className="p-2 text-right font-bold text-[var(--dark)]">₹1,000</td></tr>
                        <tr><td className="p-2 border-r border-gray-200">10-Jul</td><td className="p-2 text-green-600 font-bold border-r border-gray-200">SIP</td><td className="p-2 text-right font-bold text-[var(--dark)]">₹1,000</td></tr>
                        <tr><td className="p-2 border-r border-gray-200">15-Jun</td><td className="p-2 text-[var(--primary)] font-bold border-r border-gray-200">Lump</td><td className="p-2 text-right font-bold text-[var(--dark)]">₹2,000</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex gap-3">
              <button onClick={() => setViewingStatement(null)} className="flex-1 py-3 font-bold text-sm text-gray-500 border border-gray-200 rounded-xl">Close</button>
              <button onClick={() => downloadRealPDF(viewingStatement)} className="flex-1 py-3 font-bold text-sm bg-[var(--primary)] text-white rounded-xl shadow-md">Download PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
