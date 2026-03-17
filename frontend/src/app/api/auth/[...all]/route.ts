import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

// Export runtime config for Next.js 16
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowOnboardingFailOpen = process.env.ALLOW_ONBOARDING_FAIL_OPEN === "true";

// Simple in-memory rate limiter for login attempts
const LOGIN_RATE_LIMIT = 10;        // max attempts
const LOGIN_RATE_WINDOW_MS = 60_000; // per 1 minute
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_RATE_WINDOW_MS });
    return true;
  }
  if (record.count >= LOGIN_RATE_LIMIT) return false;
  record.count++;
  return true;
}

export async function GET(request: NextRequest) {
  const auth = await getAuth();
  const handlers = toNextJsHandler(auth);
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Rate limit login attempts
  if (path.includes("/sign-in")) {
    if (!checkLoginRateLimit(getClientIp(request))) {
      return NextResponse.json(
        { error: { message: "Too many login attempts. Please try again later." } },
        { status: 429 }
      );
    }
  }

  // Check if this is a signup request
  if (path.includes("/sign-up")) {
    try {
      // SECURITY: Check if onboarding is complete
      // If users already exist, reject signup attempts
      const backendUrl = process.env.BACKEND_URL || "http://backend:8000";
      const onboardingCheck = await fetch(`${backendUrl}/session/onboarding-status`);

      if (onboardingCheck.ok) {
        const data = await onboardingCheck.json();

        if (!data.needs_onboarding) {
          // Onboarding is complete - reject signup
          return NextResponse.json(
            {
              error: {
                message: "Registration is closed. Onboarding has already been completed.",
              },
            },
            { status: 403 }
          );
        }
      }
    } catch (err) {
      console.error("[Auth] Error checking onboarding status:", err);
      if (!allowOnboardingFailOpen) {
        return NextResponse.json(
          {
            error: {
              message: "Unable to verify onboarding status. Please try again later.",
            },
          },
          { status: 503 }
        );
      }
    }
  }

  const auth = await getAuth();
  const handlers = toNextJsHandler(auth);
  return handlers.POST(request);
}
