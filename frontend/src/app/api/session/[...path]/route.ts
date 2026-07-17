/**
 * Session API Proxy Route
 *
 * Forwards all /api/session/* requests to the backend with proper cookie handling.
 * This ensures authentication cookies are correctly passed through to the backend.
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

async function proxyRequest(
  request: NextRequest,
  path: string[],
  method: string
) {
  const BACKEND_URL = getBackendUrl();

  try {
    // Get the session token from request cookies
    // Secure-cookie deployments prefix the name with __Secure-; read whichever is present
    const sessionToken =
      request.cookies.get("better-auth.session_token") ??
      request.cookies.get("__Secure-better-auth.session_token");

    // Build the backend URL
    const backendPath = `/session/${path.join("/")}`;
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
      headers["Cookie"] = `${sessionToken.name}=${sessionToken.value}`;
    }

    // Handle request body
    let body: BodyInit | undefined;
    const contentType = request.headers.get("content-type");

    if (["POST", "PUT", "PATCH"].includes(method)) {
      // Check if this is a file upload (multipart/form-data)
      if (contentType && contentType.includes("multipart/form-data")) {
        // For file uploads, pass the FormData directly
        const formData = await request.formData();
        body = formData as BodyInit;
        // Don't set Content-Type header - let fetch set it with boundary
      } else {
        // For JSON requests
        headers["Content-Type"] = "application/json";
        try {
          const json = await request.json();
          body = JSON.stringify(json);
        } catch {
          // No body or invalid JSON
        }
      }
    }

    // Forward the request to the backend
    const response = await fetch(url.toString(), {
      method,
      headers,
      body,
    });

    // Check if this is a file download (e.g. an encrypted backup). Any response
    // the backend marks as an attachment is streamed through as a binary blob.
    const responseContentType = response.headers.get("content-type");
    const contentDisposition = response.headers.get("content-disposition");
    if (contentDisposition && contentDisposition.includes("attachment")) {
      const blob = await response.blob();
      const responseHeaders = new Headers();
      responseHeaders.set("Content-Disposition", contentDisposition);
      responseHeaders.set(
        "Content-Type",
        responseContentType || "application/octet-stream"
      );

      return new NextResponse(blob, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    // Default: assume JSON response
    const responseText = await response.text();

    try {
      const data = JSON.parse(responseText);
      // Return the response with the same status code
      return NextResponse.json(data, { status: response.status });
    } catch {
      return NextResponse.json(
        {
          error: "Backend returned invalid JSON",
          details: responseText.substring(0, 200),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Session proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to proxy request to backend",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
