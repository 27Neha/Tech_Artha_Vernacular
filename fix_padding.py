import re

filepath = 'apps/web/app/risk/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Fix the padding so the header isn't hidden under the global navbar
code = code.replace('className="bg-[var(--primary)] text-white px-6 pt-6 pb-8"', 'className="bg-[var(--primary)] text-white px-6 pt-24 pb-8"')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed top padding!")
