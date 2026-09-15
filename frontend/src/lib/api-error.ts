/** Thrown API failures are plain objects, not Error. */
export function thrownMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string" && message) {
      return message;
    }
  }
  return "Command failed";
}

export function isDisconnectError(err: unknown): boolean {
  const message = thrownMessage(err).toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network error") ||
    message.includes("load failed") ||
    message.includes("networkerror") ||
    message.includes("failed to proxy request to backend")
  );
}

/** Postgres, then backend (UI can wait), frontend last then reload. */
export function stackRestartOrder(name: string): number {
  if (name === "vymanager-postgres") return 0;
  if (name === "vymanager-backend") return 1;
  if (name === "vymanager-frontend") return 2;
  return 3;
}

type FetchLike = (
  input: string,
  init?: { credentials?: RequestCredentials },
) => Promise<{ status: number; json: () => Promise<unknown> }>;

export async function backendIsReachable(fetcher: FetchLike = fetch): Promise<boolean> {
  try {
    const res = await fetcher("/api/session/onboarding-status", { credentials: "include" });
    if (res.status !== 500) return true;
    const body = await res.json().catch(() => null);
    const error =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "";
    return !error.toLowerCase().includes("failed to proxy request to backend");
  } catch {
    return false;
  }
}

export async function waitForBackend(opts: {
  timeoutMs?: number;
  intervalMs?: number;
  fetcher?: FetchLike;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
} = {}): Promise<boolean> {
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const intervalMs = opts.intervalMs ?? 1_000;
  const fetcher = opts.fetcher ?? fetch;
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    if (await backendIsReachable(fetcher)) return true;
    await sleep(intervalMs);
  }
  return backendIsReachable(fetcher);
}
