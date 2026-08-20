import re

filepath = 'apps/web/app/buckets/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the h3 block with the new layout that includes bucketRiskLevel
new_header = """              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-[var(--dark)]">{b.name}</h3>
                {b.bucketRiskLevel && (
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {b.bucketRiskLevel}
                  </span>
                )}
              </div>"""

code = code.replace('<h3 className="font-bold text-lg text-[var(--dark)] mb-1">{b.name}</h3>', new_header)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated bucket UI to show risk level!")
