import re

filepath = 'apps/web/app/dashboard/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Remove the Quick Stats
code = re.sub(r'\s*\{/\* Quick Stats \*/\}.*?</div>\n      </div>', '', code, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Removed Quick Stats!")
