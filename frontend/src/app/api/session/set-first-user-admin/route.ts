import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Set the first user as ADMIN during onboarding.
 * This endpoint can only be called when there is exactly 1 user.
 */
export async function POST(request: NextRequest) {
  try {
    // Count users
    const userCount = await prisma.user.count();

    // Only allow this if there's exactly 1 user (the one just created)
    if (userCount !== 1) {
      return NextResponse.json(
        { error: "This endpoint can only be called for the first user" },
        { status: 403 }
      );
    }

    // Get the first (and only) user
    const user = await prisma.user.findFirst();

    if (!user) {
      return NextResponse.json(
        { error: "No user found" },
        { status: 404 }
      );
    }

    // Update their role to ADMIN
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });

    console.log(`[Onboarding] Set first user ${user.email} as ADMIN`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Onboarding] Error setting first user as ADMIN:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set user as ADMIN" },
      { status: 500 }
    );
  }
}
