/**
 * Organizations API proxy.
 *
 * Forwards /api/organizations/* to the backend organization-management
 * endpoints, passing the session cookie through for auth.
 */
import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

type Ctx = { params: Promise<{ path?: string[] }> };

async function handle(request: NextRequest, params: Ctx["params"], method: string) {
  const { path } = await params;
  const suffix =
    path && path.length ? `/${path.map(encodeURIComponent).join("/")}` : "";
  return proxyToBackend(request, {
    path: `/organizations${suffix}`,
    method,
    body: "text",
    response: "passthrough",
    logLabel: "OrganizationsProxy",
  });
}

export async function GET(request: NextRequest, { params }: Ctx) {
  return handle(request, params, "GET");
}
export async function POST(request: NextRequest, { params }: Ctx) {
  return handle(request, params, "POST");
}
export async function PATCH(request: NextRequest, { params }: Ctx) {
  return handle(request, params, "PATCH");
}
export async function DELETE(request: NextRequest, { params }: Ctx) {
  return handle(request, params, "DELETE");
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
