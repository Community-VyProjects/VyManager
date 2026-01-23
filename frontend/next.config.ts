import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/vyos/:path*',
        destination: `${apiUrl}/vyos/:path*`,
      },
      {
        source: '/api/dashboard/:path*',
        destination: `${apiUrl}/dashboard/:path*`,
      },
      {
        source: '/api/user-management/:path*',
        destination: `${apiUrl}/user-management/:path*`,
      },
      {
        source: '/api/monitoring/:path*',
        destination: `${apiUrl}/monitoring/:path*`,
      },
      {
        source: '/api/search',
        destination: `${apiUrl}/search`,
      },
      // Note: /api/session/* is handled by API routes, not rewrites
    ];
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
