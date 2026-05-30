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
    orderBy: [{ claimValue: "asc" }, { priority: "desc" }, { createdAt: "asc" }],
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
    siteId = null,
    instanceRole = null,
    featurePermissions = null,
    priority = 0,
  } = body;

  const validation = await validateGrant({
    claimValue,
    siteRole,
    instanceId,
    siteId,
    instanceRole,
  });
  if (validation) {
    return NextResponse.json({ error: validation }, { status: 400 });
  }

  try {
    const mapping = await prisma.oAuthRoleMapping.create({
      data: {
        providerId,
        claimValue,
        siteRole: siteRole || null,
        instanceId: instanceId || null,
        siteId: siteId || null,
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
        { error: "A rule for this claim value and target already exists" },
        { status: 409 }
      );
    }
    throw err;
  }
}

// Returns an error string if the grant shape is invalid, otherwise null.
async function validateGrant(g: {
  claimValue: unknown;
  siteRole: string | null;
  instanceId: string | null;
  siteId: string | null;
  instanceRole: string | null;
}): Promise<string | null> {
  if (!g.claimValue || typeof g.claimValue !== "string") return "claimValue is required";
  if (g.siteRole && !SITE_ROLES.includes(g.siteRole)) return `Invalid siteRole: ${g.siteRole}`;
  if (g.instanceRole && !INSTANCE_ROLES.includes(g.instanceRole))
    return `Invalid instanceRole: ${g.instanceRole}`;
  if (g.instanceId && g.siteId) return "A grant targets an instance or a site, not both";
  if ((g.instanceId || g.siteId) && !g.instanceRole)
    return "instanceRole is required for an instance/site grant";
  if (!g.siteRole && !g.instanceId && !g.siteId)
    return "A rule must grant a site role and/or an instance/site role";
  if (g.siteId) {
    const site = await prisma.site.findUnique({ where: { id: g.siteId }, select: { id: true } });
    if (!site) return "Site not found";
  }
  if (g.instanceId) {
    const inst = await prisma.instance.findUnique({
      where: { id: g.instanceId },
      select: { id: true },
    });
    if (!inst) return "Instance not found";
  }
  return null;
}
