/**
 * User API Proxy Route
 *
 * Forwards /api/user/* to the backend. Table layouts live here so a column
 * toggle is not an audited /session or /vyos write.
 */

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, params: Ctx["params"], method: string) {
  const { path } = await params;
  return proxyToBackend(request, {
    path: `/user/${path.join("/")}`,
    method,
    logLabel: "UserProxy",
  });
}

export async function GET(request: NextRequest, { params }: Ctx) {
  return handle(request, params, "GET");
}

export async function POST(request: NextRequest, { params }: Ctx) {
  return handle(request, params, "POST");
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  return handle(request, params, "PUT");
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  return handle(request, params, "PATCH");
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  return handle(request, params, "DELETE");
}
