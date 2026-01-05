/**
 * User Management API Proxy Route
 *
 * Forwards all /api/user-management/* requests to the backend with proper cookie handling.
 * This ensures authentication cookies are correctly passed through to the backend.
 */

import { NextRequest, NextResponse } from "next/server";

// Use internal Docker URL for server-side requests, fall back to public URL
const BACKEND_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://backend:8000";

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
    // Check both regular and secure cookie names (secure cookies have __Secure- prefix when BETTER_AUTH_SECURE_COOKIES=true)
    const sessionToken = request.cookies.get("better-auth.session_token") ||
                         request.cookies.get("__Secure-better-auth.session_token");

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

    // Add the session token cookie if it exists
    // Backend expects the cookie as "better-auth.session_token" regardless of the original name
    if (sessionToken) {
      headers["Cookie"] = `better-auth.session_token=${sessionToken.value}`;
    } else {
      console.log(`[UserManagementProxy] No session token found in cookies`);
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

    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data, { status: response.status });
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
