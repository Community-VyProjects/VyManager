import { NextRequest } from "next/server";
import { proxyOauthConfig } from "@/lib/oauth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public endpoint — enabled providers with no secrets, used by the login page.
// Proxies to the backend, which owns oauth_providers. No auth required.
export async function GET(request: NextRequest) {
  return proxyOauthConfig(request, "/oauth-config/public", "GET");
}
