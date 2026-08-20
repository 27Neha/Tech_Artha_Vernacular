import re

filepath = 'apps/web/app/dashboard/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Remove the TA circle
code = re.sub(r'<div className="w-12 h-12 bg-\[var\(--primary-light\)\].*?TA\s*</div>', '', code, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Removed TA circle!")
