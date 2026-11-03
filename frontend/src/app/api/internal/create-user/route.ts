import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getAuth } from "@/lib/auth";
import { createCredentialAccount, runCredentialTransaction } from "@/lib/credential-account";
import { ApiError } from "@/lib/types/api";

/**
 * Guard an internal route with a shared secret. The secret is
 * INTERNAL_API_SECRET, falling back to BETTER_AUTH_SECRET (which both the
 * frontend and backend already have, so no new configuration is needed).
 * Returns a NextResponse to short-circuit on failure, or null when allowed.
 */
export function requireInternalAuth(request: NextRequest): NextResponse | null {
  const expected =
    process.env.INTERNAL_API_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "Server is not configured for internal requests" },
      { status: 500 }
    );
  }
  const provided = request.headers.get("x-internal-auth") || "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Internal API endpoint for creating users from the backend.
 * Uses Better Auth's internal user creation to ensure proper password hashing.
 *
 * This endpoint is only reachable with the internal shared secret.
 */
export async function POST(request: NextRequest) {
  const unauthorized = requireInternalAuth(request);
  if (unauthorized) return unauthorized;
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

    // signUpEmail inserts a session while autoSignIn stays on. First-user
    // signup still needs that session, so admin provisioning writes the
    // credential account directly. The adapter does not roll that write
    // back, so a failed link deletes the user. An after-commit hook
    // failure does not: the account is already saved.
    const auth = await getAuth();
    const ctx = await auth.$context;
    const user = await createCredentialAccount(
      {
        email,
        password,
        name: name || email.split("@")[0],
      },
      {
        findUserByEmail: (value) => ctx.internalAdapter.findUserByEmail(value),
        createUser: (row, source) => ctx.internalAdapter.createUser(row, source),
        linkAccount: (account) => ctx.internalAdapter.linkAccount(account),
        hashPassword: (value) => ctx.password.hash(value),
        deleteUser: (userId) => ctx.internalAdapter.deleteUser(userId),
        runInTransaction: async (fn) => runCredentialTransaction(ctx.adapter, fn),
        minPasswordLength: ctx.password.config.minPasswordLength,
        maxPasswordLength: ctx.password.config.maxPasswordLength,
      },
    );

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    // Check for specific error types
    if ((error as ApiError).message?.includes("already exists") || (error as ApiError).message?.includes("duplicate")) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: (error as ApiError).message || "Failed to create user" },
      { status: 500 }
    );
  }
}
