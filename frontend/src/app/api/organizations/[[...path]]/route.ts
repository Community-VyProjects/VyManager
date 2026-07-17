/**
 * Organizations API proxy.
 *
 * Forwards /api/organizations/* to the backend organization-management
 * endpoints, passing the session cookie through for auth.
 */
import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = () => process.env.BACKEND_URL || "http://backend:8000";

async function proxy(
  request: NextRequest,
  path: string[] | undefined,
  method: string,
) {
  // Secure-cookie deployments prefix the name with __Secure-; read whichever is present
  const sessionToken =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");
  const suffix = path && path.length ? `/${path.map(encodeURIComponent).join("/")}` : "";
  const url = new URL(`${getBackendUrl()}/organizations${suffix}`);
  request.nextUrl.searchParams.forEach((v, k) => url.searchParams.append(k, v));

  const headers: Record<string, string> = {};
  if (sessionToken) {
    headers["Cookie"] = `${sessionToken.name}=${sessionToken.value}`;
  }

  let body: string | undefined;
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    headers["Content-Type"] = "application/json";
    body = await request.text();
  }

  const res = await fetch(url.toString(), { method, headers, body: body || undefined });
  const text = await res.text();
  return new NextResponse(text || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  return proxy(request, (await params).path, "GET");
}
export async function POST(request: NextRequest, { params }: Ctx) {
  return proxy(request, (await params).path, "POST");
}
export async function PATCH(request: NextRequest, { params }: Ctx) {
  return proxy(request, (await params).path, "PATCH");
}
export async function DELETE(request: NextRequest, { params }: Ctx) {
  return proxy(request, (await params).path, "DELETE");
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
