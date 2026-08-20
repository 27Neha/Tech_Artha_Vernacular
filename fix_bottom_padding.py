import re

filepath = 'apps/web/app/risk/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Fix bottom padding
code = code.replace('className="flex flex-col min-h-screen bg-white pb-24"', 'className="flex flex-col min-h-screen bg-white pb-40"')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed bottom padding!")
