const fs = require('fs');
let code = fs.readFileSync('apps/mobile/src/screens/LoginScreen.tsx', 'utf8');
code = code.replace(/navigation\.navigate\('KYC'\)/g, "navigation.navigate('ProfileSetup')");
fs.writeFileSync('apps/mobile/src/screens/LoginScreen.tsx', code);
