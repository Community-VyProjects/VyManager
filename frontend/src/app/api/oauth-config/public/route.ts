import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

// Public endpoint — returns only enabled providers with minimal info (no secrets)
// Used by the login page to show OAuth buttons
export async function GET() {
  const providers = await prisma.oAuthProvider.findMany({
    where: { enabled: true },
    select: {
      providerId: true,
      displayName: true,
      enabled: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ providers });
}
