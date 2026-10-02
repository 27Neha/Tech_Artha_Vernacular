const fs = require('fs');
let code = fs.readFileSync('apps/web/app/TranslationProvider.tsx', 'utf8');
code = code.replace(/return \(\s*\{\/\* @ts-expect-error React 19 typing mismatch \*\/\}\s*<I18nextProvider i18n=\{i18n\}>/, "return (\n    <>\n      {/* @ts-expect-error React 19 typing mismatch */}\n      <I18nextProvider i18n={i18n}>");
code = code.replace(/<\/I18nextProvider>\s*\);/, "</I18nextProvider>\n    </>\n  );");
fs.writeFileSync('apps/web/app/TranslationProvider.tsx', code);
