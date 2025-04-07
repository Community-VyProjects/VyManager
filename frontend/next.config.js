/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_CORS_ALLOW_ORIGIN || '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: process.env.NEXT_PUBLIC_CORS_ALLOW_METHODS || 'GET,POST,PUT,DELETE',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: process.env.NEXT_PUBLIC_CORS_ALLOW_HEADERS || 'Content-Type,Authorization',
          },
        ],
      },
    ];
  },
  // Disable opening files in editor
  onDemandEntries: {
    // Disable opening files in editor
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig; 