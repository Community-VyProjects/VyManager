/**
 * User Management API Proxy Route
 *
 * Forwards all /api/user-management/* requests to the backend with proper cookie handling.
 * This ensures authentication cookies are correctly passed through to the backend.
 */

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://backend:8000";

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, "PUT");
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
  try {
    console.log(`[UserManagementProxy] ${method} /api/user-management/${path.join("/")}`);

    // Get the session token from request cookies
    const sessionToken = request.cookies.get("better-auth.session_token");

    // Build the backend URL
    const backendPath = `/user-management/${path.join("/")}`;
    const backendUrl = `${BACKEND_URL}${backendPath}`;
    console.log(`[UserManagementProxy] Proxying to: ${backendUrl}`);

    // Copy search params
    const url = new URL(backendUrl);
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    // Prepare headers
    const headers: HeadersInit = {};

    // Build cookie string with session token and CSRF token
    const csrfToken = request.cookies.get("csrf_token");
    const cookieParts: string[] = [];

    if (sessionToken) {
      cookieParts.push(`better-auth.session_token=${sessionToken.value}`);
    }
    if (csrfToken) {
      cookieParts.push(`csrf_token=${csrfToken.value}`);
    }

    if (cookieParts.length > 0) {
      headers["Cookie"] = cookieParts.join("; ");
    }

    // Forward CSRF token header for state-changing requests
    const csrfHeader = request.headers.get("X-CSRF-Token");
    if (csrfHeader) {
      headers["X-CSRF-Token"] = csrfHeader;
    }

    // Handle request body
    let body: BodyInit | undefined;

    if (["POST", "PUT", "PATCH"].includes(method)) {
      headers["Content-Type"] = "application/json";
      try {
        const json = await request.json();
        body = JSON.stringify(json);
      } catch {
        // No body or invalid JSON
      }
    }

    // Forward the request to the backend
    const response = await fetch(url.toString(), {
      method,
      headers,
      body,
    });

    console.log(`[UserManagementProxy] Backend response: ${response.status} ${response.statusText}`);

    // Parse response
    const responseText = await response.text();

    // Forward Set-Cookie headers from backend (for CSRF token)
    const setCookieHeaders = response.headers.getSetCookie();

    try {
      const data = JSON.parse(responseText);
      const nextResponse = NextResponse.json(data, { status: response.status });

      // Forward Set-Cookie headers
      for (const cookie of setCookieHeaders) {
        nextResponse.headers.append("Set-Cookie", cookie);
      }

      return nextResponse;
    } catch (parseError) {
      return NextResponse.json(
        {
          error: "Backend returned invalid JSON",
          details: responseText.substring(0, 200),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[UserManagementProxy] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to proxy request to backend",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
