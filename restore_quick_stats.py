import re

filepath = 'apps/web/app/dashboard/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace Quick Actions with Quick Stats
quick_stats = """      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div onClick={() => router.push('/dashboard/analytics')} className="bg-white text-center py-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-[var(--primary)]">
          <p className="text-2xl font-extrabold text-[var(--primary)]">12.4%</p>
          <p className="text-xs text-gray-400 mt-1 font-semibold uppercase tracking-wider">Annualised Returns</p>
        </div>
        <div onClick={() => router.push('/goals')} className="bg-white text-center py-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-[var(--primary)]">
          <p className="text-2xl font-extrabold text-[var(--orange)]">8 yrs</p>
          <p className="text-xs text-gray-400 mt-1 font-semibold uppercase tracking-wider">Goal Horizon</p>
        </div>
      </div>"""

code = re.sub(r'      {/\* Quick Actions \*/}.*?</div>\n      </div>', quick_stats, code, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Restored Quick Stats!")
