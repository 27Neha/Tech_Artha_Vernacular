import re

filepath = 'apps/web/app/funds/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the riskFilter effect to fetch from search API
new_effect = """  const [filteredFunds, setFilteredFunds] = useState<any[]>([]);

  useEffect(() => {
    const fetchFiltered = async (cat: string) => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/funds/search?q=${cat}`);
        const data = await res.json();
        setFilteredFunds(data?.items?.slice(0, 10) || []);
      } catch (e) {
        setFilteredFunds([]);
      } finally {
        setLoading(false);
      }
    };

    if (!riskFilter) {
      setFilteredFunds([]);
    } else if (riskFilter === 'Conservative') {
      fetchFiltered('Debt');
    } else if (riskFilter === 'Moderate') {
      fetchFiltered('Hybrid');
    } else if (riskFilter === 'Aggressive') {
      fetchFiltered('Equity');
    }
  }, [riskFilter]);"""
code = re.sub(r'  useEffect\(\(\) => \{\n    if \(\!riskFilter\).*?\}, \[riskFilter, allBuckets\]\);', new_effect, code, flags=re.DOTALL)

# Now, in the render block, if riskFilter is set, show filteredFunds instead of recommended
render_logic = """          <div className="mt-4">
            <h3 className="font-extrabold text-[var(--dark)] mb-4 text-lg">
              {riskFilter ? `${riskFilter} Funds` : 'Recommended For You'}
            </h3>
            
            {riskFilter && !loading && filteredFunds.length > 0 && (
              <div className="flex flex-col gap-3 mt-2">
                <p className="text-xs text-gray-500 mb-2">Showing top {riskFilter.toLowerCase()} funds from MFAPI:</p>
                {filteredFunds.map((f: any, i: number) => (
                  <div key={i} className="card bg-white hover:border-[var(--primary)] cursor-pointer transition-all shadow-sm border border-gray-100 p-4 rounded-xl" onClick={() => router.push(`/funds/${f.schemeCode}`)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4 min-w-0">
                        <p className="font-bold text-[var(--dark)] text-sm leading-tight truncate">{f.schemeName}</p>
                        <p className="text-gray-400 text-xs mt-1">Scheme Code: {f.schemeCode}</p>
                      </div>
                      <div className="text-right flex items-center h-full">
                        <span className="text-[var(--primary)] text-xl font-bold">→</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!riskFilter && recommended.length > 0 ? (
              <div className="flex flex-col gap-3">"""

code = re.sub(r'          <div className="mt-4">\n            <h3 className="font-extrabold text-\[var\(--dark\)\] mb-4 text-lg">Recommended For You</h3>\n            \{recommended\.length > 0 \? \(\n              <div className="flex flex-col gap-3">', render_logic, code, flags=re.DOTALL)

# Add closing tags for the new logic
closing_tags = """              </div>
            ) : !riskFilter && (
              <div className="text-center mt-12 opacity-50">
                <span className="text-4xl block mb-3">📈</span>
                <p className="text-sm font-bold">Complete your profile to see recommendations</p>
              </div>
            )}
          </div>"""
code = re.sub(r'              </div>\n            \) : \(\n              <div className="text-center mt-12 opacity-50">\n                <span className="text-4xl block mb-3">📈</span>\n                <p className="text-sm font-bold">Complete your profile to see recommendations</p>\n              </div>\n            \)\}\n          </div>', closing_tags, code, flags=re.DOTALL)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated funds page with nature-wise MFAPI fetching!")
