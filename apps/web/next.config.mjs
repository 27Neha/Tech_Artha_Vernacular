/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const target = process.env.API_INTERNAL_URL || 'http://127.0.0.1:3000';
    return [
      {
        source: '/api/:path*',
        destination: `${target}/:path*`,
      },
    ];
  },
};

export default nextConfig;
