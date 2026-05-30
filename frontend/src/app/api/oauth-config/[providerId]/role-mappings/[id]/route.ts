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

// PUT /api/oauth-config/[providerId]/role-mappings/[id] — update a rule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string; id: string }> }
) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { providerId, id } = await params;
  const existing = await prisma.oAuthRoleMapping.findUnique({ where: { id } });
  if (!existing || existing.providerId !== providerId) {
    return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
  }

  const body = await request.json();

  if (body.siteRole && !SITE_ROLES.includes(body.siteRole)) {
    return NextResponse.json({ error: `Invalid siteRole: ${body.siteRole}` }, { status: 400 });
  }
  if (body.instanceRole && !INSTANCE_ROLES.includes(body.instanceRole)) {
    return NextResponse.json({ error: `Invalid instanceRole: ${body.instanceRole}` }, { status: 400 });
  }

  try {
    const mapping = await prisma.oAuthRoleMapping.update({
      where: { id },
      data: {
        claimValue: body.claimValue ?? existing.claimValue,
        siteRole: body.siteRole !== undefined ? (body.siteRole || null) : existing.siteRole,
        instanceId: body.instanceId !== undefined ? (body.instanceId || null) : existing.instanceId,
        instanceRole:
          body.instanceRole !== undefined ? (body.instanceRole || null) : existing.instanceRole,
        // Only rewrite the JSON column when the caller supplies it.
        ...(body.featurePermissions !== undefined
          ? { featurePermissions: body.featurePermissions ?? Prisma.JsonNull }
          : {}),
        priority: typeof body.priority === "number" ? body.priority : existing.priority,
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

// DELETE /api/oauth-config/[providerId]/role-mappings/[id] — remove a rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string; id: string }> }
) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { providerId, id } = await params;
  const existing = await prisma.oAuthRoleMapping.findUnique({ where: { id } });
  if (!existing || existing.providerId !== providerId) {
    return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
  }

  await prisma.oAuthRoleMapping.delete({ where: { id } });
  invalidateAuth();

  return NextResponse.json({ success: true });
}
