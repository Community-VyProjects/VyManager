import { NextRequest } from "next/server";
import { proxyOauthConfig } from "@/lib/oauth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// oauth_providers is owned by the backend; these handlers proxy to it and
// invalidate better-auth's cache on a successful write (see oauth-proxy).

const backendPath = (providerId: string) =>
  `/oauth-config/${encodeURIComponent(providerId)}`;

// GET /api/oauth-config/[providerId] — single provider (includes clientSecret)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await params;
  return proxyOauthConfig(request, backendPath(providerId), "GET");
}

// PUT /api/oauth-config/[providerId] — full update
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await params;
  return proxyOauthConfig(request, backendPath(providerId), "PUT");
}

// PATCH /api/oauth-config/[providerId] — toggle enabled only
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await params;
  return proxyOauthConfig(request, backendPath(providerId), "PATCH");
}

// DELETE /api/oauth-config/[providerId] — remove provider
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await params;
  return proxyOauthConfig(request, backendPath(providerId), "DELETE");
}
