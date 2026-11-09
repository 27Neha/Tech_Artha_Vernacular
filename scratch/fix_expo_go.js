const fs = require('fs');
const path = require('path');

// 1. Update app.json
const appJsonPath = path.resolve('apps/mobile/app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Filter out expo-speech-recognition from plugins
if (Array.isArray(appJson.expo.plugins)) {
  appJson.expo.plugins = appJson.expo.plugins.filter((p) => {
    if (typeof p === 'string') return p !== 'expo-speech-recognition';
    if (Array.isArray(p)) return p[0] !== 'expo-speech-recognition';
    return true;
  });
}
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\r\n', 'utf8');
console.log('app.json: removed unsupported native plugin from Expo Go configuration');

// 2. Update start-expo.js to ensure --go is always passed for Expo Go
const startExpoPath = path.resolve('apps/mobile/scripts/start-expo.js');
let startExpoContent = fs.readFileSync(startExpoPath, 'utf8');
const isCRLF = startExpoContent.includes('\r\n');
startExpoContent = startExpoContent.replace(/\r\n/g, '\n');

if (!startExpoContent.includes("'--go'")) {
  startExpoContent = startExpoContent.replace(
    "const expoArgs = [expoCliBin, 'start'];",
    "const expoArgs = [expoCliBin, 'start', '--go'];"
  );
  if (isCRLF) startExpoContent = startExpoContent.replace(/\n/g, '\r\n');
  fs.writeFileSync(startExpoPath, startExpoContent, 'utf8');
  console.log('start-expo.js: added --go flag to ensure Expo Go compatibility');
}
