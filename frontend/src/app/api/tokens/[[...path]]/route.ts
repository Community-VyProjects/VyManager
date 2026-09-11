/**
 * API Tokens Proxy Route
 *
 * Forwards /api/tokens and /api/tokens/* to the backend /tokens endpoints.
 */

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

type Ctx = { params: Promise<{ path?: string[] }> };

async function handle(request: NextRequest, params: Ctx["params"], method: string) {
  const { path } = await params;
  const backendPath = path && path.length ? `/tokens/${path.join("/")}` : "/tokens";
  return proxyToBackend(request, {
    path: backendPath,
    method,
    logLabel: "TokensProxy",
  });
}

export async function GET(request: NextRequest, { params }: Ctx) {
  return handle(request, params, "GET");
}

export async function POST(request: NextRequest, { params }: Ctx) {
  return handle(request, params, "POST");
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  return handle(request, params, "DELETE");
}
