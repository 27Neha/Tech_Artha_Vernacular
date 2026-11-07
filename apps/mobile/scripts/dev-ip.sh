#!/usr/bin/env bash
# Cross-platform LAN / Hotspot IPv4 helper (delegates to Node.js so it works on macOS, Linux, and Windows Git Bash).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/dev-ip.js"
