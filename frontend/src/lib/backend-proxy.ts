import { NextRequest, NextResponse } from "next/server";

const JSON_BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);
const TEXT_BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function getBackendUrl(): string {
  return process.env.BACKEND_URL || "http://backend:8000";
}

/** Forward whichever better-auth session cookie is present, under its original name. */
export function sessionCookieHeader(
  request: NextRequest,
): Record<string, string> {
  const sessionToken =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");
  if (!sessionToken) {
    return {};
  }
  return { Cookie: `${sessionToken.name}=${sessionToken.value}` };
}

export type ProxyBodyMode = "json" | "text" | "auto" | "none";
export type ProxyResponseMode = "json" | "json-or-text" | "passthrough";

export type ProxyToBackendOptions = {
  path: string;
  method: string;
  body?: ProxyBodyMode;
  response?: ProxyResponseMode;
  sse?: boolean;
  attachments?: boolean;
  logLabel?: string;
  onSuccess?: () => void;
};

async function readBody(
  request: NextRequest,
  method: string,
  mode: ProxyBodyMode,
): Promise<{ headers: Record<string, string>; body: BodyInit | undefined }> {
  const headers: Record<string, string> = {};
  if (mode === "none") {
    return { headers, body: undefined };
  }

  const wantsBody =
    mode === "text" ? TEXT_BODY_METHODS.has(method) : JSON_BODY_METHODS.has(method);
  if (!wantsBody) {
    return { headers, body: undefined };
  }

  if (mode === "auto") {
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("multipart/form-data")) {
      return { headers, body: await request.formData() };
    }
    mode = "json";
  }

  if (mode === "text") {
    headers["Content-Type"] = "application/json";
    const text = await request.text();
    return { headers, body: text || undefined };
  }

  headers["Content-Type"] = "application/json";
  try {
    return { headers, body: JSON.stringify(await request.json()) };
  } catch {
    return { headers, body: undefined };
  }
}

export async function proxyToBackend(
  request: NextRequest,
  {
    path,
    method,
    body: bodyMode = "json",
    response: responseMode = "json",
    sse = false,
    attachments = false,
    logLabel = "BackendProxy",
    onSuccess,
  }: ProxyToBackendOptions,
): Promise<Response> {
  try {
    const url = new URL(`${getBackendUrl()}${path}`);
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    const { headers: bodyHeaders, body } = await readBody(
      request,
      method,
      bodyMode,
    );
    const headers: Record<string, string> = {
      ...sessionCookieHeader(request),
      ...bodyHeaders,
    };

    const upstream = await fetch(url.toString(), { method, headers, body });

    if (onSuccess && upstream.ok) {
      onSuccess();
    }

    if (sse) {
      const contentType = upstream.headers.get("Content-Type") || "";
      if (contentType.includes("text/event-stream")) {
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            Connection: "keep-alive",
          },
        });
      }
    }

    if (attachments) {
      const contentDisposition = upstream.headers.get("content-disposition");
      if (contentDisposition?.includes("attachment")) {
        const blob = await upstream.blob();
        const responseHeaders = new Headers();
        responseHeaders.set("Content-Disposition", contentDisposition);
        responseHeaders.set(
          "Content-Type",
          upstream.headers.get("content-type") || "application/octet-stream",
        );
        return new NextResponse(blob, {
          status: upstream.status,
          headers: responseHeaders,
        });
      }
    }

    const responseText = await upstream.text();

    if (responseMode === "passthrough") {
      return new NextResponse(responseText || null, {
        status: upstream.status,
        headers: {
          "Content-Type":
            upstream.headers.get("Content-Type") || "application/json",
        },
      });
    }

    try {
      return NextResponse.json(JSON.parse(responseText), {
        status: upstream.status,
      });
    } catch {
      if (responseMode === "json-or-text") {
        return new NextResponse(responseText, {
          status: upstream.status,
          headers: {
            "Content-Type":
              upstream.headers.get("Content-Type") || "text/plain",
          },
        });
      }
      return NextResponse.json(
        {
          error: "Backend returned invalid JSON",
          details: responseText.substring(0, 200),
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error(`[${logLabel}] Error:`, error);
    return NextResponse.json(
      {
        error: "Failed to proxy request to backend",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
