import { NextRequest } from "next/server";
import { proxyOauthConfig } from "@/lib/oauth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// oauth_role_mappings is owned by the backend; these handlers proxy to it and
// invalidate better-auth's rule cache on a successful write (see oauth-proxy).

// PUT /api/oauth-config/[providerId]/role-mappings/[id] — update a rule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string; id: string }> }
) {
  const { providerId, id } = await params;
  return proxyOauthConfig(
    request,
    `/oauth-config/${encodeURIComponent(providerId)}/role-mappings/${encodeURIComponent(id)}`,
    "PUT"
  );
}

// DELETE /api/oauth-config/[providerId]/role-mappings/[id] — remove a rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string; id: string }> }
) {
  const { providerId, id } = await params;
  return proxyOauthConfig(
    request,
    `/oauth-config/${encodeURIComponent(providerId)}/role-mappings/${encodeURIComponent(id)}`,
    "DELETE"
  );
}
