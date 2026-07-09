import { NextRequest } from "next/server";
import { proxyOauthConfig } from "@/lib/oauth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// oauth_providers is owned by the backend; these handlers proxy to it and
// invalidate better-auth's cache on a successful write (see oauth-proxy).

// GET /api/oauth-config — list all providers (no secrets)
export async function GET(request: NextRequest) {
  return proxyOauthConfig(request, "/oauth-config", "GET");
}

// POST /api/oauth-config — create or update a provider
export async function POST(request: NextRequest) {
  return proxyOauthConfig(request, "/oauth-config", "POST");
}
