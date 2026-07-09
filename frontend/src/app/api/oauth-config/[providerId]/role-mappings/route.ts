import { NextRequest } from "next/server";
import { proxyRoleMapping } from "@/lib/oauth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// oauth_role_mappings is owned by the backend; these handlers proxy to it and
// invalidate better-auth's rule cache on a successful write (see oauth-proxy).

// GET /api/oauth-config/[providerId]/role-mappings — list rules for a provider
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await params;
  return proxyRoleMapping(
    request,
    `/oauth-config/${encodeURIComponent(providerId)}/role-mappings`,
    "GET"
  );
}

// POST /api/oauth-config/[providerId]/role-mappings — create a rule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await params;
  return proxyRoleMapping(
    request,
    `/oauth-config/${encodeURIComponent(providerId)}/role-mappings`,
    "POST"
  );
}
