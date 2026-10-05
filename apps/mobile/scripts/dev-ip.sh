#!/usr/bin/env bash
# Prints the Mac's current LAN IP, for baking into EXPO_PUBLIC_API_URL at bundle time.
#
# EXPO_PUBLIC_* vars are compiled into the bundle when Metro starts, so a hardcoded IP
# goes stale the moment DHCP reassigns one - and the app then fails with a network error
# that looks like a server problem. Resolving it at launch removes that whole class of
# confusion.
set -euo pipefail

for iface in en0 en1 en2; do
  ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
  if [ -n "$ip" ]; then
    echo "$ip"
    exit 0
  fi
done

echo "Could not determine a LAN IP (checked en0, en1, en2)." >&2
echo "Are you connected to Wi-Fi? Falling back to localhost - a phone will NOT reach this." >&2
echo "localhost"
