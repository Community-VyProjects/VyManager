import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import {
  TRUST_DEVICE_COOKIE_NAMES,
  cookieHeaderHasTrustDevice,
  revokePresentedTrustDevices,
  trustDeviceExpiryOptions,
} from "@/lib/two-factor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clearTrustCookies(response: NextResponse): NextResponse {
  for (const name of TRUST_DEVICE_COOKIE_NAMES) {
    response.cookies.set(name, "", trustDeviceExpiryOptions(name));
  }
  return response;
}

/**
 * Drop the httpOnly trust-device cookie and its verification row so a
 * copied cookie cannot skip 2FA. Cookie expiry is set even when the
 * delete fails; that response is not success.
 */
export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeaderHasTrustDevice(cookieHeader)) {
    try {
      const auth = await getAuth();
      const ctx = await auth.$context;
      await revokePresentedTrustDevices(cookieHeader, {
        secret: ctx.secret,
        deleteVerificationByIdentifier: (identifier) =>
          ctx.internalAdapter.deleteVerificationByIdentifier(identifier),
      });
    } catch {
      return clearTrustCookies(NextResponse.json({ ok: false }, { status: 500 }));
    }
  }
  return clearTrustCookies(NextResponse.json({ ok: true }));
}
