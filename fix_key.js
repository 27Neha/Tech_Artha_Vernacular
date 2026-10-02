const fs = require('fs');
let code = fs.readFileSync('apps/web/app/page.tsx', 'utf8');
code = code.replace(/t\('common\.continue'\)/g, "t('signup.continue')");
fs.writeFileSync('apps/web/app/page.tsx', code);
