export type TwoFactorMethod = "totp" | "otp" | "backup";

export type SignInOutcome =
  | { kind: "error"; message: string }
  | { kind: "twoFactor"; methods: string[] }
  | { kind: "session" };

export function interpretSignInResult(result: {
  error?: { message?: string } | null;
  data?: unknown;
}): SignInOutcome {
  if (result.error) {
    return { kind: "error", message: result.error.message || "Login failed" };
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
 *  that is this same attempt. */
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
