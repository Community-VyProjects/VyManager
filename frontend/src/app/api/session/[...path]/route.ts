/**
 * Session API Proxy Route
 *
 * Forwards all /api/session/* requests to the backend with cookie handling.
 */

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, params: Ctx["params"], method: string) {
  const { path } = await params;
  return proxyToBackend(request, {
    path: `/session/${path.join("/")}`,
    method,
    body: "auto",
    attachments: true,
    logLabel: "SessionProxy",
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

export async function DELETE(request: NextRequest, { params }: Ctx) {
  return handle(request, params, "DELETE");
}
