#!/usr/bin/env node
/**
 * Cross-platform LAN / Hotspot IPv4 detector (Windows, macOS, Linux).
 *
 * Inspects active OS network interfaces and selects the best reachable IPv4
 * address for mobile devices on Wi-Fi or mobile hotspot, while ignoring
 * virtual adapters (WSL, Hyper-V, Docker, VMware, VirtualBox, VPNs) and
 * link-local APIPA addresses (169.254.x.x).
 */
const os = require('os');

const VIRTUAL_INTERFACE_PATTERN =
  /vethernet|wsl|docker|vbox|virtualbox|vmware|vmnet|hyper-v|loopback|tailscale|zerotier|hamachi|tun|tap|utun|bridge|br-/i;

const PREFERRED_INTERFACE_PATTERN =
  /wi-fi|wifi|wlan|en0|en1|wireless|local area connection\*|hotspot|eth|ethernet/i;

function isPrivateIpv4(ip) {
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(ip)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return true;
  const match172 = ip.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (match172) {
    const secondOctet = Number(match172[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }
  return false;
}

function scoreCandidate(name, address) {
  let score = 0;

  if (VIRTUAL_INTERFACE_PATTERN.test(name)) {
    score -= 100;
  }
  if (PREFERRED_INTERFACE_PATTERN.test(name)) {
    score += 40;
  }
  if (/wi-fi|wifi|wlan|en0/i.test(name)) {
    score += 25;
  }
  if (/^192\.168\./.test(address)) {
    score += 30;
  } else if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) {
    // Includes iOS Personal Hotspot (172.20.10.x)
    score += 20;
  } else if (/^10\./.test(address)) {
    score += 15;
  }

  return score;
}

function getLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, records] of Object.entries(interfaces)) {
    if (!Array.isArray(records)) continue;
    for (const record of records) {
      const family = typeof record.family === 'string' ? record.family : `IPv${record.family}`;
      if (family !== 'IPv4' || record.internal) continue;
      if (!record.address || record.address.startsWith('169.254.')) continue;

      candidates.push({
        name,
        address: record.address,
        private: isPrivateIpv4(record.address),
        score: scoreCandidate(name, record.address),
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length > 0) {
    return candidates[0].address;
  }

  return 'localhost';
}

if (require.main === module) {
  const ip = getLanIp();
  if (ip === 'localhost') {
    console.error(
      '[TechArtha] Could not determine an active LAN/Hotspot IPv4 address. Falling back to localhost.'
    );
  }
  process.stdout.write(`${ip}\n`);
}

module.exports = { getLanIp };
