const fs = require('fs');
let c = fs.readFileSync('apps/web/app/dashboard/profile/page.tsx', 'utf8');
c = c.replace(/useState<string \| null>\(null\);\\n  const \[expanded/, 'useState<string | null>(null);\n  const [expanded');
fs.writeFileSync('apps/web/app/dashboard/profile/page.tsx', c, 'utf8');
