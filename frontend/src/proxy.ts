import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuth } from "./lib/auth";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicRoutes = [
    "/login",
    "/onboarding",
    "/api/auth",
    "/api/session/onboarding-status",
    "/api/internal",
    "/api/oauth-config/public",
  ];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Allow static files (images, fonts, etc.)
  const isStaticFile = pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)$/i);

  if (isPublicRoute || isStaticFile) {
    return NextResponse.next();
  }

  const auth = await getAuth();
  let session;
  try {
    session = await auth.api.getSession({ headers: request.headers });
  } catch (err) {
    console.error("[proxy] getSession error:", err);
    session = null;
  }

  if (!session) {
    // For API routes, return 401 instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { detail: "Authentication required. No session token provided." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
