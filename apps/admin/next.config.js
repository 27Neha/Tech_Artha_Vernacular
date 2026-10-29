const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../..'),
  },
  webpack: (config) => {
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
      'node_modules',
    ];
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'lucide-react$': path.resolve(__dirname, '../../node_modules/lucide-react/dist/esm/lucide-react.js'),
    };
    return config;
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
