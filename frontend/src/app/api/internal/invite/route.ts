import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

/**
 * Create a user with a temporary password and return an invite link.
 * The invite link lets the user set their own password.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Generate a temporary random password (user will set their own)
    const tempPassword = crypto.randomBytes(32).toString("base64url");

    // Create user via Better Auth
    const auth = await getAuth();
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password: tempPassword,
        name: name || email.split("@")[0],
      },
    });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Generate invite token and store in verifications table
    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.verification.create({
      data: {
        identifier: `invite:${result.user.id}`,
        value: token,
        expiresAt,
      },
    });

    // Build invite URL
    const baseUrl =
      process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const inviteUrl = `${baseUrl}/set-password?token=${token}`;

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      invite_url: inviteUrl,
    });
  } catch (error: any) {
    if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }
    console.error("[Invite] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create invite" },
      { status: 500 }
    );
  }
}
