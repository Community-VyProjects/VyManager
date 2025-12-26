import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Internal API endpoint for creating users from the backend.
 * Uses Better Auth's internal user creation to ensure proper password hashing.
 *
 * This endpoint should only be accessible from the backend container.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate required fields
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required and must be a string" },
        { status: 400 }
      );
    }

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

    // Use Better Auth's internal API to create the user
    // This ensures password hashing is done correctly
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: name || email.split("@")[0],
      },
    });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    });
  } catch (error: any) {
    // Check for specific error types
    if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
