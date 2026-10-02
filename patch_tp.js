const fs = require('fs');
let code = fs.readFileSync('apps/web/app/TranslationProvider.tsx', 'utf8');

if (!code.includes('I18nextProvider')) {
  code = code.replace(/import i18n from '\.\.\/i18n\/i18n';/, "import i18n from '../i18n/i18n';\nimport { I18nextProvider } from 'react-i18next';");
  code = code.replace(/<TranslationContext\.Provider value=\{\{ lang, setLang: changeLang, t, translateText \}\}>/, "<I18nextProvider i18n={i18n}>\n      <TranslationContext.Provider value={{ lang, setLang: changeLang, t, translateText }}>");
  code = code.replace(/<\/TranslationContext\.Provider>/, "</TranslationContext.Provider>\n    </I18nextProvider>");
  fs.writeFileSync('apps/web/app/TranslationProvider.tsx', code);
  console.log('Successfully wrapped TranslationProvider with I18nextProvider.');
} else {
  console.log('Already wrapped.');
}
