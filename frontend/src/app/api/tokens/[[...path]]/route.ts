/**
 * API Tokens Proxy Route
 *
 * Forwards /api/tokens and /api/tokens/* requests to the backend /tokens
 * endpoints, passing the auth session cookie through for identity.
 */

import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = () => process.env.BACKEND_URL || "http://backend:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, "POST");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, "DELETE");
}

async function proxyRequest(
  request: NextRequest,
  path: string[] | undefined,
  method: string
) {
  const BACKEND_URL = getBackendUrl();

  try {
    const backendPath = path && path.length ? `/tokens/${path.join("/")}` : "/tokens";
    const url = new URL(`${BACKEND_URL}${backendPath}`);
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    // Forward the auth session cookie (both better-auth variants) for identity.
    const headers: HeadersInit = {};
    const sessionToken = request.cookies.get("better-auth.session_token");
    const secureToken = request.cookies.get("__Secure-better-auth.session_token");
    const cookieParts: string[] = [];
    if (sessionToken) cookieParts.push(`better-auth.session_token=${sessionToken.value}`);
    if (secureToken) cookieParts.push(`__Secure-better-auth.session_token=${secureToken.value}`);
    if (cookieParts.length) headers["Cookie"] = cookieParts.join("; ");

    let body: BodyInit | undefined;
    if (["POST", "PUT", "PATCH"].includes(method)) {
      headers["Content-Type"] = "application/json";
      try {
        body = JSON.stringify(await request.json());
      } catch {
        // No body
      }
    }

    const response = await fetch(url.toString(), { method, headers, body });
    const responseText = await response.text();

    try {
      return NextResponse.json(JSON.parse(responseText), { status: response.status });
    } catch {
      return NextResponse.json(
        { error: "Backend returned invalid JSON", details: responseText.substring(0, 200) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Tokens proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to proxy request to backend",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
