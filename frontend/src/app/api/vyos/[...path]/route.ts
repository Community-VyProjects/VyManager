/**
 * VyOS API Proxy Route
 *
 * Forwards all /api/vyos/* requests to the backend.
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, "PATCH");
}

async function proxyRequest(
  request: NextRequest,
  path: string[],
  method: string
) {
  const BACKEND_URL = getBackendUrl();

  try {
    // Get the session token from request cookies (check both secure and non-secure names)
    const sessionToken = request.cookies.get("better-auth.session_token")
      || request.cookies.get("__Secure-better-auth.session_token");

    // Build the backend URL
    const backendPath = `/vyos/${path.join("/")}`;
    const backendUrl = `${BACKEND_URL}${backendPath}`;

    // Copy search params
    const url = new URL(backendUrl);
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    // Prepare headers
    const headers: HeadersInit = {};

    // Add the session token cookie if it exists
    if (sessionToken) {
      headers["Cookie"] = `better-auth.session_token=${sessionToken.value}`;
    }


    const orgId = request.headers.get("X-Org-Id");
    if (orgId) {
      headers["X-Org-Id"] = orgId;
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

    // Stream SSE responses directly without buffering
    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("text/event-stream")) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "X-Accel-Buffering": "no",
          "Connection": "keep-alive",
        },
      });
    }

    // Parse response
    const responseText = await response.text();

    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data, { status: response.status });
    } catch {
      // Return as-is if not JSON
      return new NextResponse(responseText, {
        status: response.status,
        headers: { "Content-Type": response.headers.get("Content-Type") || "text/plain" },
      });
    }
  } catch (error) {
    console.error("[VyOSProxy] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to proxy request to backend",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
