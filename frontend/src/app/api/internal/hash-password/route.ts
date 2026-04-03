import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "better-auth/crypto";

/**
 * Internal API endpoint for generating Better Auth compatible password hashes.
 * Used by the backend user management system to create Better Auth compatible users.
 *
 * This endpoint should only be accessible from the backend container (not public).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required and must be a string" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Generate hash using Better Auth's native scrypt hasher
    const hash = await hashPassword(password);

    return NextResponse.json({ hash });
  } catch (error) {
    console.error("[Internal Hash Password] Error:", error);
    return NextResponse.json(
      { error: "Failed to hash password" },
      { status: 500 }
    );
  }
}
