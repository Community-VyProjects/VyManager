/**
 * Dashboard API Proxy Route
 *
 * Forwards all /api/dashboard/* requests to the backend.
 * Uses BACKEND_URL environment variable (runtime configurable).
 */

import { NextRequest, NextResponse } from "next/server";

// Runtime environment variable - NOT NEXT_PUBLIC_ so it's read at runtime
// This allows users to configure the backend URL without rebuilding
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

async function proxyRequest(
  request: NextRequest,
  path: string[],
  method: string
) {
  const BACKEND_URL = getBackendUrl();

  try {
    // Get the session token from request cookies
    // When BETTER_AUTH_SECURE_COOKIES=true (HTTPS), cookies are prefixed with __Secure-
    const sessionToken =
      request.cookies.get("__Secure-better-auth.session_token") ||
      request.cookies.get("better-auth.session_token");

    // Build the backend URL
    const backendPath = `/dashboard/${path.join("/")}`;
    const backendUrl = `${BACKEND_URL}${backendPath}`;

    // Copy search params
    const url = new URL(backendUrl);
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    // Prepare headers
    const headers: HeadersInit = {};

    // Always forward as the non-prefixed name since the backend expects that
    if (sessionToken) {
      headers["Cookie"] = `better-auth.session_token=${sessionToken.value}`;
    }

    // Handle request body
    let body: BodyInit | undefined;

    if (method === "POST") {
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

    // Parse response
    const responseText = await response.text();

    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data, { status: response.status });
    } catch {
      return new NextResponse(responseText, {
        status: response.status,
        headers: { "Content-Type": response.headers.get("Content-Type") || "text/plain" },
      });
    }
  } catch (error) {
    console.error("[DashboardProxy] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to proxy request to backend",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
