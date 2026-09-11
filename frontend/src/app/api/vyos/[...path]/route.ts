/**
 * VyOS API Proxy Route
 *
 * Forwards all /api/vyos/* requests to the backend.
 */

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, params: Ctx["params"], method: string) {
  const { path } = await params;
  return proxyToBackend(request, {
    path: `/vyos/${path.join("/")}`,
    method,
    response: "json-or-text",
    sse: true,
    logLabel: "VyOSProxy",
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

export async function PATCH(request: NextRequest, { params }: Ctx) {
  return handle(request, params, "PATCH");
}
