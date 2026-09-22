import { NextResponse } from "next/server";
import { TRUST_DEVICE_COOKIE_NAMES } from "@/lib/two-factor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Drop the httpOnly trust-device cookie so the next password login challenges 2FA. */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  for (const name of TRUST_DEVICE_COOKIE_NAMES) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return response;
}
