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
      // Note: /api/session/* is handled by API routes, not rewrites
    ];
  },
};

export default nextConfig;
