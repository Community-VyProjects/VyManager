import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma, Role, InstanceRole } from "@prisma/client";
import { getAuth, invalidateAuth } from "@/lib/auth";

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

const SITE_ROLES = Object.values(Role) as string[];
const INSTANCE_ROLES = Object.values(InstanceRole) as string[];

// GET /api/oauth-config/[providerId]/role-mappings — list rules for a provider
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { providerId } = await params;
  const mappings = await prisma.oAuthRoleMapping.findMany({
    where: { providerId },
    orderBy: [{ priority: "desc" }, { claimValue: "asc" }],
  });

  return NextResponse.json({ mappings });
}

// POST /api/oauth-config/[providerId]/role-mappings — create a rule
export async function POST(
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

  const body = await request.json();
  const {
    claimValue,
    siteRole = null,
    instanceId = null,
    instanceRole = null,
    featurePermissions = null,
    priority = 0,
  } = body;

  if (!claimValue || typeof claimValue !== "string") {
    return NextResponse.json({ error: "claimValue is required" }, { status: 400 });
  }
  if (siteRole && !SITE_ROLES.includes(siteRole)) {
    return NextResponse.json({ error: `Invalid siteRole: ${siteRole}` }, { status: 400 });
  }
  if (instanceRole && !INSTANCE_ROLES.includes(instanceRole)) {
    return NextResponse.json({ error: `Invalid instanceRole: ${instanceRole}` }, { status: 400 });
  }
  if (instanceId && !instanceRole) {
    return NextResponse.json(
      { error: "instanceRole is required when instanceId is set" },
      { status: 400 }
    );
  }
  if (!siteRole && !instanceId) {
    return NextResponse.json(
      { error: "A rule must grant a siteRole and/or an instance role" },
      { status: 400 }
    );
  }

  try {
    const mapping = await prisma.oAuthRoleMapping.create({
      data: {
        providerId,
        claimValue,
        siteRole: siteRole || null,
        instanceId: instanceId || null,
        instanceRole: instanceRole || null,
        featurePermissions: featurePermissions ?? Prisma.JsonNull,
        priority: typeof priority === "number" ? priority : 0,
      },
    });

    invalidateAuth();
    return NextResponse.json({ mapping });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "A rule for this claim value and instance already exists" },
        { status: 409 }
      );
    }
    throw err;
  }
}
