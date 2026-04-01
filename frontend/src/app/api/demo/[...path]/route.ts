/**
 * Demo API Proxy Route
 *
 * Forwards all /api/demo/* requests to the backend with proper cookie and org header handling.
 */

import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = () => process.env.BACKEND_URL || "http://backend:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, "POST");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, "DELETE");
}

async function proxyRequest(
  request: NextRequest,
  path: string[],
  method: string
) {
  const BACKEND_URL = getBackendUrl();

  try {
    const sessionToken = request.cookies.get("better-auth.session_token")
      || request.cookies.get("__Secure-better-auth.session_token");
    const backendPath = `/demo/${path.join("/")}`;
    const backendUrl = `${BACKEND_URL}${backendPath}`;

    const url = new URL(backendUrl);
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    const headers: HeadersInit = {};

    if (sessionToken) {
      headers["Cookie"] = `better-auth.session_token=${sessionToken.value}`;
    }

    // Forward org header
    const orgId = request.headers.get("X-Org-Id");
    if (orgId) {
      headers["X-Org-Id"] = orgId;
    }

    let body: BodyInit | undefined;
    if (["POST", "PUT", "PATCH"].includes(method)) {
      headers["Content-Type"] = "application/json";
      try {
        const json = await request.json();
        body = JSON.stringify(json);
      } catch {
        // No body
      }
    }

    const response = await fetch(url.toString(), { method, headers, body });
    const responseText = await response.text();

    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data, { status: response.status });
    } catch {
      return NextResponse.json(
        { error: "Backend returned invalid JSON", details: responseText.substring(0, 200) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Demo proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy request to backend", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
