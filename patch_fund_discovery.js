const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/app/funds/page.tsx');

const content = `'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const SearchFundCard = ({ fund, onClick }: { fund: any, onClick: () => void }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-[var(--primary)] transition-colors cursor-pointer" onClick={onClick}>
    <div className="mb-3">
      <h4 className="font-bold text-[var(--dark)] text-sm leading-snug">{fund.schemeName}</h4>
      <p className="text-xs text-gray-400 mt-1">Scheme Code: {fund.schemeCode}</p>
    </div>
    <div className="flex justify-end pt-3 border-t border-gray-50">
      <button className="text-xs font-bold text-[var(--primary)] bg-blue-50 px-4 py-1.5 rounded-lg">View Fund</button>
    </div>
  </div>
);

const RecFundCard = ({ fund, onClick }: { fund: any, onClick: () => void }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-[var(--primary)] transition-colors cursor-pointer" onClick={onClick}>
    <div className="mb-3">
      <h4 className="font-bold text-[var(--dark)] text-sm leading-snug">{fund.name}</h4>
      <div className="flex flex-wrap gap-2 mt-2">
        {fund.category && <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded uppercase">{fund.category}</span>}
        <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-1 rounded uppercase">Matches your profile</span>
      </div>
    </div>
    <div className="flex justify-between items-center pt-3 border-t border-gray-50">
      <div>
        <p className="text-[10px] text-gray-400">Latest NAV</p>
        <p className="text-sm font-extrabold text-[var(--dark)]">₹{fund.nav ? parseFloat(fund.nav).toFixed(2) : 'N/A'}</p>
      </div>
      <button className="text-xs font-bold text-white bg-[var(--primary)] px-4 py-1.5 rounded-lg shadow-sm">View Fund</button>
    </div>
  </div>
);

const FilterChip = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={\`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-colors \${
      active ? 'bg-[var(--primary)] text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
    }\`}
  >
    {label}
  </button>
);

const SkeletonCard = () => (
  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-3 bg-gray-100 rounded w-1/2 mb-4"></div>
    <div className="h-10 bg-gray-50 rounded mt-4"></div>
  </div>
);

export default function FundDiscoveryPage() {
  const router = useRouter();
  
  // State
  const [investorProfile, setInvestorProfile] = useState<string | null>(null);
  const [recommended, setRecommended] = useState<any[]>([]);
  
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [activeFilter, setActiveFilter] = useState('Recommended');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categoryResults, setCategoryResults] = useState<any[]>([]);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);

  // Initialize data
  useEffect(() => {
    const fetchBuckets = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setInvestorProfile('ASSESSMENT_REQUIRED');
          setActiveFilter('All');
          return;
        }
        
        const res = await fetch(\`\${API_URL}/buckets\`, { headers: { 'Authorization': \`Bearer \${token}\` } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        setInvestorProfile(data.investorProfile);
        
        if (data.investorProfile === 'ASSESSMENT_REQUIRED') {
          setActiveFilter('All');
        }

        const recBucket = data.buckets?.find((b: any) => b.recommended);
        if (recBucket?.recommendedFunds) {
          setRecommended(recBucket.recommendedFunds);
        }
      } catch (e) {
        setInvestorProfile('ASSESSMENT_REQUIRED');
        setActiveFilter('All');
      }
    };
    fetchBuckets();
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Execute search
  useEffect(() => {
    const doSearch = async () => {
      if (!debouncedQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(\`\${API_URL}/funds/search?q=\${encodeURIComponent(debouncedQuery)}\`);
        const data = await res.json();
        setSearchResults(data?.items ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    doSearch();
  }, [debouncedQuery]);

  // Execute category/risk filter
  useEffect(() => {
    const doCategoryFetch = async () => {
      if (activeFilter === 'Recommended' || activeFilter === 'All') {
        setCategoryResults([]);
        return;
      }

      setIsLoadingCategory(true);
      try {
        let searchTerm = activeFilter;
        if (activeFilter === 'Conservative') searchTerm = 'Debt';
        if (activeFilter === 'Moderate') searchTerm = 'Hybrid';
        if (activeFilter === 'Aggressive') searchTerm = 'Equity';
        
        if (activeFilter === 'Category') {
            searchTerm = categoryFilter;
        }

        const res = await fetch(\`\${API_URL}/funds/search?q=\${encodeURIComponent(searchTerm)}\`);
        const data = await res.json();
        setCategoryResults(data?.items?.slice(0, 15) || []);
      } catch (e) {
        setCategoryResults([]);
      } finally {
        setIsLoadingCategory(false);
      }
    };
    doCategoryFetch();
  }, [activeFilter, categoryFilter]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB] pb-20">
      
      {/* Page Title */}
      <div className="px-5 pt-4 pb-2">
        <h1 className="text-2xl font-extrabold text-[var(--dark)] mb-1">Fund Discovery</h1>
        <p className="text-sm text-gray-500 leading-relaxed">Explore mutual funds based on your goals, risk comfort and investment preferences.</p>
      </div>

      {/* Search */}
      <div className="px-5 py-3 sticky top-0 z-10 bg-[#F8F9FB]">
        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200 focus-within:border-[var(--primary)] transition-colors">
          <span className="text-gray-400 text-lg">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search mutual funds..."
            className="flex-1 bg-transparent text-[var(--dark)] placeholder-gray-400 focus:outline-none text-sm font-medium"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {query.trim() ? (
         <div className="px-5 py-2">
           <h3 className="font-bold text-[var(--dark)] mb-3 text-xs text-gray-500 uppercase tracking-wider">Search Results</h3>
           {isSearching ? (
             <div className="flex flex-col gap-3">
               <SkeletonCard /><SkeletonCard /><SkeletonCard />
             </div>
           ) : searchResults.length > 0 ? (
             <div className="flex flex-col gap-3">
               {searchResults.map((f: any) => <SearchFundCard key={f.schemeCode} fund={f} onClick={() => router.push(\`/funds/\${f.schemeCode}\`)} />)}
             </div>
           ) : (
             <div className="text-center mt-16 opacity-70">
               <span className="text-4xl block mb-3">😕</span>
               <p className="font-bold text-[var(--dark)]">No funds found</p>
               <p className="text-sm text-gray-500 mt-1">Try another fund name or category.</p>
             </div>
           )}
         </div>
      ) : (
         <>
           {/* Filter Navigation */}
           <div className="flex gap-2 px-5 py-2 overflow-x-auto no-scrollbar scroll-smooth">
             {investorProfile && investorProfile !== 'ASSESSMENT_REQUIRED' && (
                <FilterChip label="Recommended" active={activeFilter === 'Recommended'} onClick={() => setActiveFilter('Recommended')} />
             )}
             <FilterChip label="All" active={activeFilter === 'All'} onClick={() => setActiveFilter('All')} />
             <FilterChip label="Conservative" active={activeFilter === 'Conservative'} onClick={() => { setActiveFilter('Conservative'); setCategoryFilter(''); }} />
             <FilterChip label="Moderate" active={activeFilter === 'Moderate'} onClick={() => { setActiveFilter('Moderate'); setCategoryFilter(''); }} />
             <FilterChip label="Aggressive" active={activeFilter === 'Aggressive'} onClick={() => { setActiveFilter('Aggressive'); setCategoryFilter(''); }} />
           </div>

           <div className="px-5 py-4">
             {activeFilter === 'Recommended' && investorProfile !== 'ASSESSMENT_REQUIRED' && (
                <div className="mb-8">
                  <div className="mb-4">
                    <h2 className="text-lg font-extrabold text-[var(--dark)]">Recommended for You</h2>
                    <p className="text-sm text-gray-500">Based on your {investorProfile?.toLowerCase() || 'current'} risk profile</p>
                  </div>
                  
                  {recommended.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {recommended.map(f => <RecFundCard key={f.schemeCode} fund={f} onClick={() => router.push(\`/funds/\${f.schemeCode}\`)} />)}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3"><SkeletonCard /><SkeletonCard /></div>
                  )}
                </div>
             )}

             {investorProfile === 'ASSESSMENT_REQUIRED' && activeFilter === 'All' && (
                <div className="mb-8 bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center shadow-sm">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-xl">🎯</div>
                  <h3 className="text-lg font-extrabold text-[var(--dark)] mb-2">Find funds that match you</h3>
                  <p className="text-sm text-gray-600 mb-5 leading-relaxed">Complete your risk profile to explore funds aligned with your risk comfort and investment goals.</p>
                  <button onClick={() => router.push('/risk')} className="w-full bg-[var(--primary)] text-white font-bold py-3.5 rounded-xl shadow-sm hover:opacity-90 transition-opacity">
                    Complete Risk Profile
                  </button>
                </div>
             )}

             {/* Explore Categories */}
             {(activeFilter === 'Recommended' || activeFilter === 'All') && (
                <div className="mb-8">
                  <h2 className="text-lg font-extrabold text-[var(--dark)] mb-3">Explore Funds</h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['Equity', 'Debt', 'Hybrid', 'Index', 'ELSS'].map(cat => (
                      <button 
                        key={cat}
                        onClick={() => { setActiveFilter('Category'); setCategoryFilter(cat); }}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 shadow-sm hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
             )}

             {/* Filtered Results */}
             {activeFilter !== 'Recommended' && activeFilter !== 'All' && (
                <div className="mt-4">
                   <div className="flex items-center justify-between mb-4">
                     <h2 className="text-lg font-extrabold text-[var(--dark)]">
                       {activeFilter === 'Category' ? \`\${categoryFilter} Funds\` : \`\${activeFilter} Risk Funds\`}
                     </h2>
                   </div>
                   {isLoadingCategory ? (
                     <div className="flex flex-col gap-3">
                       <SkeletonCard /><SkeletonCard /><SkeletonCard />
                     </div>
                   ) : categoryResults.length > 0 ? (
                     <div className="flex flex-col gap-3">
                       {categoryResults.map(f => <SearchFundCard key={f.schemeCode} fund={f} onClick={() => router.push(\`/funds/\${f.schemeCode}\`)} />)}
                     </div>
                   ) : (
                     <div className="text-center mt-12 opacity-70">
                       <p className="font-bold text-[var(--dark)]">No funds found for this category.</p>
                     </div>
                   )}
                </div>
             )}
           </div>
         </>
      )}
    </div>
  );
}
`;

fs.writeFileSync(filePath, content);
console.log('Fund Discovery Page completely redesigned.');
