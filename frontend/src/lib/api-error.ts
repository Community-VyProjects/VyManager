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
    message.includes("failed to proxy request to backend") ||
    message.includes("internal server error")
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
  init?: { credentials?: RequestCredentials; method?: string; redirect?: RequestRedirect },
) => Promise<{ status: number; json: () => Promise<unknown> }>;

type WaitOpts = {
  timeoutMs?: number;
  intervalMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

export async function waitUntil(
  probe: () => Promise<boolean>,
  opts: WaitOpts = {},
): Promise<boolean> {
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const intervalMs = opts.intervalMs ?? 1_000;
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    if (await probe()) return true;
    await sleep(intervalMs);
  }
  return probe();
}

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

export async function uiIsReachable(fetcher: FetchLike = fetch): Promise<boolean> {
  try {
    const res = await fetcher("/", { method: "GET", credentials: "include" });
    return res.status > 0 && res.status < 500;
  } catch {
    return false;
  }
}

export async function waitForBackend(
  opts: WaitOpts & { fetcher?: FetchLike } = {},
): Promise<boolean> {
  const { fetcher = fetch, ...wait } = opts;
  return waitUntil(() => backendIsReachable(fetcher), wait);
}

export async function waitForUi(opts: WaitOpts & { fetcher?: FetchLike } = {}): Promise<boolean> {
  const { fetcher = fetch, ...wait } = opts;
  return waitUntil(() => uiIsReachable(fetcher), wait);
}
