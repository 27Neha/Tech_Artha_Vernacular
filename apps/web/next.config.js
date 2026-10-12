const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits .next/standalone - a self-contained server.js plus only the traced
  // dependencies. This is what apps/web/Dockerfile ships.
  output: 'standalone',
  experimental: {
    // Without this, tracing starts at apps/web and misses the root node_modules that
    // npm hoists to, producing a standalone bundle that crashes on a missing module.
    outputFileTracingRoot: path.join(__dirname, '../..'),
  },
};

module.exports = nextConfig;
