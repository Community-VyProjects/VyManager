import { NextRequest, NextResponse } from "next/server";
import { invalidateAuth } from "@/lib/auth";

// Runtime env, not NEXT_PUBLIC_, so the backend URL is configurable without a rebuild.
const getBackendUrl = () => process.env.BACKEND_URL || "http://backend:8000";

/**
 * Forward an oauth-config request (providers or role mappings) to the backend,
 * which owns oauth_providers and oauth_role_mappings.
 *
 * The backend performs the auth check and the write; on a successful write we
 * drop better-auth's in-process cache so the next login re-reads the config.
 * That cache lives here in the frontend (better-auth runs in this process), so
 * the backend cannot invalidate it — hence this thin proxy instead of pointing
 * the client straight at the backend.
 */
export async function proxyOauthConfig(
  request: NextRequest,
  backendPath: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
): Promise<NextResponse> {
  // Secure-cookie deployments prefix the name with __Secure-; forward
  // whichever is present under its original name (the backend accepts both).
  const sessionToken =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  const headers: Record<string, string> = {};
  if (sessionToken) {
    headers["Cookie"] = `${sessionToken.name}=${sessionToken.value}`;
  }

  let body: string | undefined;
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    headers["Content-Type"] = "application/json";
    body = await request.text();
  }

  const res = await fetch(`${getBackendUrl()}${backendPath}`, { method, headers, body });
  const text = await res.text();

  // A successful write can change how logins resolve roles; refresh the cache.
  if (method !== "GET" && res.ok) {
    invalidateAuth();
  }

  return new NextResponse(text || null, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/json",
    },
  });
}
