import { createInternalContext } from "better-call";
import { TRUST_DEVICE_COOKIE_NAMES, trustDeviceIdentifier } from "@/lib/two-factor";

/**
 * Delete the verification row named by a signed trust_device cookie.
 * Signature check is better-call's getSignedCookie. An unsigned or forged
 * cookie deletes nothing. A signed cookie that is not a trust-device
 * identifier throws so the caller does not report success.
 *
 * Server only. Client pages import two-factor.ts and must not pull this in.
 */
export async function revokePresentedTrustDevices(
  cookieHeader: string | null,
  deps: {
    secret: string;
    deleteVerificationByIdentifier: (identifier: string) => Promise<unknown>;
  },
): Promise<void> {
  if (!cookieHeader) return;
  if (!deps.secret) throw new Error("missing auth secret");
  const ctx = await createInternalContext(
    { headers: new Headers({ cookie: cookieHeader }) },
    { options: { method: "POST" }, path: "/trust-device" },
  );
  const seen = new Set<string>();
  for (const name of TRUST_DEVICE_COOKIE_NAMES) {
    const payload = await ctx.getSignedCookie(name, deps.secret);
    if (typeof payload !== "string" || !payload) continue;
    const identifier = trustDeviceIdentifier(payload);
    if (!identifier) throw new Error("signed trust cookie has no trust-device identifier");
    if (seen.has(identifier)) continue;
    seen.add(identifier);
    await deps.deleteVerificationByIdentifier(identifier);
  }
}
