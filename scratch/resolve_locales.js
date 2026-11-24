const fs = require('fs');
const locales = ['as','bn','en','gu','hi','kn','ml','mr','or','pa','ta','te'];

for (const loc of locales) {
  const p = 'apps/web/i18n/locales/' + loc + '/common.json';
  let content = fs.readFileSync(p, 'utf8');

  // Conflict 1: welcome.badge1 & welcome.badge2 -> Keep HEAD (SEBI / AMFI, no BSE)
  content = content.replace(/<<<<<<< HEAD\r?\n([\s\S]*?"welcome\.badge1"[\s\S]*?"welcome\.badge2"[^\n]*\r?\n)=======\r?\n[\s\S]*?>>>>>>> origin\/main\r?\n/g, '$1');

  // Conflict 2: profile.footer (if any) -> Keep HEAD
  content = content.replace(/<<<<<<< HEAD\r?\n([\s\S]*?"profile\.footer"[^\n]*\r?\n)=======\r?\n[\s\S]*?>>>>>>> origin\/main\r?\n/g, '$1');

  // Conflict 3: signup.passwordMismatch + new profile keys from origin/main
  // In origin/main: signup.passwordMismatch has trailing comma and adds profile.* keys
  content = content.replace(/<<<<<<< HEAD\r?\n[\s\S]*?"signup\.passwordMismatch"[^\n]*\r?\n=======\r?\n([\s\S]*?"signup\.passwordMismatch"[\s\S]*?)>>>>>>> origin\/main\r?\n/g, '$1');

  // Double check if any conflict markers remain
  if (content.includes('<<<<<<<') || content.includes('=======') || content.includes('>>>>>>>')) {
    console.error('Remaining conflict markers in ' + loc);
    process.exit(1);
  }

  // Parse JSON to verify syntax
  try {
    JSON.parse(content);
  } catch (err) {
    console.error('JSON parse error in ' + loc + ':', err.message);
    process.exit(1);
  }

  fs.writeFileSync(p, content, 'utf8');
  console.log('Successfully resolved and validated ' + loc);
}
