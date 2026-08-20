import re

filepath = 'apps/web/app/dashboard/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

original_card = """      {/* Balance Card */}
      <div className="bg-[var(--primary)] rounded-3xl p-6 mb-6 text-white shadow-xl shadow-indigo-900/10">
        <p className="text-[#EBEAF8] text-xs font-bold tracking-widest uppercase">TOTAL INVESTED</p>
        <p className="text-5xl font-extrabold mt-2">₹9,286</p>
        <p className="text-[#EBEAF8] text-sm mt-1">This month's SIP · Next: 10th Sep</p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => router.push('/funds')}
            className="bg-white text-[var(--primary)] font-bold text-sm px-5 py-2.5 rounded-xl"
          >
            Browse Funds
          </button>
          <button 
            onClick={() => router.push('/dashboard/analytics')}
            className="bg-white/20 text-white font-bold text-sm px-5 py-2.5 rounded-xl"
          >
            View Details
          </button>
        </div>
      </div>"""

# Replace the Hero Banner with the original card
code = re.sub(r'      {/\* Hero Banner \*/}.*?</div>\n      </div>', original_card, code, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Restored original card!")
