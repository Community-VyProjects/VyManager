import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

// Export runtime config for Next.js 16
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Get the original handlers
const handlers = toNextJsHandler(auth);

// Wrap POST handler to add onboarding validation for signup
async function POST_WITH_VALIDATION(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Check if this is a signup request
  if (path.includes("/sign-up")) {
    try {
      // SECURITY: Check if onboarding is complete
      // If users already exist, reject signup attempts
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const onboardingCheck = await fetch(`${backendUrl}/session/onboarding-status`);

      if (onboardingCheck.ok) {
        const data = await onboardingCheck.json();

        if (!data.needs_onboarding) {
          // Onboarding is complete - reject signup
          console.log("[Auth] Blocked signup attempt - onboarding already complete");
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
      // On error, allow signup (fail open for first-time setup)
    }
  }

  // Call the original handler
  return handlers.POST(request);
}

export const GET = handlers.GET;
export const POST = POST_WITH_VALIDATION;
