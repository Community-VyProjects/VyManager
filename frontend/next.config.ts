import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/vyos/:path*',
        destination: `${apiUrl}/vyos/:path*`,
      },
    ];
  },
  // Suppress cross-origin warning - we handle CORS through Better Auth trustedOrigins
  experimental: {
    // @ts-ignore - allowedDevOrigins is not in the type definitions yet
    allowedDevOrigins: ['*'], // Allow all origins (controlled by Better Auth in production)
  },
};

export default nextConfig;
