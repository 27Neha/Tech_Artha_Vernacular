const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../..'),
  },
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${process.env.API_BACKEND_URL || 'http://localhost:3000'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
