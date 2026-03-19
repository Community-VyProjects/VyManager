import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // IMPORTANT: We do NOT use rewrites here because they are evaluated at BUILD TIME
  // and cannot be configured at runtime. Instead, all API proxying is done through
  // API route handlers in src/app/api/* which read BACKEND_URL at RUNTIME.
  //
  // This allows users to set BACKEND_URL=http://some-host:8000 in their .env
  // without needing to rebuild the Docker image.

  // Allow dev HMR from custom origins (for reverse proxy / custom domain access).
  // Set ALLOWED_DEV_ORIGINS as a comma-separated list in .env, e.g.:
  //   ALLOWED_DEV_ORIGINS=mysite.example.com,other.example.com
  ...(process.env.ALLOWED_DEV_ORIGINS
    ? { allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS.split(",").map(s => s.trim()) }
    : {}),
};

export default nextConfig;
