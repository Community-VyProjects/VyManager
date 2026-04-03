import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Validate an invite token (GET) or set a new password (POST).
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const verification = await prisma.verification.findFirst({
    where: {
      value: token,
      identifier: { startsWith: "invite:" },
      expiresAt: { gt: new Date() },
    },
  });

  if (!verification) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 });
  }

  const userId = verification.identifier.replace("invite:", "");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ valid: true, email: user.email, name: user.name });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Find and validate token
    const verification = await prisma.verification.findFirst({
      where: {
        value: token,
        identifier: { startsWith: "invite:" },
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid or expired invite link" },
        { status: 400 }
      );
    }

    const userId = verification.identifier.replace("invite:", "");

    // Better Auth stores passwords in the accounts table with providerId = "credential"
    const account = await prisma.account.findFirst({
      where: { userId, providerId: "credential" },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Hash password with Better Auth's native hasher (scrypt)
    const { hashPassword } = await import("better-auth/crypto");
    const hashedPassword = await hashPassword(password);

    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashedPassword },
    });

    // Mark email as verified since they used the invite link
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    // Delete the invite token (one-time use)
    await prisma.verification.delete({ where: { id: verification.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[SetPassword] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set password" },
      { status: 500 }
    );
  }
}
