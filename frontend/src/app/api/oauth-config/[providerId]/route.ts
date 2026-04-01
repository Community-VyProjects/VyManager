import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuth, invalidateAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

async function getAdminUser(request: NextRequest) {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !["PROJECT_ADMIN", "ORG_ADMIN", "ADMIN"].includes(user.role)) return null;
  return user;
}

// GET /api/oauth-config/[providerId] — get single provider (includes clientSecret for editing)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { providerId } = await params;
  const provider = await prisma.oAuthProvider.findUnique({ where: { providerId } });
  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  return NextResponse.json({ provider });
}

// PUT /api/oauth-config/[providerId] — full update
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { providerId } = await params;
  const body = await request.json();

  const existing = await prisma.oAuthProvider.findUnique({ where: { providerId } });
  if (!existing) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const updated = await prisma.oAuthProvider.update({
    where: { providerId },
    data: {
      displayName: body.displayName ?? existing.displayName,
      clientId: body.clientId ?? existing.clientId,
      // Only update secret if a non-empty value is provided
      ...(body.clientSecret ? { clientSecret: body.clientSecret } : {}),
      enabled: body.enabled ?? existing.enabled,
      discoveryUrl: body.discoveryUrl !== undefined ? (body.discoveryUrl || null) : existing.discoveryUrl,
      authorizationUrl: body.authorizationUrl !== undefined ? (body.authorizationUrl || null) : existing.authorizationUrl,
      tokenUrl: body.tokenUrl !== undefined ? (body.tokenUrl || null) : existing.tokenUrl,
      userInfoUrl: body.userInfoUrl !== undefined ? (body.userInfoUrl || null) : existing.userInfoUrl,
      scopes: body.scopes !== undefined ? (body.scopes || null) : existing.scopes,
      pkce: body.pkce ?? existing.pkce,
    },
  });

  invalidateAuth();

  return NextResponse.json({ provider: { ...updated, clientSecret: undefined } });
}

// PATCH /api/oauth-config/[providerId] — toggle enabled only
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { providerId } = await params;
  const body = await request.json();

  const existing = await prisma.oAuthProvider.findUnique({ where: { providerId } });
  if (!existing) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const updated = await prisma.oAuthProvider.update({
    where: { providerId },
    data: { enabled: body.enabled },
  });

  invalidateAuth();

  return NextResponse.json({ provider: { ...updated, clientSecret: undefined } });
}

// DELETE /api/oauth-config/[providerId] — remove provider
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { providerId } = await params;

  const existing = await prisma.oAuthProvider.findUnique({ where: { providerId } });
  if (!existing) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  await prisma.oAuthProvider.delete({ where: { providerId } });
  invalidateAuth();

  return NextResponse.json({ success: true });
}
