import { NextRequest } from "next/server";
import { invalidateAuth } from "@/lib/auth";
import { proxyToBackend } from "@/lib/backend-proxy";

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
): Promise<Response> {
  return proxyToBackend(request, {
    path: backendPath,
    method,
    body: "text",
    response: "passthrough",
    logLabel: "OauthConfigProxy",
    onSuccess: method === "GET" ? undefined : () => invalidateAuth(),
  });
}
