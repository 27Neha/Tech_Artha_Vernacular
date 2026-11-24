const fs = require('fs');
let code = fs.readFileSync('apps/web/app/TranslationProvider.tsx', 'utf8');
code = code.replace(/\{\/\* @ts-expect-error React 19 typing mismatch \*\/\}\\n    <I18nextProvider i18n=\{i18n\}>/, "{/* @ts-expect-error React 19 typing mismatch */}\n    <I18nextProvider i18n={i18n}>");
fs.writeFileSync('apps/web/app/TranslationProvider.tsx', code);
