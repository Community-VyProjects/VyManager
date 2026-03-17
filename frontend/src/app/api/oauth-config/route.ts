import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

async function getAdminUser(request: NextRequest) {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

// GET /api/oauth-config — list all providers
export async function GET(request: NextRequest) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providers = await prisma.oAuthProvider.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      providerId: true,
      displayName: true,
      enabled: true,
      clientId: true,
      // Never expose clientSecret in list response
      discoveryUrl: true,
      authorizationUrl: true,
      tokenUrl: true,
      userInfoUrl: true,
      scopes: true,
      pkce: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ providers });
}

// POST /api/oauth-config — create or update a provider
export async function POST(request: NextRequest) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    providerId,
    displayName,
    clientId,
    clientSecret,
    enabled = false,
    discoveryUrl,
    authorizationUrl,
    tokenUrl,
    userInfoUrl,
    scopes,
    pkce = true,
  } = body;

  if (!providerId || !displayName || !clientId || !clientSecret) {
    return NextResponse.json(
      { error: "providerId, displayName, clientId, and clientSecret are required" },
      { status: 400 }
    );
  }

  const provider = await prisma.oAuthProvider.upsert({
    where: { providerId },
    update: {
      displayName,
      clientId,
      clientSecret,
      enabled,
      discoveryUrl: discoveryUrl || null,
      authorizationUrl: authorizationUrl || null,
      tokenUrl: tokenUrl || null,
      userInfoUrl: userInfoUrl || null,
      scopes: scopes || null,
      pkce,
    },
    create: {
      id: crypto.randomUUID(),
      providerId,
      displayName,
      clientId,
      clientSecret,
      enabled,
      discoveryUrl: discoveryUrl || null,
      authorizationUrl: authorizationUrl || null,
      tokenUrl: tokenUrl || null,
      userInfoUrl: userInfoUrl || null,
      scopes: scopes || null,
      pkce,
    },
  });

  // Invalidate auth so next request picks up new config
  const { invalidateAuth } = await import("@/lib/auth");
  invalidateAuth();

  return NextResponse.json({
    provider: { ...provider, clientSecret: undefined },
  });
}
