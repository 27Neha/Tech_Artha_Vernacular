#!/usr/bin/env node
/**
 * Cross-platform Expo launcher for TechArtha Mobile (Windows, macOS, Linux).
 *
 * Supports:
 *   - LAN / Hotspot mode:  node ./scripts/start-expo.js --lan
 *   - Tunnel mode:         node ./scripts/start-expo.js --tunnel
 *   - Localhost mode:      node ./scripts/start-expo.js --localhost
 *
 * Automatically resolves the developer machine's current Wi-Fi or Mobile Hotspot
 * IPv4 address when EXPO_PUBLIC_API_URL is unset or set to "auto", while preserving
 * any explicit EXPO_PUBLIC_API_URL configured in the environment, .env.local, or .env.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { getLanIp } = require('./dev-ip');

const MOBILE_ROOT = path.resolve(__dirname, '..');
const WORKSPACE_ROOT = path.resolve(MOBILE_ROOT, '../..');

function readEnvFileValues(filePath) {
  const result = {};
  if (!fs.existsSync(filePath)) return result;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const val = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    result[key] = val;
  }
  return result;
}

function loadConfiguredEnv() {
  const envDefault = readEnvFileValues(path.join(MOBILE_ROOT, '.env'));
  const envLocal = readEnvFileValues(path.join(MOBILE_ROOT, '.env.local'));
  return { ...envDefault, ...envLocal };
}

function hasNgrokPackage() {
  try {
    require.resolve('@expo/ngrok', { paths: [MOBILE_ROOT, WORKSPACE_ROOT] });
    return true;
  } catch {
    return false;
  }
}

function resolveExpoCliBin() {
  return require.resolve('expo/bin/cli', { paths: [MOBILE_ROOT, WORKSPACE_ROOT] });
}

function resolveNetworkMode(args) {
  if (args.includes('--tunnel')) return 'tunnel';
  if (args.includes('--localhost')) return 'localhost';
  if (args.includes('--offline')) return 'offline';
  return 'lan';
}

function main() {
  const rawArgs = process.argv.slice(2);
  const mode = resolveNetworkMode(rawArgs);
  const fileEnv = loadConfiguredEnv();

  const apiPort =
    process.env.EXPO_PUBLIC_API_PORT ||
    fileEnv.EXPO_PUBLIC_API_PORT ||
    '3000';

  const explicitApiUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    fileEnv.EXPO_PUBLIC_API_URL ||
    '';

  const isAutoApiUrl =
    !explicitApiUrl || explicitApiUrl.trim().toLowerCase() === 'auto';

  const lanIp = getLanIp();

  let resolvedApiUrl = explicitApiUrl.trim();
  let resolutionSource = 'custom (EXPO_PUBLIC_API_URL)';

  if (isAutoApiUrl) {
    if (mode === 'localhost') {
      resolvedApiUrl = `http://localhost:${apiPort}`;
      resolutionSource = 'auto (localhost mode)';
    } else {
      resolvedApiUrl = `http://${lanIp}:${apiPort}`;
      resolutionSource = `auto-detected LAN/Hotspot IP (${lanIp})`;
    }
  }

  const env = {
    ...process.env,
    EXPO_PUBLIC_API_URL: resolvedApiUrl,
    EXPO_PUBLIC_API_PORT: apiPort,
    EXPO_NO_TELEMETRY: process.env.EXPO_NO_TELEMETRY || '1',
  };

  if (mode === 'lan' && lanIp !== 'localhost' && !env.REACT_NATIVE_PACKAGER_HOSTNAME) {
    env.REACT_NATIVE_PACKAGER_HOSTNAME = lanIp;
  }

  const expoCliBin = resolveExpoCliBin();
  const expoArgs = [expoCliBin, 'start'];
  const hasExplicitHostFlag = rawArgs.some((a) =>
    ['--lan', '--tunnel', '--localhost', '--offline'].includes(a)
  );
  if (!hasExplicitHostFlag) {
    expoArgs.push(`--${mode}`);
  }
  expoArgs.push(...rawArgs);

  console.log('------------------------------------------------------------');
  console.log(' TechArtha Mobile — Expo Development Launcher');
  console.log('------------------------------------------------------------');
  console.log(` Network Mode      : ${mode.toUpperCase()}`);
  console.log(` Detected Host IP  : ${lanIp}`);
  console.log(` Backend API URL   : ${resolvedApiUrl} [${resolutionSource}]`);

  if (mode === 'tunnel') {
    const isPrivateOrLocalApi =
      /^http:\/\/(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(resolvedApiUrl);
    if (isPrivateOrLocalApi) {
      console.log('');
      console.log(' [NOTE] Expo "--tunnel" tunnels the Metro JS bundler (port 8081),');
      console.log('        NOT the NestJS API (port 3000).');
      console.log(`        • Same Wi-Fi / Hotspot devices will reach API at ${resolvedApiUrl}`);
      console.log('        • Different-network / mobile-data devices require a public');
      console.log('          API URL or tunnel in apps/mobile/.env.local:');
      console.log('          EXPO_PUBLIC_API_URL=https://<your-port-3000-tunnel-url>');
    }
    if (!hasNgrokPackage()) {
      console.log('');
      console.log(' [NOTE] @expo/ngrok is required by Expo CLI for --tunnel mode.');
      console.log('        If prompted or if tunnel fails to start, install it once:');
      console.log('        npx expo install @expo/ngrok@^4.1.0');
    }
  }
  console.log('------------------------------------------------------------');

  const child = spawn(process.execPath, expoArgs, {
    cwd: MOBILE_ROOT,
    env,
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main();
