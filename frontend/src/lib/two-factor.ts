import { createInternalContext } from "better-call";

export type TwoFactorMethod = "totp" | "otp" | "backup";

/** Key in the `miscLib` messages for a built-in (non-backend) error. */
export type TwoFactorMessageKey = "twoFactor.loginFailed";

export type SignInOutcome =
  // `message` stays English for existing callers; when `messageKey` is set, the
  // message is the built-in fallback and callers should show t(messageKey).
  | { kind: "error"; message: string; messageKey?: TwoFactorMessageKey }
  | { kind: "twoFactor"; methods: string[] }
  | { kind: "session" };

export function interpretSignInResult(result: {
  error?: { message?: string } | null;
  data?: unknown;
}): SignInOutcome {
  if (result.error) {
    if (result.error.message) return { kind: "error", message: result.error.message };
    return { kind: "error", message: "Login failed", messageKey: "twoFactor.loginFailed" };
  }
  const data =
    result.data && typeof result.data === "object"
      ? (result.data as {
          twoFactorRedirect?: boolean;
          twoFactorMethods?: string[] | null;
        })
      : null;
  if (data?.twoFactorRedirect) {
    return { kind: "twoFactor", methods: data.twoFactorMethods ?? [] };
  }
  return { kind: "session" };
}

/** Methods to offer on the login challenge. Backup codes always apply. */
export function challengeMethods(methods: string[]): TwoFactorMethod[] {
  const set = new Set(methods);
  const out: TwoFactorMethod[] = [];
  if (set.has("totp") || methods.length === 0) out.push("totp");
  if (set.has("otp")) out.push("otp");
  out.push("backup");
  return out;
}

export function totpSecretFromUri(uri: string): string | null {
  try {
    return new URL(uri).searchParams.get("secret");
  } catch {
    return null;
  }
}

/** Admin policy is on. This password user has no authenticator yet. */
export function mustEnrollTwoFactor(opts: {
  twoFactorEnabled: boolean;
  requireTwoFactor: boolean;
}): boolean {
  return opts.requireTwoFactor && !opts.twoFactorEnabled;
}

/** Password sign-in creates a session that 2FA then replaces. If that
 *  row is still present, login would ask to close a "other session"
 *  that is this same attempt. Callers must not revoke these rows: a
 *  second device with the same user-agent in this window is a real
 *  session. Hide them from the warning only. */
export function leftoverPasswordSessions<T extends {
  created_at: string | Date;
  user_agent?: string | null;
}>(
  others: T[],
  opts: {
    nowMs?: number;
    maxAgeMs?: number;
    currentUserAgent?: string | null;
  } = {},
): T[] {
  const nowMs = opts.nowMs ?? Date.now();
  const maxAgeMs = opts.maxAgeMs ?? 15 * 60 * 1000;
  const currentUserAgent = opts.currentUserAgent;
  if (!currentUserAgent) return [];
  return others.filter((session) => {
    const created = new Date(session.created_at).getTime();
    if (!(Number.isFinite(created) && nowMs - created >= 0 && nowMs - created <= maxAgeMs)) {
      return false;
    }
    return (session.user_agent ?? "") === currentUserAgent;
  });
}

export const TRUST_DEVICE_COOKIE_NAMES = [
  "better-auth.trust_device",
  "__Secure-better-auth.trust_device",
] as const;

export type TrustDeviceCookieName = (typeof TRUST_DEVICE_COOKIE_NAMES)[number];

/**
 * Attributes better-auth's createAuthCookie sets on trust_device.
 * Secure follows the __Secure- prefix: that name was set with Secure,
 * and browsers drop a deletion that omits it. The plain name stays
 * non-Secure so an HTTP session can still be forgotten.
 */
export function trustDeviceExpiryOptions(name: TrustDeviceCookieName): {
  path: "/";
  maxAge: 0;
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
} {
  return {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: name.startsWith("__Secure-"),
  };
}

const TRUST_DEVICE_IDENTIFIER = /^trust-device-[A-Za-z0-9_-]+$/;

/** Payload is `token!trust-device-<id>`, the value better-auth signs into the cookie. */
export function trustDeviceIdentifier(payload: string): string | null {
  const separator = payload.indexOf("!");
  if (separator < 1) return null;
  const identifier = payload.slice(separator + 1);
  if (!TRUST_DEVICE_IDENTIFIER.test(identifier)) return null;
  return identifier;
}

export function cookieHeaderHasTrustDevice(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(";").some((part) => {
    const eq = part.indexOf("=");
    if (eq < 1) return false;
    const name = part.slice(0, eq).trim();
    return (TRUST_DEVICE_COOKIE_NAMES as readonly string[]).includes(name);
  });
}

/**
 * Delete the verification row named by a signed trust_device cookie.
 * Signature check is better-call's getSignedCookie. An unsigned or forged
 * cookie deletes nothing. A signed cookie that is not a trust-device
 * identifier throws so the caller does not report success.
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

export function parseTwoFactorQuery(search: string): {
  challenge: boolean;
  methods: string[];
} {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const challenge = params.get("twoFactor") === "1";
  const raw = params.get("methods") ?? "";
  const methods = raw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return { challenge, methods };
}
